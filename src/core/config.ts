import type { StateCode, Network, UsageProfile } from './types.ts';

// All tunables live here. In production these graduate to a bundled KB config
// (per-state rows with source + as_of). Figures are mid-2026 estimates.
export const CFG = {
  stcFactor: 6.8,
  stcPrice: 37,
  taper: [[14, 1.0], [28, 0.6], [50, 0.15]] as Array<[number, number]>,
  maxKwh: 50,
  batteryGrossPerKwh: 1000,
  minBatteryKwh: 5,
  solarCostPerKw: 900,
  genFactor: 4.0,
  evChargerCost: 1800,
  evAnnualKm: 12000,
  evKwhPer100: 16,
  eveningFrac: { night_heavy: 0.75, even: 0.5, day_heavy: 0.30, unknown: 0.5 } as Record<UsageProfile, number>,
};

/** Federal battery rebate ($) for usable kWh, applying the taper bands. */
export function rebate(kwh: number): number {
  let prev = 0, stc = 0;
  for (const [cap, mult] of CFG.taper) {
    if (kwh > prev) { stc += (Math.min(kwh, cap) - prev) * CFG.stcFactor * mult; prev = cap; }
  }
  return stc * CFG.stcPrice;
}

export interface StateRates { label: string; importCents: number; fitCents: number; genFactor: number; }

// Rough mid-2026 per-state defaults — refine before offering paid service in a state.
export const STATES: Record<StateCode, StateRates> = {
  NSW: { label: 'NSW', importCents: 32, fitCents: 5, genFactor: 3.9 },
  VIC: { label: 'VIC', importCents: 28, fitCents: 4, genFactor: 3.6 },
  QLD: { label: 'QLD', importCents: 30, fitCents: 5, genFactor: 4.0 },
  SA:  { label: 'SA',  importCents: 44, fitCents: 4, genFactor: 4.2 },
  WA:  { label: 'WA',  importCents: 30, fitCents: 3, genFactor: 4.4 },
  TAS: { label: 'TAS', importCents: 30, fitCents: 9, genFactor: 3.2 },
  ACT: { label: 'ACT', importCents: 25, fitCents: 6, genFactor: 3.8 },
  NT:  { label: 'NT',  importCents: 28, fitCents: 9, genFactor: 4.6 },
};

/** Derive state from an Australian postcode's first digit (+ ACT pockets). */
export function deriveState(postcode: string): StateCode {
  const pc = (postcode || '').trim();
  const d = pc[0];
  const n = Number(pc);
  if (d === '2') { if ((n >= 2600 && n <= 2618) || (n >= 2900 && n <= 2920)) return 'ACT'; return 'NSW'; }
  if (d === '0') return 'NT';
  const map: Record<string, StateCode> = { '3': 'VIC', '4': 'QLD', '5': 'SA', '6': 'WA', '7': 'TAS' };
  return map[d] ?? 'QLD';
}

/** Default rates for a postcode (QLD Ergon overrides the FiT). */
export function ratesFor(postcode: string, network?: Network) {
  const state = deriveState(postcode);
  const s = STATES[state];
  let fitCents = s.fitCents;
  if (state === 'QLD' && network === 'ergon') fitCents = 6.006;
  return { state, importCents: s.importCents, fitCents, genFactor: s.genFactor };
}
