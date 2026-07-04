// Thin wrapper around the Resend SDK (Task 4A §3). Kept behind a small interface
// and built from an injected client so it can be unit-tested with a mock — no
// network, no real API key in tests.
//
// NOTE on custom fields: Resend Audience contacts only persist email / firstName /
// lastName / unsubscribed. There is no native place for `source` or
// `founder_reserved`, so those are the authoritative job of the client-side PostHog
// events (Task 4A §4); here we just ensure the contact exists / is up to date.
// `tagFounderReserved` therefore upserts the contact (idempotent) as a best-effort
// hook for when Resend gains custom properties.

import { base64Bytes, MAX_PDF_ATTACH_BYTES, type UnlockSource } from './validation.ts';

/** The subset of the Resend SDK we depend on — lets tests pass a mock. */
export interface ResendLike {
  contacts: {
    create(opts: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
    update(opts: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
  };
  emails: {
    send(opts: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
  };
}

export interface UpsertContactInput {
  email: string;
  firstName?: string;
  lastName?: string;
  source: UnlockSource;
}
export interface SendPlanEmailInput {
  to: string;
  firstName?: string;
  pdfBase64?: string;
}

export interface ResendGateway {
  upsertContact(input: UpsertContactInput): Promise<{ ok: boolean }>;
  sendPlanEmail(input: SendPlanEmailInput): Promise<{ ok: boolean; attached: boolean }>;
  tagFounderReserved(email: string): Promise<{ ok: boolean }>;
}

export const PLAN_EMAIL_SUBJECT = 'Your Local Hero — your plan';
export const PDF_FILENAME = 'your-local-hero-plan.pdf';

function planEmailHtml(firstName: string | undefined, attached: boolean): string {
  const hi = firstName ? `Hi ${escapeHtml(firstName)},` : 'Hi,';
  const body = attached
    ? 'Your plan is attached as a PDF. It reflects Australia today and may change over time — general information only, not personal financial or product advice.'
    : "Your plan was too large to attach, but it's saved for you — reopen Your Local Hero any time to view and download it. General information only, not personal financial or product advice.";
  return [
    '<div style="font-family:Inter,Arial,sans-serif;color:#14304B;max-width:520px">',
    `<p>${hi}</p>`,
    `<p>${body}</p>`,
    '<p>Thanks for trying Your Local Hero — honest solar, EV &amp; battery advice, even when the answer is &quot;do nothing&quot;.</p>',
    '</div>',
  ].join('');
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

/** Build a gateway from a Resend-like client. `from` is the verified sender address. */
export function createResendGateway(
  client: ResendLike,
  opts: { audienceId: string; from: string },
): ResendGateway {
  const { audienceId, from } = opts;

  return {
    async upsertContact({ email, firstName, lastName }) {
      const payload = { audienceId, email, firstName, lastName, unsubscribed: false };
      const created = await client.contacts.create(payload);
      if (created.error) {
        // Already exists (or a transient create error) — update instead.
        const updated = await client.contacts.update(payload);
        return { ok: !updated.error };
      }
      return { ok: true };
    },

    async sendPlanEmail({ to, firstName, pdfBase64 }) {
      const attach = !!pdfBase64 && base64Bytes(pdfBase64) <= MAX_PDF_ATTACH_BYTES;
      const res = await client.emails.send({
        from,
        to,
        subject: PLAN_EMAIL_SUBJECT,
        html: planEmailHtml(firstName, attach),
        ...(attach ? { attachments: [{ filename: PDF_FILENAME, content: pdfBase64 }] } : {}),
      });
      return { ok: !res.error, attached: attach };
    },

    async tagFounderReserved(email) {
      const res = await client.contacts.update({ audienceId, email, unsubscribed: false });
      return { ok: !res.error };
    },
  };
}
