// @ts-nocheck
// PLACEHOLDER for Task 4 — not built or deployed yet. The ONLY backend in the MVP. Stateless: no DB.
// The handler below is written Vercel-style; since @vercel/node functions don't run on Render,
// Task 4 converts this into a single small Node web service (Express/Hono) that serves the built
// dist/ statics AND this endpoint (+ /api/create-checkout), with a render.yaml. See README / CLAUDE.md.
// Install when building Task 4:  npm i stripe jsonwebtoken  (+ express or hono)
//
// Flow: client redirects to Stripe Checkout (with a promotion-code field for discounts) →
// on return, client calls /api/verify?session_id=... → this confirms payment with Stripe and
// returns a short-lived signed unlock token. The PWA renders/exports the paid pack only on a
// valid token. (For HARD gating, also generate the pack here post-payment and return it.)
//
// Env vars (set in the Render dashboard, never in the repo): STRIPE_SECRET_KEY, UNLOCK_JWT_SECRET
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const sessionId = String(req.query.session_id || '');
    if (!sessionId) return res.status(400).json({ ok: false, error: 'missing session_id' });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return res.status(402).json({ ok: false, error: 'not paid' });
    }

    // short-lived token the client presents to unlock the paid render
    const token = jwt.sign(
      { scope: 'plan', sid: sessionId },
      process.env.UNLOCK_JWT_SECRET!,
      { expiresIn: '2h' },
    );
    return res.status(200).json({ ok: true, token });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
}
