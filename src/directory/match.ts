// Deterministic matcher — the reference implementation is `match()` in
// docs/reference/installer-directory-prototype.html, here ported to the slot-based
// schema of design §3. Pure over its inputs (data is passed in, never imported) so the
// same function serves the dev route, the Phase-2 flagged flow, and the tests.
//
// Guardrails encoded here (build plan): featured cap = 2; expiry lives in `until` (a
// lapsed slot demotes with zero code); the ORGANIC comparator never references fees,
// tiers, or slots — money can buy a spot in the featured strip, never organic position.

import type {
  Centroids,
  Installer,
  MatchResult,
  MatchedInstaller,
  WorkType,
  ZonesFile,
} from './types.ts';
import { distanceBetween, postcodeInRanges } from './serviceArea.ts';

export const VETTING_MAX_AGE_DAYS = 365; // >12 months un-reverified ⇒ omitted (design §3)
export const FEATURED_CAP = 2; // design §6.1 — also enforced in CI and at sale time
const DAY_MS = 86_400_000;

/** A postcode maps to exactly one zone (ranges are non-overlapping); null if none. */
export function zoneOf(postcode: string, zones: ZonesFile): string | null {
  const n = Number(postcode);
  for (const [id, zone] of Object.entries(zones.zones)) {
    if (zone.ranges.some(([a, b]) => n >= a && n <= b)) return id;
  }
  return null;
}

/** Vetting counts as fresh if re-verified within the last VETTING_MAX_AGE_DAYS. */
export function isVettingFresh(verifiedOn: string, now: Date): boolean {
  const verified = new Date(verifiedOn).getTime();
  if (Number.isNaN(verified)) return false;
  return now.getTime() - verified < VETTING_MAX_AGE_DAYS * DAY_MS;
}

function hasActiveSlot(inst: Installer, zone: string, work: WorkType, now: Date): boolean {
  return inst.listing.featured_slots.some(
    (s) => s.zone === zone && s.work === work && now < new Date(s.until),
  );
}

export interface MatchInput {
  installers: Installer[];
  zones: ZonesFile;
  centroids: Centroids;
  postcode: string;
  work: WorkType;
  now?: Date;
}

export function match(input: MatchInput): MatchResult {
  const { installers, zones, centroids, postcode, work } = input;
  const now = input.now ?? new Date();

  // Filter: active status, does the work, services this postcode, vetting still fresh.
  const candidates: MatchedInstaller[] = installers
    .filter(
      (i) =>
        i.status === 'active' &&
        i.work_types.includes(work) &&
        postcodeInRanges(postcode, i.service_postcodes.ranges) &&
        isVettingFresh(i.vetting.verified_on, now),
    )
    .map((i) => ({ ...i, distanceKm: distanceBetween(postcode, i.base_postcode, centroids) }));

  const zone = zoneOf(postcode, zones);

  // Featured = active slot holders for (zone × work), distance-ordered, capped at 2.
  const featured = zone
    ? candidates
        .filter((i) => hasActiveSlot(i, zone, work, now))
        .sort(byDistanceThenYears)
        .slice(0, FEATURED_CAP)
    : [];

  const featuredIds = new Set(featured.map((i) => i.id));

  // Organic = every other candidate (featured ones excluded — no double-listing),
  // ordered distance → years. This comparator must NEVER look at fees/tiers/slots.
  const organic = candidates
    .filter((i) => !featuredIds.has(i.id))
    .sort(byDistanceThenYears);

  return { featured, organic };
}

/** Distance ascending, then longer-operating first. Fee-blind by construction. */
function byDistanceThenYears(a: MatchedInstaller, b: MatchedInstaller): number {
  return a.distanceKm - b.distanceKm || b.vetting.years_operating - a.vetting.years_operating;
}
