// Installer directory data model (design §3). This module is a sibling of `core/`,
// never a dependency of it: `core/` must never import from `directory/` (enforced by
// boundary.test.ts). The engine's answer is computed before any of this runs.

export type WorkType = 'battery' | 'solar' | 'ev_charger';
export type InstallerStatus = 'active' | 'paused' | 'delisted';

/** Inclusive numeric postcode range, e.g. [4000, 4179]. */
export type PostcodeRange = [number, number];

/** One paid slot = (zone × work type), hard-expiring on `until` (design §6). */
export interface FeaturedSlot {
  zone: string;
  work: WorkType;
  until: string; // ISO date; a past date is a lapsed slot and demotes to organic with zero code
  stripe_sub?: string | null;
}

export interface Vetting {
  cec_accredited: boolean;
  accreditation_id?: string;
  electrical_licence: string;
  abn?: string;
  years_operating: number;
  verified_on: string; // ISO date; drives freshness — >12 months old ⇒ omitted from results
  verified_by: 'manual' | 'openclaw-job';
}

export interface Installer {
  id: string;
  name: string;
  suburb: string;
  state: string;
  base_postcode: string; // for distance calc
  service_postcodes: { ranges: PostcodeRange[] };
  work_types: WorkType[];
  phone: string;
  website: string;
  vetting: Vetting;
  listing: { featured_slots: FeaturedSlot[] };
  status: InstallerStatus;
}

export interface InstallersFile {
  version: string;
  note?: string;
  installers: Installer[];
}

export interface Zone {
  name: string;
  ranges: PostcodeRange[];
}

export interface ZonesFile {
  version: string;
  note?: string;
  zones: Record<string, Zone>;
}

/** `{ "<postcode>": [lat, lng] }`. */
export type Centroids = Record<string, [number, number]>;

/** An installer as rendered: base installer + derived distance + featured flag. */
export interface MatchedInstaller extends Installer {
  distanceKm: number;
}

export interface MatchResult {
  featured: MatchedInstaller[]; // 0–2, distance-ordered
  organic: MatchedInstaller[]; // remainder, distance then years — never fee-aware
}
