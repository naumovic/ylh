import { useState } from 'react';
import { presetIntake, WIZARD_DEFAULTS } from '../core/presets.ts';
import type { WizardAnswers, UsageTier } from '../core/presets.ts';
import type { Intake, SolarStatus, UsageProfile, EvStatus, Goal } from '../core/types.ts';

interface Props {
  onComplete: (intake: Intake) => void;
}

const TOTAL_STEPS = 3;

type Choice<T> = { value: T; label: string; hint?: string };

const SOLAR_CHOICES: Choice<SolarStatus>[] = [
  { value: 'have', label: 'Yes, I have solar' },
  { value: 'none', label: 'No, not yet' },
];

const TIER_CHOICES: Choice<UsageTier>[] = [
  { value: 'little', label: 'Little', hint: 'Solo or a couple' },
  { value: 'medium', label: 'Medium', hint: 'A small family' },
  { value: 'large', label: 'Large', hint: 'A big tribe' },
];

const PROFILE_CHOICES: Choice<UsageProfile>[] = [
  { value: 'day_heavy', label: 'Day-heavy', hint: 'Home / working during the day' },
  { value: 'even', label: 'Even', hint: 'Spread through the day' },
  { value: 'night_heavy', label: 'Night-heavy', hint: 'Mostly evenings' },
  { value: 'unknown', label: 'Not sure', hint: "That's fine, we'll assume even" },
];

const EV_CHOICES: Choice<EvStatus>[] = [
  { value: 'none', label: 'Not yet' },
  { value: 'buying', label: 'Buying one' },
  { value: 'own', label: 'Own one' },
];

const GOAL_CHOICES: Choice<Goal>[] = [
  { value: 'bill_savings', label: 'Lower bills' },
  { value: 'go_electric', label: 'Go electric' },
  { value: 'backup', label: 'Blackout backup' },
];

function OptionCard<T extends string>({
  choice, selected, onSelect, name,
}: { choice: Choice<T>; selected: boolean; onSelect: (v: T) => void; name: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(choice.value)}
      data-testid={`opt-${name}-${choice.value}`}
      className={`text-left rounded-xl border p-4 transition focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
        selected
          ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-500/5'
          : 'border-hairline hover:border-navy-700 bg-surface'
      }`}
    >
      <div className="font-semibold text-sm text-navy-900">{choice.label}</div>
      {choice.hint && <div className="text-xs text-muted mt-0.5">{choice.hint}</div>}
    </button>
  );
}

function CheckCard({
  choice, selected, onToggle,
}: { choice: Choice<Goal>; selected: boolean; onToggle: (v: Goal) => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={() => onToggle(choice.value)}
      data-testid={`opt-goal-${choice.value}`}
      className={`text-left rounded-xl border p-4 transition focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
        selected
          ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-500/5'
          : 'border-hairline hover:border-navy-700 bg-surface'
      }`}
    >
      <div className="font-semibold text-sm text-navy-900">{choice.label}</div>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-navy-900 mb-2">{label}</legend>
      {children}
    </fieldset>
  );
}

export function Wizard({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [a, setA] = useState<WizardAnswers>(WIZARD_DEFAULTS);
  const set = <K extends keyof WizardAnswers>(k: K, v: WizardAnswers[K]) =>
    setA((prev) => ({ ...prev, [k]: v }));

  const toggleGoal = (g: Goal) =>
    setA((prev) => ({
      ...prev,
      goals: prev.goals.includes(g) ? prev.goals.filter((x) => x !== g) : [...prev.goals, g],
    }));

  const postcodeValid = /^\d{4}$/.test(a.postcode.trim());
  const canAdvance = step !== 1 || postcodeValid;

  const next = () => {
    if (!canAdvance) return;
    if (step < TOTAL_STEPS) setStep(step + 1);
    else onComplete(presetIntake(a));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  return (
    <section className="rounded-2xl border border-hairline bg-surface p-6 md:p-8 max-w-2xl mx-auto" aria-label="Setup wizard">
      {/* Progress */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-600" data-testid="wizard-progress">
          Step {step} of {TOTAL_STEPS}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-canvas mb-6" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={TOTAL_STEPS}>
        <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
      </div>

      {step === 1 && (
        <div className="space-y-6" data-testid="step-1">
          <h2 className="text-lg font-bold text-navy-900">Your place</h2>
          <Field label="Do you have solar?">
            <div role="radiogroup" className="grid grid-cols-2 gap-3">
              {SOLAR_CHOICES.map((c) => (
                <OptionCard key={c.value} name="solar" choice={c} selected={a.solarStatus === c.value} onSelect={(v) => set('solarStatus', v)} />
              ))}
            </div>
          </Field>
          <Field label="Postcode">
            <input
              inputMode="numeric"
              maxLength={4}
              value={a.postcode}
              onChange={(e) => set('postcode', e.target.value.replace(/\D/g, ''))}
              data-testid="postcode-input"
              aria-invalid={!postcodeValid}
              className="w-40 rounded-lg border border-hairline bg-surface px-3 py-2 text-sm tnum focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            {!postcodeValid && (
              <p className="text-xs text-danger mt-1" data-testid="postcode-error">Enter a 4-digit Australian postcode.</p>
            )}
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6" data-testid="step-2">
          <h2 className="text-lg font-bold text-navy-900">Your usage</h2>
          <Field label="How much electricity do we use?">
            <div role="radiogroup" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TIER_CHOICES.map((c) => (
                <OptionCard key={c.value} name="tier" choice={c} selected={a.usageTier === c.value} onSelect={(v) => set('usageTier', v)} />
              ))}
            </div>
          </Field>
          <Field label="My usage habits">
            <div role="radiogroup" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PROFILE_CHOICES.map((c) => (
                <OptionCard key={c.value} name="profile" choice={c} selected={a.usageProfile === c.value} onSelect={(v) => set('usageProfile', v)} />
              ))}
            </div>
          </Field>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6" data-testid="step-3">
          <h2 className="text-lg font-bold text-navy-900">Your future</h2>
          <Field label="Own an EV?">
            <div role="radiogroup" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {EV_CHOICES.map((c) => (
                <OptionCard key={c.value} name="ev" choice={c} selected={a.ev === c.value} onSelect={(v) => set('ev', v)} />
              ))}
            </div>
          </Field>
          <Field label="My goals">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {GOAL_CHOICES.map((c) => (
                <CheckCard key={c.value} choice={c} selected={a.goals.includes(c.value)} onToggle={toggleGoal} />
              ))}
            </div>
            <p className="text-xs text-muted mt-2">Pick any that apply.</p>
          </Field>
        </div>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between mt-8">
        <button
          type="button"
          onClick={back}
          disabled={step === 1}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-navy-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-canvas"
        >
          Back
        </button>
        <button
          type="button"
          onClick={next}
          disabled={!canAdvance}
          data-testid="wizard-next"
          className="rounded-lg bg-amber-500 hover:bg-amber-600 text-navy-900 font-bold text-sm px-6 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {step < TOTAL_STEPS ? 'Next' : 'See my result'}
        </button>
      </div>
    </section>
  );
}
