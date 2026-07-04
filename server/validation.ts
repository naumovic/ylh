// Pure, framework-agnostic validation for the email-gate endpoints (Task 4A §3).
// No I/O — unit-tested directly.

export type UnlockSource = 'unlock' | 'waitlist';

/** Max total request body (Task 4A §3: reject > 7 MB). Enforced at the HTTP layer. */
export const MAX_BODY_BYTES = 7 * 1024 * 1024;
/** PDF attachments larger than this are dropped (email still sent). Task 4A §2. */
export const MAX_PDF_ATTACH_BYTES = 5 * 1024 * 1024;

// Deliberately simple, permissive email shape — the real gate is a successful send.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && email.trim().length <= 320 && EMAIL_RE.test(email.trim());
}

/** Decoded byte length of a base64 (or data:URI) string, without allocating a Buffer. */
export function base64Bytes(b64: string): number {
  const comma = b64.indexOf(',');
  const s = comma >= 0 && b64.slice(0, comma).includes('base64') ? b64.slice(comma + 1) : b64;
  const len = s.length;
  if (len === 0) return 0;
  const padding = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0;
  return Math.floor((len * 3) / 4) - padding;
}

export interface UnlockValue {
  source: UnlockSource;
  email: string;
  firstName?: string;
  lastName?: string;
  consent: true;
  pdfBase64?: string;
}

export type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Validate a POST /api/unlock body.
 * - unlock: firstName + lastName + valid email + consent === true
 * - waitlist: valid email + consent === true (names optional, no PDF)
 */
export function validateUnlock(body: unknown): Validation<UnlockValue> {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'invalid_body' };
  const b = body as Record<string, unknown>;

  const source: UnlockSource = b.source === 'waitlist' ? 'waitlist' : 'unlock';
  const email = str(b.email);
  if (!isValidEmail(email)) return { ok: false, error: 'invalid_email' };
  if (b.consent !== true) return { ok: false, error: 'consent_required' };

  let firstName: string | undefined;
  let lastName: string | undefined;
  if (source === 'unlock') {
    firstName = str(b.firstName);
    lastName = str(b.lastName);
    if (!firstName) return { ok: false, error: 'first_name_required' };
    if (!lastName) return { ok: false, error: 'last_name_required' };
  } else {
    firstName = str(b.firstName) || undefined;
    lastName = str(b.lastName) || undefined;
  }

  const pdfBase64 =
    source === 'unlock' && typeof b.pdfBase64 === 'string' && b.pdfBase64.length > 0
      ? b.pdfBase64
      : undefined;

  return { ok: true, value: { source, email, firstName, lastName, consent: true, pdfBase64 } };
}

/** Validate a POST /api/reserve body (founder reservation — email only). */
export function validateReserve(body: unknown): Validation<{ email: string }> {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'invalid_body' };
  const email = str((body as Record<string, unknown>).email);
  if (!isValidEmail(email)) return { ok: false, error: 'invalid_email' };
  return { ok: true, value: { email } };
}
