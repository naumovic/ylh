// Entry point: builds the Resend gateway from env, mounts the API + static PWA,
// and serves everything on one port (Task 4A §1). Run with `tsx server/index.ts`.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Resend } from 'resend';
import { createApp } from './app.ts';
import { createResendGateway, type ResendLike } from './resend.ts';

// Local dev convenience: load .env.local if present (Node >= 20.12). No-op in prod.
try {
  if (process.env.NODE_ENV !== 'production') process.loadEnvFile?.('.env.local');
} catch {
  /* no .env.local — fine */
}

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(here, '..', 'dist');

const apiKey = process.env.RESEND_API_KEY;
const audienceId = process.env.RESEND_AUDIENCE_ID;
const from = process.env.RESEND_FROM ?? 'Your Local Hero <plan@mail.yourlocalhero.com.au>';

const gateway =
  apiKey && audienceId
    ? createResendGateway(new Resend(apiKey) as unknown as ResendLike, { audienceId, from })
    : null;

if (!gateway) {
  console.warn(
    '[startup] RESEND_API_KEY / RESEND_AUDIENCE_ID not set — /api/unlock will not store contacts or send email (still returns ok).',
  );
}

const app = createApp({ gateway });

// Static PWA + SPA fallback (registered after the API routes).
app.use('/*', serveStatic({ root: path.relative(process.cwd(), distDir) || '.' }));
let indexHtml = '';
try {
  indexHtml = readFileSync(path.join(distDir, 'index.html'), 'utf8');
} catch {
  console.warn('[startup] dist/index.html not found — run `npm run build` first.');
}
app.get('*', (c) => c.html(indexHtml));

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port }, () =>
  console.log(`[startup] Your Local Hero listening on :${port} (serving ${distDir})`),
);
