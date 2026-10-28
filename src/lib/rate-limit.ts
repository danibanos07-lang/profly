/**
 * Best-effort in-memory limiter for anonymous endpoints. It is per server
 * instance, so it complements (never replaces) the database-level limits
 * enforced for authenticated actions. Use a shared store (e.g. Upstash
 * Redis) if you need strict global limits on serverless deployments.
 */
const buckets = new Map<string, number[]>();

export function hitRateLimit(key: string, max: number, windowMs: number, now = Date.now()) {
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    buckets.set(key, recent);
    return true;
  }
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return false;
}
