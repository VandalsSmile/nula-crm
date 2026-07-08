import "server-only"

/**
 * Lightweight in-memory token-bucket rate limiter. Best-effort: state lives per
 * server instance, so under horizontal scaling it caps per-instance traffic
 * rather than globally. Good enough as a first line of defense on public
 * lead-intake endpoints; swap for a shared store (Redis) if stricter limits are
 * needed.
 */
const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= limit) return false
  bucket.count += 1
  return true
}
