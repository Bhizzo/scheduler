// Minimal in-memory rate limiter. Not durable across server restarts or
// suitable for multi-instance deployments — but protects against basic
// brute-force and accidental spam during development.
//
// For production, replace with Upstash Redis or similar.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Allow `max` requests per `windowMs` milliseconds, keyed by `key`.
 * Returns { allowed, retryAfterMs }.
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (existing.count >= max) {
    return { allowed: false, retryAfterMs: existing.resetAt - now };
  }

  existing.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

// Periodic cleanup so the map doesn't grow forever.
// Runs every 15 minutes at most, only when a request lands.
let lastCleanup = Date.now();
export function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < 15 * 60 * 1000) return;
  lastCleanup = now;
  for (const [k, v] of buckets.entries()) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}

/**
 * Extract a client identifier from the request headers. Works behind
 * Vercel / most reverse proxies.
 */
export function clientIdFromRequest(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
