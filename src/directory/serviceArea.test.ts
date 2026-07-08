import { describe, it, expect } from 'vitest';
import {
  haversineKm,
  distanceBetween,
  deriveServiceRanges,
  postcodeInRanges,
} from './serviceArea.ts';
import type { Centroids } from './types.ts';
import realCentroids from '../data/postcode-centroids.json' with { type: 'json' };

describe('haversineKm', () => {
  it('measures ~111 km per degree of latitude', () => {
    const d = haversineKm([-27, 153], [-28, 153]);
    expect(d).toBeGreaterThan(109);
    expect(d).toBeLessThan(113);
  });
  it('is zero for the same point', () => {
    expect(haversineKm([-27.47, 153.02], [-27.47, 153.02])).toBe(0);
  });
});

describe('distanceBetween', () => {
  const c: Centroids = { '4000': [-27.47, 153.02], '4157': [-27.52, 153.2] };
  it('returns a finite distance between two known postcodes', () => {
    expect(distanceBetween('4000', '4157', c)).toBeGreaterThan(0);
  });
  it('returns Infinity when a postcode is missing (sorts last, never first)', () => {
    expect(distanceBetween('4000', '9999', c)).toBe(Infinity);
  });
});

describe('deriveServiceRanges', () => {
  // ~1 km per 0.01° lng at this latitude.
  const c: Centroids = {
    '4000': [-27.5, 153.0], // base
    '4001': [-27.5, 153.01], // ~1 km
    '4003': [-27.5, 153.02], // ~2 km (4002 absent — a gap to absorb)
    '4005': [-27.5, 153.6], // ~59 km — out of radius, breaks the range
    '4006': [-27.5, 153.03], // ~3 km — a second range after the break
  };

  it('compresses in-radius postcodes into ranges, absorbing gaps and breaking on out-of-radius', () => {
    expect(deriveServiceRanges('4000', 10, c)).toEqual([
      [4000, 4003],
      [4006, 4006],
    ]);
  });

  it('always includes the base postcode (distance 0)', () => {
    const ranges = deriveServiceRanges('4000', 0.5, c);
    expect(postcodeInRanges('4000', ranges)).toBe(true);
  });

  it('widens with the radius', () => {
    const narrow = deriveServiceRanges('4000', 1.5, c);
    const wide = deriveServiceRanges('4000', 100, c);
    const count = (rs: [number, number][]) => rs.reduce((n, [a, b]) => n + (b - a + 1), 0);
    expect(count(wide)).toBeGreaterThan(count(narrow));
  });

  it('returns [] when the base postcode is not in the table', () => {
    expect(deriveServiceRanges('9999', 25, c)).toEqual([]);
  });

  it('runs against the real centroid table and includes the base postcode', () => {
    const ranges = deriveServiceRanges('4000', 25, (realCentroids as unknown as Centroids));
    expect(ranges.length).toBeGreaterThan(0);
    expect(postcodeInRanges('4000', ranges)).toBe(true);
  });
});

describe('postcodeInRanges', () => {
  it('is inclusive of both bounds', () => {
    const ranges: [number, number][] = [[4000, 4179]];
    expect(postcodeInRanges('4000', ranges)).toBe(true);
    expect(postcodeInRanges('4179', ranges)).toBe(true);
    expect(postcodeInRanges('4180', ranges)).toBe(false);
  });
});
