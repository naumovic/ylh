// @ts-nocheck
// Vercel serverless function — the ONLY backend in the MVP. Stateless: no DB.
// Install before use:  npm i stripe jsonwebtoken @vercel/node
//
// Flow: client redirects to Stripe Checkout (with a promotion-code field for discounts) →
// on return, client calls /api/verify?session_id=... → this confirms payment with Stripe and
// returns a short-lived signed unlock token. The PWA renders/exports the paid pack only on a
// valid token. (For HARD gating, also generate the pack here post-payment and return it.)
//
// Env vars (set in Vercel, never in the repo): STRIPE_SECRET_KEY, UNLOCK_JWT_SECRET
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
