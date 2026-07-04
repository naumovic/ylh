import type { ReactNode } from 'react';
import { Footer } from '../components/Footer.tsx';

// Where deletion / privacy requests go. TODO(founder): confirm this mailbox exists.
export const CONTACT_EMAIL = 'hello@yourlocalhero.com.au';

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-full">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto max-w-5xl px-5 py-4 flex items-center gap-3">
          <a href="/" className="flex items-center gap-3">
            <img src="/logo.svg" width={32} height={32} alt="" />
            <div>
              <div className="font-bold text-navy-900 leading-none">Your Local Hero</div>
              <div className="text-xs text-muted">Supercharge your solar strategy</div>
            </div>
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-5 py-8">
        <a href="/" className="text-xs text-muted hover:text-navy-900 underline underline-offset-2">← Back</a>
        <h1 className="mt-3 text-2xl font-bold text-navy-900">{title}</h1>
        <div className="mt-4 space-y-4 text-sm text-navy-700 [&_h2]:font-bold [&_h2]:text-navy-900 [&_h2]:mt-6 [&_a]:underline [&_a]:underline-offset-2">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy policy">
      <p className="text-xs text-muted">Last updated {new Date().getFullYear()}. Plain English, kept short.</p>

      <h2>What we collect</h2>
      <p>
        When you unlock your plan or join the waitlist, we collect your <strong>first name, last name and
        email</strong> (waitlist: email only). The answers you give in the tool are used in your browser to
        compute your result; we don&apos;t store them on a server. We also collect <strong>anonymous product
        analytics</strong> (which steps you reach) so we can improve the tool.
      </p>

      <h2>Who processes it</h2>
      <p>
        We use two third parties, and no others:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Resend</strong> — stores your name and email as a contact and sends you your plan and occasional updates.</li>
        <li><strong>PostHog</strong> — product analytics; we send your email so your session is identified. Used to understand what&apos;s useful.</li>
      </ul>

      <h2>Why we collect it</h2>
      <p>To email you your plan, to tell you when new features land, and to decide what to build next. We do <strong>not</strong> sell your data or run ads.</p>

      <h2>Deleting your data</h2>
      <p>
        Email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we&apos;ll delete your contact
        and analytics profile. (Self-serve deletion is coming.)
      </p>

      <h2>Contact</h2>
      <p><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
    </LegalLayout>
  );
}

export function TermsPage() {
  return (
    <LegalLayout title="Terms of use">
      <p className="text-xs text-muted">Last updated {new Date().getFullYear()}. Plain English, kept short.</p>

      <h2>General information only</h2>
      <p>
        Your Local Hero gives general information to help you think about solar, batteries and EV charging. It is
        <strong> not personal financial or product advice</strong>. Always get your own quotes and check the current
        rules and rebates before you commit.
      </p>

      <h2>Estimates, not guarantees</h2>
      <p>
        The figures are estimates based on Australian rates and rebates that change over time. Your actual costs and
        savings will differ. We don&apos;t guarantee accuracy and aren&apos;t liable for decisions you make based on the tool.
      </p>

      <h2>Early access</h2>
      <p>
        The tool is free while in early access. Features may change or be unavailable, and any &quot;founder pricing&quot;
        reservation is an expression of interest only — no payment is taken and nothing is owed.
      </p>

      <h2>Contact</h2>
      <p><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
    </LegalLayout>
  );
}
