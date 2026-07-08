// CI invariants on the hand-edited directory JSON (build plan §1). These run on every
// `npm test`, so a hand edit (or a manual slot sale in Phase 4) can never quietly violate
// the featured cap, reference a missing zone, or ship an unparseable date.

import { describe, it, expect } from 'vitest';
import installersData from '../data/installers.json' with { type: 'json' };
import zonesData from '../data/zones.json' with { type: 'json' };
import centroidsData from '../data/postcode-centroids.json' with { type: 'json' };
import type { Centroids, InstallersFile, WorkType, ZonesFile } from './types.ts';
import { FEATURED_CAP } from './match.ts';

// JSON imports infer arrays as `number[]`, not tuples — cast through `unknown`.
const installersFile = installersData as unknown as InstallersFile;
const zonesFile = zonesData as unknown as ZonesFile;
const centroids = centroidsData as unknown as Centroids;

const WORK_TYPES: WorkType[] = ['battery', 'solar', 'ev_charger'];
const STATUSES = ['active', 'paused', 'delisted'];
const isDate = (s: string) => !Number.isNaN(new Date(s).getTime());

const installers = installersFile.installers;

describe('installers.json — structural invariants', () => {
  it('has unique installer ids', () => {
    const ids = installers.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every status is one of active | paused | delisted', () => {
    for (const i of installers) expect(STATUSES).toContain(i.status);
  });

  it('every work_type is a known work type', () => {
    for (const i of installers)
      for (const w of i.work_types) expect(WORK_TYPES).toContain(w);
  });

  it('every vetting.verified_on parses as a date', () => {
    for (const i of installers) expect(isDate(i.vetting.verified_on)).toBe(true);
  });

  it('every service_postcodes range is well-formed (a ≤ b)', () => {
    for (const i of installers)
      for (const [a, b] of i.service_postcodes.ranges) expect(a).toBeLessThanOrEqual(b);
  });

  it('every base_postcode is present in the centroid table (distance is computable)', () => {
    for (const i of installers) expect(centroids[i.base_postcode]).toBeDefined();
  });
});

describe('installers.json — featured slot invariants', () => {
  it('every slot references an existing zone', () => {
    const zoneIds = new Set(Object.keys(zonesFile.zones));
    for (const i of installers)
      for (const s of i.listing.featured_slots) expect(zoneIds.has(s.zone)).toBe(true);
  });

  it('every slot references a known work type', () => {
    for (const i of installers)
      for (const s of i.listing.featured_slots) expect(WORK_TYPES).toContain(s.work);
  });

  it('every slot `until` parses as a date', () => {
    for (const i of installers)
      for (const s of i.listing.featured_slots) expect(isDate(s.until)).toBe(true);
  });

  it(`never exceeds ${FEATURED_CAP} active slots per zone × work type (the cap is finite inventory)`, () => {
    const now = new Date();
    const counts = new Map<string, number>();
    for (const i of installers) {
      for (const s of i.listing.featured_slots) {
        if (now >= new Date(s.until)) continue; // expired slots don't hold inventory
        const key = `${s.zone}::${s.work}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    for (const [key, n] of counts) {
      expect(n, `${key} has ${n} active slots`).toBeLessThanOrEqual(FEATURED_CAP);
    }
  });
});

describe('zones.json — structural invariants', () => {
  it('every zone range is well-formed (a ≤ b)', () => {
    for (const z of Object.values(zonesFile.zones))
      for (const [a, b] of z.ranges) expect(a).toBeLessThanOrEqual(b);
  });

  it('zone ranges do not overlap across zones (one postcode → at most one zone)', () => {
    const entries = Object.entries(zonesFile.zones);
    for (let pc = 4000; pc <= 4999; pc++) {
      const hits = entries.filter(([, z]) => z.ranges.some(([a, b]) => pc >= a && pc <= b));
      expect(hits.length, `postcode ${pc} in ${hits.map((h) => h[0]).join(', ')}`).toBeLessThanOrEqual(1);
    }
  });
});
