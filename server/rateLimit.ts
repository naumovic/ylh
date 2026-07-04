// Minimal in-memory, per-key fixed-window rate limiter (Task 4A §3: ~5/min per IP).
// No dependency, single-process only — fine for a single small Render service.

export interface RateLimiter {
  allow(key: string): boolean;
}

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }): RateLimiter {
  const hits = new Map<string, { count: number; reset: number }>();
  return {
    allow(key) {
      const now = Date.now();
      const entry = hits.get(key);
      if (!entry || now >= entry.reset) {
        hits.set(key, { count: 1, reset: now + windowMs });
        return true;
      }
      if (entry.count >= limit) return false;
      entry.count += 1;
      return true;
    },
  };
}
