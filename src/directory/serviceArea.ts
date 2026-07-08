// Geometry for the directory (design §3): distance ordering + radius-derived service
// areas. Pure, no data imports — callers pass the centroid table. Used at data-authoring
// time (turn one vetting-call answer, "base postcode + how far will you travel", into a
// confirmed postcode range list) and by the matcher/tests.

import type { Centroids, PostcodeRange } from './types.ts';

const EARTH_RADIUS_KM = 6371;
const DEG = Math.PI / 180;

/** Great-circle distance between two [lat, lng] points, in km. */
export function haversineKm(a: [number, number], b: [number, number]): number {
  const [la1, lo1] = a;
  const [la2, lo2] = b;
  const dLat = (la2 - la1) * DEG;
  const dLon = (lo2 - lo1) * DEG;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1 * DEG) * Math.cos(la2 * DEG) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Centroid for a postcode, or null if the table doesn't cover it. */
export function centroidOf(postcode: string, centroids: Centroids): [number, number] | null {
  return centroids[postcode] ?? null;
}

/**
 * Distance in km between two postcodes via their centroids. Returns `Infinity` when
 * either postcode is missing from the table — so an uncovered installer sorts last
 * rather than jumping to the top of a distance-ordered list.
 */
export function distanceBetween(pcA: string, pcB: string, centroids: Centroids): number {
  const a = centroidOf(pcA, centroids);
  const b = centroidOf(pcB, centroids);
  if (!a || !b) return Infinity;
  return haversineKm(a, b);
}

/**
 * Derive the postcodes an installer services from a base postcode + travel radius,
 * compressed into human-editable ranges (design §3). A range breaks only at a *known*
 * postcode that falls outside the radius; gaps where no postcode exists are absorbed.
 * The installer confirms and edits exceptions (islands, rivers) — this is a starting draft.
 */
export function deriveServiceRanges(
  basePostcode: string,
  radiusKm: number,
  centroids: Centroids,
): PostcodeRange[] {
  const base = centroidOf(basePostcode, centroids);
  if (!base) return [];

  const known = Object.keys(centroids)
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  const ranges: PostcodeRange[] = [];
  let start: number | null = null;
  let prev: number | null = null;

  for (const pc of known) {
    const within = haversineKm(base, centroids[String(pc)]) <= radiusKm;
    if (within) {
      if (start === null) start = pc;
      prev = pc;
    } else if (start !== null) {
      ranges.push([start, prev as number]);
      start = null;
      prev = null;
    }
  }
  if (start !== null) ranges.push([start, prev as number]);
  return ranges;
}

/** True if a postcode falls inside any of the given inclusive ranges. */
export function postcodeInRanges(postcode: string, ranges: PostcodeRange[]): boolean {
  const n = Number(postcode);
  return ranges.some(([a, b]) => n >= a && n <= b);
}
