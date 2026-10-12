import { createRateLimiter } from './rate-limit'

export interface LoginThrottleOptions {
  ipLimit: number
  pairLimit: number
  windowMs: number
  now?: () => number
}

// Two independent limits on failed logins:
//  - per ip+username: stops guessing one account;
//  - per ip: stops one client spraying many usernames.
// The username limit is deliberately not global: a global per-user lockout would let
// anybody lock the real user out of their account just by failing against it.
// Only failures count; a legacy outage is not a failure.
export const createLoginThrottle = ({ ipLimit, pairLimit, windowMs, now }: LoginThrottleOptions) => {
  const byIp = createRateLimiter({ limit: ipLimit, windowMs, now })
  const byPair = createRateLimiter({ limit: pairLimit, windowMs, now })
  const pairKey = (ip: string, username: string) => `${ip}|${username.trim().toLowerCase().slice(0, 128)}`

  return {
    check(ip: string, username: string): { allowed: true } | { allowed: false; retryAfterSec: number } {
      const results = [byIp.check(ip), byPair.check(pairKey(ip, username))]
      const blocked = results.filter((r): r is { allowed: false; retryAfterSec: number } => !r.allowed)
      return blocked.length ? { allowed: false, retryAfterSec: Math.max(...blocked.map((r) => r.retryAfterSec)) } : { allowed: true }
    },
    recordFailure(ip: string, username: string): void {
      byIp.fail(ip)
      byPair.fail(pairKey(ip, username))
    },
    recordSuccess(ip: string, username: string): void {
      byPair.reset(pairKey(ip, username))
    },
  }
}

// 5 wrong passwords per account+ip and 20 failures per ip, per 15 minutes.
export const loginThrottle = createLoginThrottle({ ipLimit: 20, pairLimit: 5, windowMs: 15 * 60 * 1000 })
