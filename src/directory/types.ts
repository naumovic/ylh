// Installer directory data model (design §3). This module is a sibling of `core/`,
// never a dependency of it: `core/` must never import from `directory/` (enforced by
// boundary.test.ts). The engine's answer is computed before any of this runs.

export type WorkType = 'battery' | 'solar' | 'ev_charger';
export type InstallerStatus = 'active' | 'paused' | 'delisted';

/**
 * Who does the physical install (design §9.2) — defined by delivery model, not company size:
 *   installer — in-house SAA-accredited crews do the work.
 *   retailer  — sells the system, subcontracts the install to accredited third parties.
 *   unknown   — can't confirm from desk research; render NO badge (never guess in public).
 * Display-only + a blindness clause: the organic comparator must never reference it.
 */
export type CompanyType = 'installer' | 'retailer' | 'unknown';

/** Inclusive numeric postcode range, e.g. [4000, 4179]. */
export type PostcodeRange = [number, number];

/** One paid slot = (zone × work type), hard-expiring on `until` (design §6). */
export interface FeaturedSlot {
  zone: string;
  work: WorkType;
  until: string; // ISO date; a past date is a lapsed slot and demotes to organic with zero code
  stripe_sub?: string | null;
}

// Desk-vet (design §4) verifies register-checkable facts only — ABN, QLD electrical
// contractor licence, and NETCC (consumer-code) status where applicable. It does NOT
// verify individual CEC/SAA accreditation or disciplinary history, so neither is claimed
// here (the honesty guardrail — those checks move to the featured phone call, Phase 4).
export interface Vetting {
  electrical_licence: string;        // QLD electrical contractor licence — verified
  abn?: string;                      // verified ABN (omitted where not yet verified)
  netcc_approved?: boolean;          // NETCC "Approved Seller" verified (retailers / where applicable)
  years_operating: number;           // entity-verifiable years (never brand claims); 0 = unverified
  verified_on: string;               // ISO date; drives freshness — >12 months old ⇒ omitted
  verified_by: 'manual' | 'openclaw-job' | 'desk'; // 'desk' = register-only v1 entry path (design §4)
}

export interface Installer {
  id: string;
  name: string;
  suburb: string;
  state: string;
  base_postcode: string; // for distance calc
  service_postcodes: { ranges: PostcodeRange[] };
  work_types: WorkType[];
  company_type: CompanyType; // design §9.2 — drives the card badge, never the ordering
  phone?: string;            // click-to-reveal; omitted where the site shows none (website-only)
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
