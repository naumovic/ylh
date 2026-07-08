import { describe, it, expect } from 'vitest';
import { match, zoneOf, isVettingFresh, FEATURED_CAP } from './match.ts';
import type { Centroids, FeaturedSlot, Installer, WorkType, ZonesFile } from './types.ts';
import zonesData from '../data/zones.json' with { type: 'json' };

const NOW = new Date('2026-07-09');

// Synthetic geography: a west→east line where each +0.01 lng ≈ +1 km, all inside z-east.
const CENTROIDS: Centroids = {
  '4160': [-27.5, 153.2],
  '4161': [-27.5, 153.21],
  '4162': [-27.5, 153.22],
  '4163': [-27.5, 153.23],
  '4164': [-27.5, 153.24],
};
const ZONES: ZonesFile = {
  version: 'test',
  zones: {
    'z-east': { name: 'East', ranges: [[4151, 4179]] },
    'z-central': { name: 'Central', ranges: [[4000, 4079]] },
  },
};

function inst(p: {
  id: string;
  base: string;
  work?: WorkType[];
  slots?: FeaturedSlot[];
  years?: number;
  verified?: string;
  status?: Installer['status'];
  ranges?: [number, number][];
}): Installer {
  return {
    id: p.id,
    name: p.id,
    suburb: 'Testville',
    state: 'QLD',
    base_postcode: p.base,
    service_postcodes: { ranges: p.ranges ?? [[4151, 4179]] },
    work_types: p.work ?? ['battery'],
    phone: '07 0000 0000',
    website: 'https://example.com',
    vetting: {
      cec_accredited: true,
      electrical_licence: 'QLD 0',
      years_operating: p.years ?? 5,
      verified_on: p.verified ?? '2026-06-01',
      verified_by: 'manual',
    },
    listing: { featured_slots: p.slots ?? [] },
    status: p.status ?? 'active',
  };
}

const activeBatterySlot: FeaturedSlot = { zone: 'z-east', work: 'battery', until: '2026-12-01' };

function run(installers: Installer[], postcode = '4160', work: WorkType = 'battery') {
  return match({ installers, zones: ZONES, centroids: CENTROIDS, postcode, work, now: NOW });
}

describe('match — organic ordering', () => {
  it('orders by distance ascending, then years operating descending', () => {
    const { organic } = run([
      inst({ id: 'far', base: '4163' }),
      inst({ id: 'near-newer', base: '4161', years: 3 }),
      inst({ id: 'near-older', base: '4161', years: 20 }),
    ]);
    expect(organic.map((i) => i.id)).toEqual(['near-older', 'near-newer', 'far']);
  });
});

describe('match — featured strip', () => {
  it('caps featured at 2 even when more slot holders qualify', () => {
    const { featured, organic } = run([
      inst({ id: 'f1', base: '4161', slots: [activeBatterySlot] }),
      inst({ id: 'f2', base: '4162', slots: [activeBatterySlot] }),
      inst({ id: 'f3', base: '4163', slots: [activeBatterySlot] }),
    ]);
    expect(featured).toHaveLength(FEATURED_CAP);
    expect(featured.map((i) => i.id)).toEqual(['f1', 'f2']); // two nearest
    expect(organic.map((i) => i.id)).toEqual(['f3']); // overflow demotes, never dropped
  });

  it('orders the featured strip by distance', () => {
    const { featured } = run([
      inst({ id: 'f-far', base: '4162', slots: [activeBatterySlot] }),
      inst({ id: 'f-near', base: '4161', slots: [activeBatterySlot] }),
    ]);
    expect(featured.map((i) => i.id)).toEqual(['f-near', 'f-far']);
  });

  it('never double-lists a featured installer in organic', () => {
    const { featured, organic } = run([
      inst({ id: 'feat', base: '4161', slots: [activeBatterySlot] }),
      inst({ id: 'plain', base: '4162' }),
    ]);
    const featuredIds = new Set(featured.map((i) => i.id));
    expect(featured.map((i) => i.id)).toContain('feat');
    expect(organic.some((i) => featuredIds.has(i.id))).toBe(false);
  });

  it('demotes a slot with an expired `until` to organic (zero code, data-driven)', () => {
    const expired: FeaturedSlot = { zone: 'z-east', work: 'battery', until: '2026-01-01' };
    const { featured, organic } = run([inst({ id: 'lapsed', base: '4161', slots: [expired] })]);
    expect(featured).toHaveLength(0);
    expect(organic.map((i) => i.id)).toEqual(['lapsed']);
  });

  it('ignores a slot for a different zone or work type', () => {
    const wrongZone: FeaturedSlot = { zone: 'z-central', work: 'battery', until: '2026-12-01' };
    const wrongWork: FeaturedSlot = { zone: 'z-east', work: 'solar', until: '2026-12-01' };
    const { featured } = run([
      inst({ id: 'a', base: '4161', slots: [wrongZone] }),
      inst({ id: 'b', base: '4162', slots: [wrongWork] }),
    ]);
    expect(featured).toHaveLength(0);
  });

  it('renders no featured strip when the postcode is outside every zone', () => {
    const { featured, organic } = run(
      [inst({ id: 'x', base: '4161', slots: [activeBatterySlot], ranges: [[4000, 4999]] })],
      '4500', // in no zone of ZONES
    );
    expect(featured).toHaveLength(0);
    expect(organic.map((i) => i.id)).toEqual(['x']);
  });
});

