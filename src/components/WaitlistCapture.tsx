import { useState } from 'react';
import { postUnlock } from '../lib/api.ts';
import { capture, identify } from '../lib/analytics.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Email-only capture for people who don't unlock (Task 4A §2.5). Uses /api/unlock
 * with source: 'waitlist' (no PDF, no email sent). */
export function WaitlistCapture() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setError('Please enter a valid email address.');
    setError(null);
    capture('waitlist_joined');
    identify(email.trim());
    await postUnlock({ email: email.trim(), consent: true, source: 'waitlist' });
    setJoined(true);
  }

  if (joined) {
    return (
      <p className="mt-4 text-sm text-good" data-testid="waitlist-joined">
        You&apos;re on the list, we&apos;ll tell you when new features land.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-xl border border-hairline bg-surface p-4" data-testid="waitlist">
      <div className="text-sm font-semibold text-navy-900">Not ready? We&apos;ll tell you when new features land.</div>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email for the waitlist"
          data-testid="waitlist-email"
          className="flex-1 rounded-lg border border-hairline bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        />
        <button type="submit" data-testid="waitlist-submit" className="rounded-lg border border-hairline hover:border-navy-900 text-navy-900 font-semibold text-sm px-4 py-2">
          Keep me posted
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-danger" data-testid="waitlist-error">{error}</p>}
    </form>
  );
}
