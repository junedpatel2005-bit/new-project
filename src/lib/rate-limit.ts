import "server-only";
const attempts = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, limit = 5, windowMs = 60_000) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.reset < now) {
    attempts.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

/** Clear a successful credential attempt so a previous typo cannot lock a user out. */
export function clearRateLimit(key: string) {
  attempts.delete(key);
}
