// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import {
  createResendGateway,
  PLAN_EMAIL_SUBJECT,
  PDF_FILENAME,
  type ResendLike,
} from './resend.ts';
import { MAX_PDF_ATTACH_BYTES } from './validation.ts';

/** A fake Resend client whose calls resolve to {data,error}. */
function mockClient(overrides: Partial<{
  createError: unknown;
  updateError: unknown;
  sendError: unknown;
}> = {}) {
  const create = vi.fn(async (_opts: Record<string, unknown>) => ({ data: { id: 'c1' }, error: overrides.createError ?? null }));
  const update = vi.fn(async (_opts: Record<string, unknown>) => ({ data: { id: 'c1' }, error: overrides.updateError ?? null }));
  const send = vi.fn(async (_opts: Record<string, unknown>) => ({ data: { id: 'e1' }, error: overrides.sendError ?? null }));
  const client: ResendLike = { contacts: { create, update }, emails: { send } };
  return { client, create, update, send };
}

const OPTS = { audienceId: 'aud_123', from: 'Your Local Hero <plan@mail.test>' };

describe('createResendGateway.upsertContact', () => {
  it('creates the contact with audience, email, names, unsubscribed=false', async () => {
    const { client, create, update } = mockClient();
    const g = createResendGateway(client, OPTS);
    const r = await g.upsertContact({ email: 'a@b.co', firstName: 'Ada', lastName: 'L', source: 'unlock' });
    expect(r.ok).toBe(true);
    expect(create).toHaveBeenCalledWith({ audienceId: 'aud_123', email: 'a@b.co', firstName: 'Ada', lastName: 'L', unsubscribed: false });
    expect(update).not.toHaveBeenCalled();
  });

  it('falls back to update when the contact already exists (create errors)', async () => {
    const { client, create, update } = mockClient({ createError: { name: 'validation_error', message: 'exists' } });
    const g = createResendGateway(client, OPTS);
    const r = await g.upsertContact({ email: 'a@b.co', firstName: 'Ada', lastName: 'L', source: 'unlock' });
    expect(create).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({ audienceId: 'aud_123', email: 'a@b.co', firstName: 'Ada', lastName: 'L', unsubscribed: false });
    expect(r.ok).toBe(true);
  });

  it('reports not-ok when both create and update error', async () => {
    const { client } = mockClient({ createError: { message: 'x' }, updateError: { message: 'y' } });
    const g = createResendGateway(client, OPTS);
    expect((await g.upsertContact({ email: 'a@b.co', source: 'waitlist' })).ok).toBe(false);
  });
});

describe('createResendGateway.sendPlanEmail', () => {
  it('sends from/to/subject and attaches the PDF when present and small', async () => {
    const { client, send } = mockClient();
    const g = createResendGateway(client, OPTS);
    const r = await g.sendPlanEmail({ to: 'a@b.co', firstName: 'Ada', pdfBase64: 'QUJD' });
    expect(r).toEqual({ ok: true, attached: true });
    const arg = send.mock.calls[0]![0];
    expect(arg.from).toBe(OPTS.from);
    expect(arg.to).toBe('a@b.co');
    expect(arg.subject).toBe(PLAN_EMAIL_SUBJECT);
    expect(arg.attachments).toEqual([{ filename: PDF_FILENAME, content: 'QUJD' }]);
  });

  it('omits the attachment when the PDF exceeds the size cap', async () => {
    const { client, send } = mockClient();
    const g = createResendGateway(client, OPTS);
    // base64 length ~ bytes * 4/3; go just over the cap.
    const big = 'A'.repeat(Math.ceil((MAX_PDF_ATTACH_BYTES + 1024) * 4 / 3));
    const r = await g.sendPlanEmail({ to: 'a@b.co', pdfBase64: big });
    expect(r.attached).toBe(false);
    expect((send.mock.calls[0]![0]).attachments).toBeUndefined();
  });

  it('sends without an attachment when no PDF given', async () => {
    const { client, send } = mockClient();
    const g = createResendGateway(client, OPTS);
    const r = await g.sendPlanEmail({ to: 'a@b.co' });
    expect(r.attached).toBe(false);
    expect((send.mock.calls[0]![0]).attachments).toBeUndefined();
  });

  it('reports not-ok when the send errors', async () => {
    const { client } = mockClient({ sendError: { message: 'smtp down' } });
    const g = createResendGateway(client, OPTS);
    expect((await g.sendPlanEmail({ to: 'a@b.co' })).ok).toBe(false);
  });
});

describe('createResendGateway.tagFounderReserved', () => {
  it('updates the contact for the given email', async () => {
    const { client, update } = mockClient();
    const g = createResendGateway(client, OPTS);
    const r = await g.tagFounderReserved('a@b.co');
    expect(update).toHaveBeenCalledWith({ audienceId: 'aud_123', email: 'a@b.co', unsubscribed: false });
    expect(r.ok).toBe(true);
  });
});
