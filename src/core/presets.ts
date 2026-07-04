import { ratesFor } from './config.ts';
import type { Intake, SolarStatus, UsageProfile, EvStatus, Goal } from './types.ts';

// ---------------------------------------------------------------------------
// Wizard -> Intake presets.
//
// The 3-step wizard collects only six answers. Everything else the engine needs
// is *derived* here, deterministically, so the user sees a ballpark immediately
// and can then refine any preset in the "Refine your numbers" panel.
//
// This is pure config + arithmetic — no engine logic, no recomputation of any
// figure the engine produces. It only maps friendly answers to a valid Intake.
// ---------------------------------------------------------------------------

/** Household size tier chosen in step 2a. */
export type UsageTier = 'little' | 'medium' | 'large';

/** The six answers the wizard collects. */
export interface WizardAnswers {
  solarStatus: SolarStatus; // step 1a — "I have solar" Yes/No
  postcode: string;         // step 1b — derives state, rates
  usageTier: UsageTier;     // step 2a — Little / Medium / Large
  usageProfile: UsageProfile; // step 2b — day-heavy / even / night-heavy / unknown
  ev: EvStatus;             // step 3a — Not yet / Buying / Own
  goals: Goal[];            // step 3b — multi-select, defaults to bill savings
}

/** Defaults so the user can hit Next three times and still get a valid result. */
export const WIZARD_DEFAULTS: WizardAnswers = {
  solarStatus: 'have',
  postcode: '4000',
  usageTier: 'medium',
  usageProfile: 'unknown',
  ev: 'none',
  goals: ['bill_savings'],
};

// --- Preset anchor constants (documented in docs/v2-design-changes.md) --------

/** Typical whole-home consumption per tier, kWh/day. */
export const DAILY_KWH: Record<UsageTier, number> = {
  little: 10, // solo or couple
  medium: 18, // small family
  large: 28,  // big tribe
};

/** Days per quarter used to turn a daily anchor into a per-quarter figure. */
export const DAYS_PER_QUARTER = 91;

/**
 * For a home that already has solar (default 6.6 kW), the daily anchor splits
 * into grid import vs solar export. These per-quarter baselines come from the
 * preset table and assume the "even/unknown" usage profile.
 */
export const HAVE_SOLAR_IMPORT_PER_QTR: Record<UsageTier, number> = {
  little: 500, medium: 950, large: 1600,
};
export const HAVE_SOLAR_EXPORT_PER_QTR: Record<UsageTier, number> = {
  little: 1300, medium: 1000, large: 750,
};

/** Default existing system size assumed when the household says it has solar. */
export const DEFAULT_SOLAR_KW = 6.6;

/**
 * Usage profile shifts *when* power is used relative to solar generation, which
 * moves both grid import and solar export by ~15%. A day-heavy (WFH) home
 * self-consumes more of its own solar, so it imports and exports less;
 * night-heavy is the reverse. Even/unknown sit on the anchor.
 * Applied only to a home with solar — with no solar, total usage is unaffected
 * by when it happens.
 */
export const PROFILE_SHIFT = 0.15;
export const PROFILE_IMPORT_FACTOR: Record<UsageProfile, number> = {
  day_heavy: 1 - PROFILE_SHIFT,
  night_heavy: 1 + PROFILE_SHIFT,
  even: 1,
  unknown: 1,
};
export const PROFILE_EXPORT_FACTOR: Record<UsageProfile, number> = {
  day_heavy: 1 - PROFILE_SHIFT,
  night_heavy: 1 + PROFILE_SHIFT,
  even: 1,
  unknown: 1,
};

/**
 * Map the wizard's six answers to a full, valid Intake with sensible presets.
 * Pure and deterministic. All money/energy figures downstream still come from
 * the engine — this only assembles the inputs.
 */
export function presetIntake(a: WizardAnswers): Intake {
  const r = ratesFor(a.postcode);
  const hasSolar = a.solarStatus === 'have';

  let usageKwh: number;
  let exportKwh: number;
  if (hasSolar) {
    usageKwh = Math.round(HAVE_SOLAR_IMPORT_PER_QTR[a.usageTier] * PROFILE_IMPORT_FACTOR[a.usageProfile]);
    exportKwh = Math.round(HAVE_SOLAR_EXPORT_PER_QTR[a.usageTier] * PROFILE_EXPORT_FACTOR[a.usageProfile]);
  } else {
    usageKwh = Math.round(DAILY_KWH[a.usageTier] * DAYS_PER_QUARTER);
    exportKwh = 0;
  }

  return {
    postcode: a.postcode,
    state: r.state,
    importRateCents: r.importCents,
    fitCents: r.fitCents,
    solarStatus: a.solarStatus,
    period: 'quarterly',
    usageKwh,
    exportKwh,
    usageProfile: a.usageProfile,
    solarKw: hasSolar ? DEFAULT_SOLAR_KW : 0,
    addKw: 0,
    ev: a.ev,
    // Match charging window to when the home is active: a day-heavy home is set
    // up to charge on daytime solar; otherwise assume overnight.
    charge: a.usageProfile === 'day_heavy' ? 'daytime_home' : 'night_home',
    goals: a.goals.length > 0 ? a.goals : ['bill_savings'],
  };
}
