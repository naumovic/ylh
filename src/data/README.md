# `src/data` — installer directory static data (Phase 1)

Bundled, versioned JSON — no DB (design §3). Edited by hand, reviewed via PR, validated by
CI invariants in `src/directory/data.test.ts` on every `npm test`.

- **`postcode-centroids.json`** — real data. `{ "<postcode>": [lat, lng] }`, one averaged
  centroid per postcode. Source: Matthew Proctor's free `australian_postcodes.csv`
  (localities averaged per postcode, rounded to 4 dp). **Filtered to QLD (4000–4999)** — the
  directory is QLD-first, and full-AU was ~10× the size for no Phase-1 benefit. ~14 KB raw /
  ~4 KB gzipped (trivial). Re-source national coverage when the directory expands past QLD.
- **`zones.json`** — **PLACEHOLDER** hand-drawn SE QLD zones. Ranges are non-overlapping so
  every postcode maps to at most one zone. The real ABS SA3/SA4-scripted map is Phase 3.
- **`installers.json`** — **PLACEHOLDER** installers with deliberately fake names. Real vetted
  installers land one PR at a time in Phase 3. Schema: design §3 (slot-based `featured_slots`).

Nothing here is imported by `src/core` (enforced by `src/directory/boundary.test.ts`), and the
files are only pulled in behind the dev route / Phase-2 feature flag, so production bundles ship
none of this until the flag is turned on.
