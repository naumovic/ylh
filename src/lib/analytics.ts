// Thin PostHog wrapper (Task 4A §4). No-ops entirely when VITE_POSTHOG_KEY is
// unset — dev, tests and even a deploy work without an account; drop the key in
// later and events start flowing. Event names must match §4 exactly (the go/no-go
// gate reads them).

import posthog from 'posthog-js';

const KEY = import.meta.env.VITE_POSTHOG_KEY;
// `||` (not `??`): an empty-string VITE_POSTHOG_HOST (e.g. the var set-but-blank on
// the host) must still fall back to the US default. With `??` an empty string slips
// through and posthog-js posts events to the current origin (`/e/`) instead of PostHog.
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let ready = false;

export function initAnalytics(): void {
  if (ready || !KEY || typeof window === 'undefined') return;
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false,
    autocapture: false,
    person_profiles: 'identified_only',
  });
  ready = true;
}

export type AnalyticsEvent =
  | 'results_viewed'
  | 'unlock_clicked'
  | 'email_provided'
  | 'pdf_downloaded'
  | 'plan_emailed'
  | 'survey_answered'
  | 'founder_reserved'
  | 'waitlist_joined';

export function capture(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  if (!KEY || !ready) return;
  posthog.capture(event, props);
}

export function identify(email: string): void {
  if (!KEY || !ready) return;
  posthog.identify(email, { email });
}
