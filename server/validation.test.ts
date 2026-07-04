// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { validateUnlock, validateReserve, isValidEmail, base64Bytes } from './validation.ts';

describe('isValidEmail', () => {
  it('accepts sane addresses, rejects junk', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('  a@b.co  ')).toBe(true);
    expect(isValidEmail('nope')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a b@c.co')).toBe(false);
    expect(isValidEmail(123)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
  });
});

describe('base64Bytes', () => {
  it('computes decoded size, handling padding and data: prefixes', () => {
    expect(base64Bytes('')).toBe(0);
    expect(base64Bytes('QQ==')).toBe(1); // "A"
    expect(base64Bytes('QUJD')).toBe(3); // "ABC"
    expect(base64Bytes('data:application/pdf;base64,QUJD')).toBe(3);
  });
});

describe('validateUnlock', () => {
  const ok = { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', consent: true };

  it('accepts a complete unlock body and normalises source', () => {
    const r = validateUnlock(ok);
    expect(r).toEqual({
      ok: true,
      value: { source: 'unlock', email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace', consent: true, pdfBase64: undefined },
    });
  });

  it('keeps a pdfBase64 for unlock only', () => {
    const withPdf = validateUnlock({ ...ok, pdfBase64: 'QUJD' });
    expect(withPdf.ok && withPdf.value.pdfBase64).toBe('QUJD');
    const waitlistPdf = validateUnlock({ email: 'a@b.co', consent: true, source: 'waitlist', pdfBase64: 'QUJD' });
    expect(waitlistPdf.ok && waitlistPdf.value.pdfBase64).toBeUndefined();
  });

  it('rejects bad email, missing names, and missing consent', () => {
    expect(validateUnlock({ ...ok, email: 'bad' })).toMatchObject({ ok: false, error: 'invalid_email' });
    expect(validateUnlock({ ...ok, firstName: '  ' })).toMatchObject({ ok: false, error: 'first_name_required' });
    expect(validateUnlock({ ...ok, lastName: '' })).toMatchObject({ ok: false, error: 'last_name_required' });
    expect(validateUnlock({ ...ok, consent: false })).toMatchObject({ ok: false, error: 'consent_required' });
    expect(validateUnlock(null)).toMatchObject({ ok: false, error: 'invalid_body' });
  });

  it('waitlist needs only email + consent (names optional)', () => {
    const r = validateUnlock({ email: 'w@b.co', consent: true, source: 'waitlist' });
    expect(r).toEqual({
      ok: true,
      value: { source: 'waitlist', email: 'w@b.co', firstName: undefined, lastName: undefined, consent: true, pdfBase64: undefined },
    });
    expect(validateUnlock({ consent: true, source: 'waitlist' })).toMatchObject({ ok: false, error: 'invalid_email' });
  });
});

describe('validateReserve', () => {
  it('accepts a valid email, rejects the rest', () => {
    expect(validateReserve({ email: 'a@b.co' })).toEqual({ ok: true, value: { email: 'a@b.co' } });
    expect(validateReserve({ email: 'bad' })).toMatchObject({ ok: false, error: 'invalid_email' });
    expect(validateReserve({})).toMatchObject({ ok: false, error: 'invalid_email' });
    expect(validateReserve(null)).toMatchObject({ ok: false, error: 'invalid_body' });
  });
});