describe('match — filtering', () => {
  it('omits installers with stale (>12 month) vetting entirely', () => {
    const { featured, organic } = run([
      inst({ id: 'stale', base: '4161', slots: [activeBatterySlot], verified: '2024-01-01' }),
      inst({ id: 'fresh', base: '4162' }),
    ]);
    const all = [...featured, ...organic].map((i) => i.id);
    expect(all).not.toContain('stale');
    expect(all).toContain('fresh');
  });

  it('omits installers whose service area misses the postcode', () => {
    const { organic } = run([
      inst({ id: 'covers', base: '4161', ranges: [[4151, 4179]] }),
      inst({ id: 'misses', base: '4161', ranges: [[4650, 4670]] }),
    ]);
    expect(organic.map((i) => i.id)).toEqual(['covers']);
  });

  it('omits installers that do not do the requested work type', () => {
    const { organic } = run(
      [
        inst({ id: 'solar-only', base: '4161', work: ['solar'] }),
        inst({ id: 'does-battery', base: '4162', work: ['battery'] }),
      ],
      '4160',
      'battery',
    );
    expect(organic.map((i) => i.id)).toEqual(['does-battery']);
  });

  it('omits paused / delisted installers', () => {
    const { organic } = run([
      inst({ id: 'paused', base: '4161', status: 'paused' }),
      inst({ id: 'active', base: '4162', status: 'active' }),
    ]);
    expect(organic.map((i) => i.id)).toEqual(['active']);
  });
});

describe('match — fee-blindness (guardrail 2)', () => {
  it('changing tiers/slots never reorders organic', () => {
    const base = [
      inst({ id: 'a', base: '4161', years: 5 }),
      inst({ id: 'b', base: '4162', years: 5 }),
      inst({ id: 'c', base: '4163', years: 5 }),
    ];
    const orderBefore = run(base).organic.map((i) => i.id);

    // Give the *farthest* installer a paid slot in a different work type — a fee signal
    // that must not touch organic order for this (battery) query.
    const withSlot = base.map((i) =>
      i.id === 'c'
        ? { ...i, listing: { featured_slots: [{ zone: 'z-east', work: 'solar' as const, until: '2026-12-01' }] } }
        : i,
    );
    const orderAfter = run(withSlot).organic.map((i) => i.id);
    expect(orderAfter).toEqual(orderBefore);
  });
});

describe('zoneOf — every postcode maps to exactly one zone', () => {
  const zones = zonesData as ZonesFile;

  it('resolves known SE QLD test postcodes to a single zone', () => {
    expect(zoneOf('4000', zones)).toBe('bne-central');
    expect(zoneOf('4127', zones)).toBe('bne-south');
    expect(zoneOf('4157', zones)).toBe('bne-east');
    expect(zoneOf('4178', zones)).toBe('bne-east');
    expect(zoneOf('4215', zones)).toBe('gold-coast');
  });

  it('returns null for a postcode outside every zone (empty-state / non-QLD)', () => {
    expect(zoneOf('4870', zones)).toBeNull(); // Cairns
    expect(zoneOf('4200', zones)).toBeNull(); // gap between zones
  });

  it('zone ranges never overlap (a postcode is claimed by at most one zone)', () => {
    const entries = Object.entries(zones.zones);
    for (let pc = 4000; pc <= 4999; pc++) {
      const hits = entries.filter(([, z]) => z.ranges.some(([a, b]) => pc >= a && pc <= b));
      expect(hits.length).toBeLessThanOrEqual(1);
    }
  });
});

describe('isVettingFresh', () => {
  it('is true just under 12 months and false past it', () => {
    expect(isVettingFresh('2025-08-01', NOW)).toBe(true);
    expect(isVettingFresh('2025-06-01', NOW)).toBe(false);
    expect(isVettingFresh('not-a-date', NOW)).toBe(false);
  });
});
