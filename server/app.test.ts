// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createApp } from './app.ts';
import type { ResendGateway } from './resend.ts';

function mockGateway(overrides: Partial<ResendGateway> = {}): ResendGateway {
  return {
    upsertContact: vi.fn(async () => ({ ok: true })),
    sendPlanEmail: vi.fn(async () => ({ ok: true, attached: true })),
    tagFounderReserved: vi.fn(async () => ({ ok: true })),
    ...overrides,
  };
}

function post(app: ReturnType<typeof createApp>, path: string, body: unknown) {
  return app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const UNLOCK = { firstName: 'Ada', lastName: 'L', email: 'ada@example.com', consent: true };

describe('POST /api/unlock', () => {
  it('stores the contact, emails the plan, returns ok', async () => {
    const gateway = mockGateway();
    const res = await post(createApp({ gateway }), '/api/unlock', { ...UNLOCK, pdfBase64: 'QUJD' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(gateway.upsertContact).toHaveBeenCalledWith({ email: 'ada@example.com', firstName: 'Ada', lastName: 'L', source: 'unlock' });
    expect(gateway.sendPlanEmail).toHaveBeenCalledWith({ to: 'ada@example.com', firstName: 'Ada', pdfBase64: 'QUJD' });
  });

  it('waitlist stores the contact but sends no email', async () => {
    const gateway = mockGateway();
    const res = await post(createApp({ gateway }), '/api/unlock', { email: 'w@b.co', consent: true, source: 'waitlist' });
    expect(await res.json()).toEqual({ ok: true, emailQueued: false });
    expect(gateway.upsertContact).toHaveBeenCalledWith({ email: 'w@b.co', firstName: undefined, lastName: undefined, source: 'waitlist' });
    expect(gateway.sendPlanEmail).not.toHaveBeenCalled();
  });

  it('rejects an invalid body with 400', async () => {
    const res = await post(createApp({ gateway: mockGateway() }), '/api/unlock', { ...UNLOCK, email: 'nope' });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, error: 'invalid_email' });
  });

  it('still unlocks (ok, emailQueued:false) when Resend throws', async () => {
    const gateway = mockGateway({ upsertContact: vi.fn(async () => { throw new Error('resend down'); }) });
    const res = await post(createApp({ gateway }), '/api/unlock', UNLOCK);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, emailQueued: false });
  });

  it('still unlocks when no gateway is configured', async () => {
    const res = await post(createApp({ gateway: null }), '/api/unlock', UNLOCK);
    expect(await res.json()).toEqual({ ok: true, emailQueued: false });
  });
});

describe('POST /api/reserve', () => {
  it('tags the contact and confirms', async () => {
    const gateway = mockGateway();
    const res = await post(createApp({ gateway }), '/api/reserve', { email: 'ada@example.com' });
    expect(await res.json()).toEqual({ ok: true });
    expect(gateway.tagFounderReserved).toHaveBeenCalledWith('ada@example.com');
  });

  it('rejects a bad email; confirms even if Resend throws', async () => {
    expect((await post(createApp({ gateway: mockGateway() }), '/api/reserve', { email: 'x' })).status).toBe(400);
    const gateway = mockGateway({ tagFounderReserved: vi.fn(async () => { throw new Error('down'); }) });
    const res = await post(createApp({ gateway }), '/api/reserve', { email: 'ada@example.com' });
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe('rate limiting', () => {
  it('returns 429 when the limiter denies', async () => {
    const app = createApp({ gateway: mockGateway(), rateLimiter: { allow: () => false } });
    const res = await post(app, '/api/unlock', UNLOCK);
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ ok: false, error: 'rate_limited' });
  });
});
