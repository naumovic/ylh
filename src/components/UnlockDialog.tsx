import { useState } from 'react';
import { postUnlock } from '../lib/api.ts';
import { capture, identify } from '../lib/analytics.ts';

const field = 'w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40';
const lbl = 'block text-xs text-muted mb-1';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  onClose: () => void;
  onUnlocked: (r: { email: string; emailQueued: boolean }) => void;
  /** Builds the plan PDF as base64 at submit time (kept out of state while locked). */
  makePdfBase64: () => string;
}

export function UnlockDialog({ onClose, onUnlocked, makePdfBase64 }: Props) {
  const [firstName, setFirst] = useState('');
  const [lastName, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) return setError('Please enter your first name.');
    if (!lastName.trim()) return setError('Please enter your last name.');
    if (!EMAIL_RE.test(email.trim())) return setError('Please enter a valid email address.');
    if (!consent) return setError('Please tick the consent box so we can email your plan.');
    setError(null);
    setSubmitting(true);

    capture('email_provided');
    identify(email.trim());

    let pdfBase64: string | undefined;
    try {
      pdfBase64 = makePdfBase64();
    } catch {
      pdfBase64 = undefined; // still unlock even if PDF generation hiccups
    }

    const res = await postUnlock({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      consent: true,
      source: 'unlock',
      pdfBase64,
    });

    if (!res.ok) {
      setSubmitting(false);
      setError('Something went wrong. Please try again.');
      return;
    }
    onUnlocked({ email: email.trim(), emailQueued: res.emailQueued });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Unlock your plan"
      data-testid="unlock-dialog"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-hairline bg-surface p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold text-navy-900">Unlock your full plan</h2>
        <p className="mt-1 text-sm text-muted">
          Free while we&apos;re in early access. Tell us where to send it and your full plan unlocks
          right here, with a copy emailed to you.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className={lbl} htmlFor="uf-first">First name</label>
            <input id="uf-first" className={field} value={firstName} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" />
          </div>
          <div>
            <label className={lbl} htmlFor="uf-last">Last name</label>
            <input id="uf-last" className={field} value={lastName} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" />
          </div>
          <div className="col-span-2">
            <label className={lbl} htmlFor="uf-email">Email</label>
            <input id="uf-email" type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
        </div>

        <label className="mt-3 flex items-start gap-2 text-xs text-navy-700 cursor-pointer select-none">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-amber-500" data-testid="uf-consent" />
          <span>
            Email me my plan and occasional updates. See our{' '}
            <a href="/privacy" target="_blank" rel="noreferrer" className="underline underline-offset-2">privacy policy</a>.
          </span>
        </label>

        {error && <p className="mt-3 text-sm text-danger" data-testid="uf-error">{error}</p>}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="text-sm text-muted hover:text-navy-900">Cancel</button>
          <button
            type="submit"
            disabled={submitting}
            data-testid="uf-submit"
            className="rounded-lg bg-amber-500 hover:bg-amber-600 text-navy-900 font-bold text-sm px-5 py-2 disabled:opacity-50"
          >
            {submitting ? 'Unlocking…' : 'Unlock my plan'}
          </button>
        </div>
      </form>
    </div>
  );
}
