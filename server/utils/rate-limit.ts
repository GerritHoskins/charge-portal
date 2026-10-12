export interface RateLimiterOptions {
  limit: number
  windowMs: number
  now?: () => number
  maxKeys?: number
}

interface Entry {
  count: number
  resetAt: number
}

// Fixed-window failure counter. In memory, like the legacy session store: single
// instance only; a multi-instance deployment needs a shared store behind the same interface.
export const createRateLimiter = ({ limit, windowMs, now = Date.now, maxKeys = 10_000 }: RateLimiterOptions) => {
  const entries = new Map<string, Entry>()

  const live = (key: string): Entry | undefined => {
    const entry = entries.get(key)
    if (entry && entry.resetAt <= now()) {
      entries.delete(key)
      return undefined
    }
    return entry
  }

  return {
    check(key: string): { allowed: true } | { allowed: false; retryAfterSec: number } {
      const entry = live(key)
      if (!entry || entry.count < limit) return { allowed: true }
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now()) / 1000)) }
    },
    fail(key: string): void {
      const entry = live(key)
      if (entry) {
        entry.count += 1
        return
      }
      if (entries.size >= maxKeys) {
        for (const [k, e] of entries) if (e.resetAt <= now()) entries.delete(k)
        // Still full of live entries: drop the oldest so memory stays bounded.
        if (entries.size >= maxKeys) entries.delete(entries.keys().next().value as string)
      }
      entries.set(key, { count: 1, resetAt: now() + windowMs })
    },
    reset(key: string): void {
      entries.delete(key)
    },
    size: () => entries.size,
  }
}
