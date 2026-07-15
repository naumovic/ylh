// Client calls to the email-gate service (Task 4A §3). "Never block the user":
// a network failure (e.g. running the client-only `vite dev` with no API, or a
// backend hiccup) still unlocks — there's no revenue to protect yet.

export interface UnlockPayload {
  firstName?: string;
  lastName?: string;
  email: string;
  consent: boolean;
  source?: 'unlock' | 'waitlist' | 'directory-waitlist';
  postcode?: string; // directory-waitlist: the postcode with no coverage yet (expansion signal)
  pdfBase64?: string;
}

export interface UnlockResult {
  ok: boolean;
  emailQueued: boolean;
  error?: string;
}

export async function postUnlock(payload: UnlockPayload): Promise<UnlockResult> {
  try {
    const res = await fetch('/api/unlock', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const body = (await res.json()) as { ok?: boolean; emailQueued?: boolean };
      return { ok: body.ok !== false, emailQueued: body.emailQueued !== false };
    }
    // 4xx/5xx: surface a soft error but don't hard-fail the unlock UX.
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, emailQueued: false, error: body.error ?? `http_${res.status}` };
  } catch {
    // No server reachable — unlock anyway, note the email wasn't queued.
    return { ok: true, emailQueued: false };
  }
}

export async function postReserve(email: string): Promise<void> {
  try {
    await fetch('/api/reserve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  } catch {
    /* best-effort — the reservation UX is confirmed client-side regardless */
  }
}
