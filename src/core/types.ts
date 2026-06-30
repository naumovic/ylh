// Core domain types. Money is AUD dollars (numbers) inside the engine;
// convert to integer cents only at a persistence/payment boundary (none in the MVP).

export type StateCode = 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'ACT' | 'NT';
export type Network = 'energex' | 'ergon';
export type SolarStatus = 'have' | 'none';
export type Period = 'monthly' | 'quarterly';
export type UsageProfile = 'day_heavy' | 'even' | 'night_heavy' | 'unknown';
export type EvStatus = 'none' | 'buying' | 'own';
export type ChargeWindow = 'daytime_home' | 'night_home' | 'away';
export type Goal = 'bill_savings' | 'backup' | 'go_electric';
export type OptionKey = 'solar' | 'battery' | 'ev' | 'nothing';

/** Canonical, validated intake — the one object the engine consumes. */
export interface Intake {
  postcode: string;
  state: StateCode;
  network?: Network;          // QLD only
  importRateCents: number;    // c/kWh paid to buy from grid
  fitCents: number;           // c/kWh credited for export
  solarStatus: SolarStatus;
  period: Period;
  usageKwh: number;           // grid import per period (or total usage if no solar)
  exportKwh: number;          // solar export per period (0 if no solar)
  usageProfile: UsageProfile;
  solarKw: number;            // existing system size (0 if none)
  addKw: number;              // panels to add (upgrade); ignored when solarStatus==='none'
  ev: EvStatus;
  charge: ChargeWindow;
  goals: Goal[];
}

export interface Option {
  key: OptionKey;
  name: string;
  cost: number;               // AUD, net of rebate where applicable
  savingPerYear: number;      // AUD/yr (0 = no saving)
  paybackYears: number;       // Infinity when no payback
  reason: string;
  extra?: string | null;
}

export interface EngineContext {
  noSolar: boolean;
  importRate: number;         // $/kWh
  fit: number;                // $/kWh
  spread: number;             // $/kWh (import - fit)
  eveningDay: number;         // kWh/day evening load
  daytimeUseDay: number;      // kWh/day daytime load
  captureSurplusDay: number;  // kWh/day surplus a battery/EV can use
  evNeedDay: number;          // kWh/day the car needs
}

export interface Recommendation {
  options: Option[];          // ordered for display
  winner: OptionKey;
  best?: Option;              // best paying-back option (may differ from winner)
  ctx: EngineContext;
}
