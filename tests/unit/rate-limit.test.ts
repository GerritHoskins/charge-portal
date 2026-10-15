import { describe, expect, it } from 'vitest'
import { createLoginThrottle } from '../../server/utils/login-throttle'
import { createRateLimiter } from '../../server/utils/rate-limit'

describe('rate limiter (failures per window)', () => {
  it('blocks once the limit is reached and reports when to retry', () => {
    let now = 0
    const limiter = createRateLimiter({ limit: 2, windowMs: 10_000, now: () => now })
    limiter.fail('k')
    expect(limiter.check('k').allowed).toBe(true)
    limiter.fail('k')
    now = 4_000
    expect(limiter.check('k')).toEqual({ allowed: false, retryAfterSec: 6 })
  })

  it('allows again after the window has passed', () => {
    let now = 0
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: () => now })
    limiter.fail('k')
    expect(limiter.check('k').allowed).toBe(false)
    now = 1_000
    expect(limiter.check('k').allowed).toBe(true)
  })

  it('keeps keys independent and supports reset', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000 })
    limiter.fail('a')
    expect(limiter.check('b').allowed).toBe(true)
    limiter.reset('a')
    expect(limiter.check('a').allowed).toBe(true)
  })

  it('does not grow without bound (oldest key is evicted at the cap)', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 2 })
    limiter.fail('a')
    limiter.fail('b')
    limiter.fail('c')
    expect(limiter.size()).toBe(2)
    expect(limiter.check('a').allowed).toBe(true) // evicted
    expect(limiter.check('c').allowed).toBe(false)
  })
})

describe('login throttle', () => {
  const config = { ipLimit: 3, pairLimit: 2, windowMs: 60_000 }

  it('locks a user+ip pair after repeated failures, other users from the same ip stay possible', () => {
    const throttle = createLoginThrottle(config)
    throttle.recordFailure('1.1.1.1', 'demo')
    throttle.recordFailure('1.1.1.1', 'demo')
    expect(throttle.check('1.1.1.1', 'demo').allowed).toBe(false)
    expect(throttle.check('1.1.1.1', 'other').allowed).toBe(true)
  })

  it('does not let another ip lock out the real user', () => {
    const throttle = createLoginThrottle(config)
    throttle.recordFailure('6.6.6.6', 'demo')
    throttle.recordFailure('6.6.6.6', 'demo')
    expect(throttle.check('2.2.2.2', 'demo').allowed).toBe(true)
  })

  it('locks an ip that sprays many usernames', () => {
    const throttle = createLoginThrottle(config)
    for (const user of ['a', 'b', 'c']) throttle.recordFailure('1.1.1.1', user)
    expect(throttle.check('1.1.1.1', 'fresh').allowed).toBe(false)
  })

  it('normalises usernames so casing and padding do not dodge the limit', () => {
    const throttle = createLoginThrottle(config)
    throttle.recordFailure('1.1.1.1', 'Demo')
    throttle.recordFailure('1.1.1.1', ' demo ')
    expect(throttle.check('1.1.1.1', 'DEMO').allowed).toBe(false)
  })

  it('a successful login clears the pair counter', () => {
    const throttle = createLoginThrottle(config)
    throttle.recordFailure('1.1.1.1', 'demo')
    throttle.recordSuccess('1.1.1.1', 'demo')
    throttle.recordFailure('1.1.1.1', 'demo')
    expect(throttle.check('1.1.1.1', 'demo').allowed).toBe(true)
  })
})
