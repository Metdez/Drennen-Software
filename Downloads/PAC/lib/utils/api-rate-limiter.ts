/**
 * In-memory rate limiter for incoming API requests.
 *
 * NOT the same as lib/utils/rate-limiter.ts, which handles
 * outbound calls to external APIs (FEC, ProPublica, etc.).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
let callsSinceCleanup = 0;
const CLEANUP_INTERVAL = 1000;

function pruneExpired(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check and consume one request token for the given IP.
 *
 * @param ip       - Client IP address (or any string key)
 * @param limit    - Max requests allowed in the window
 * @param windowMs - Window duration in milliseconds
 */
export function rateLimit(
  ip: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  // Periodic cleanup of expired entries
  callsSinceCleanup++;
  if (callsSinceCleanup >= CLEANUP_INTERVAL) {
    callsSinceCleanup = 0;
    pruneExpired();
  }

  const now = Date.now();
  const entry = store.get(ip);

  // No existing entry or window has expired — start fresh
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(ip, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }

  // Window still active
  if (entry.count < limit) {
    entry.count++;
    return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt };
  }

  // Over limit
  return { success: false, remaining: 0, resetAt: entry.resetAt };
}
