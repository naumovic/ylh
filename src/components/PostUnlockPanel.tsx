import { useState } from 'react';
import { capture } from '../lib/analytics.ts';
import { postReserve } from '../lib/api.ts';

const UPCOMING = [
  'A personalised written explanation of your situation',
  'Adjust your usage over time + a when-to-charge strategy',
  'Saved scenarios with an account',
  'Your plan delivered by email',
];

// Task 4A §2 Q1 — price-anchored survey.
const PRICE_OPTIONS: { bucket: string; label: string }[] = [
  { bucket: 'a29_fair', label: 'Yes, A$29 is fair' },
  { bucket: 'closer_a10', label: 'Yes, but closer to A$10' },
  { bucket: 'free_only', label: "I'd use it free only" },
  { bucket: 'no', label: 'No' },
];

interface Props {
  email: string;
}

export function PostUnlockPanel({ email }: Props) {
  const [bucket, setBucket] = useState<string | null>(null);
  const [freeText, setFreeText] = useState('');
  const [surveyDone, setSurveyDone] = useState(false);
  const [reserved, setReserved] = useState(false);

  function submitSurvey() {
    if (!bucket) return;
    capture('survey_answered', { price_bucket: bucket, free_text: freeText.trim() || undefined });
    setSurveyDone(true);
  }

  function reserve() {
    if (reserved) return;
    capture('founder_reserved');
    if (email) void postReserve(email);
    setReserved(true);
  }

  return (
    <section className="mt-6 rounded-xl border border-hairline bg-surface p-5" data-testid="post-unlock-panel">
      <h2 className="text-sm font-bold text-navy-900">What&apos;s coming</h2>
      <ul className="mt-2 space-y-1.5">
        {UPCOMING.map((f) => (
          <li key={f} className="flex gap-2 text-sm text-navy-700">
            <span className="text-amber-500 shrink-0">▸</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* Q1 — price survey */}
      <div className="mt-5 border-t border-hairline pt-4" data-testid="price-survey">
        {surveyDone ? (
          <p className="text-sm text-good" data-testid="survey-thanks">Thanks, that really helps shape what we build.</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-navy-900">Would you pay for this once those land?</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {PRICE_OPTIONS.map((o) => (
                <button
                  key={o.bucket}
                  type="button"
                  onClick={() => setBucket(o.bucket)}
                  aria-pressed={bucket === o.bucket}
                  data-testid={`price-${o.bucket}`}
                  className={`text-left rounded-lg border px-3 py-2 text-sm ${
                    bucket === o.bucket ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-500/5' : 'border-hairline hover:border-navy-700'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="What would make it worth paying for? (optional)"
              rows={2}
              className="mt-2 w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={submitSurvey}
                disabled={!bucket}
                data-testid="survey-submit"
                className="rounded-lg bg-navy-900 hover:bg-navy-700 text-white font-semibold text-sm px-4 py-2 disabled:opacity-40"
              >
                Send
              </button>
              <button type="button" onClick={() => setSurveyDone(true)} className="text-xs text-muted hover:text-navy-900">
                Dismiss
              </button>
            </div>
          </>
        )}
      </div>

      {/* Q2 — founder reservation */}
      <div className="mt-5 border-t border-hairline pt-4" data-testid="founder-reservation">
        {reserved ? (
          <p className="text-sm text-good" data-testid="reserve-thanks">
            You&apos;re on the founder list. We&apos;ll email you when it&apos;s ready, no card needed.
          </p>
        ) : (
          <>
            <p className="text-sm font-semibold text-navy-900">Lock in founder pricing</p>
            <p className="text-sm text-muted mt-0.5">A$29 becomes A$9 for you at launch. No card, no charge, just your spot.</p>
            <button
              type="button"
              onClick={reserve}
              data-testid="reserve-btn"
              className="mt-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-navy-900 font-bold text-sm px-4 py-2"
            >
              Reserve my spot
            </button>
          </>
        )}
      </div>
    </section>
  );
}
