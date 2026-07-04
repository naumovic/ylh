// Hono app with the email-gate API (Task 4A §1, §3). Framework routes only — the
// static-file serving lives in index.ts (node-server specific) so this stays
// portable and easy to test via app.request().

import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { validateUnlock, validateReserve, MAX_BODY_BYTES } from './validation.ts';
import type { ResendGateway } from './resend.ts';
import { createRateLimiter, type RateLimiter } from './rateLimit.ts';

export interface AppDeps {
  /** null when RESEND_* env is unset — routes still return ok, they just don't email/store. */
  gateway: ResendGateway | null;
  /** override for tests; defaults to 5/min per IP. */
  rateLimiter?: RateLimiter;
}

function clientIp(headers: { get(name: string): string | null | undefined }): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return headers.get('x-real-ip')?.trim() || 'unknown';
}

export function createApp({ gateway, rateLimiter }: AppDeps) {
  const app = new Hono();
  const limiter = rateLimiter ?? createRateLimiter({ limit: 5, windowMs: 60_000 });

  // Rate-limit the API surface only (static assets are unmetered).
  app.use('/api/*', async (c, next) => {
    if (!limiter.allow(clientIp(c.req.raw.headers))) {
      return c.json({ ok: false, error: 'rate_limited' }, 429);
    }
    await next();
  });

  app.post(
    '/api/unlock',
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: (c) => c.json({ ok: false, error: 'payload_too_large' }, 413),
    }),
    async (c) => {
      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ ok: false, error: 'invalid_json' }, 400);
      }
      const v = validateUnlock(body);
      if (!v.ok) return c.json({ ok: false, error: v.error }, 400);

      const { source, email, firstName, lastName, pdfBase64 } = v.value;

      // Never block the user on a third-party hiccup (Task 4A §3).
      let emailQueued = false;
      try {
        if (gateway) {
          await gateway.upsertContact({ email, firstName, lastName, source });
          if (source === 'unlock') {
            const sent = await gateway.sendPlanEmail({ to: email, firstName, pdfBase64 });
            emailQueued = sent.ok;
          }
        }
      } catch (err) {
        console.error('[unlock] resend failure', err);
        emailQueued = false;
      }

      return c.json(emailQueued ? { ok: true } : { ok: true, emailQueued: false });
    },
  );

  app.post('/api/reserve', async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: 'invalid_json' }, 400);
    }
    const v = validateReserve(body);
    if (!v.ok) return c.json({ ok: false, error: v.error }, 400);

    try {
      if (gateway) await gateway.tagFounderReserved(v.value.email);
    } catch (err) {
      console.error('[reserve] resend failure', err);
    }
    // Founder reservation is a UX nicety — always confirm.
    return c.json({ ok: true });
  });

  return app;
}
