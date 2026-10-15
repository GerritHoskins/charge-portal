import { describe, expect, it } from 'vitest'
import { bucketOf, legacyPrefixesFor, parseRollout, routedToLegacy } from '../../server/utils/rollout'

describe('parseRollout', () => {
  it('parses prefix=percent pairs', () => {
    expect(parseRollout('/portal/invoices=0, /portal/sessions=50')).toEqual([
      { prefix: '/portal/invoices', percent: 0 },
      { prefix: '/portal/sessions', percent: 50 },
    ])
  })

  it.each([
    ['empty', ''],
    ['no percent', '/portal/invoices'],
    ['percent out of range', '/portal/invoices=101'],
    ['negative percent', '/portal/invoices=-1'],
    ['not a number', '/portal/invoices=half'],
    ['not a portal path', '/api/me=0'],
    ['path traversal', '/portal/../admin=0'],
  ])('ignores an invalid entry: %s', (_label, value) => {
    expect(parseRollout(value)).toEqual([])
  })

  it('keeps valid entries next to invalid ones', () => {
    expect(parseRollout('bogus,/portal/stations=0')).toEqual([{ prefix: '/portal/stations', percent: 0 }])
  })
})

describe('bucketOf', () => {
  it('is deterministic and within 0-99', () => {
    expect(bucketOf('session-a')).toBe(bucketOf('session-a'))
    for (const key of ['', 'a', 'b', 'c', 'legacy-1']) {
      expect(bucketOf(key)).toBeGreaterThanOrEqual(0)
      expect(bucketOf(key)).toBeLessThan(100)
    }
  })

  it('spreads keys roughly evenly', () => {
    const below = Array.from({ length: 2000 }, (_, i) => bucketOf(`user-${i}`)).filter((b) => b < 25).length
    expect(below).toBeGreaterThan(400)
    expect(below).toBeLessThan(600)
  })
})

describe('routedToLegacy', () => {
  const rules = parseRollout('/portal/invoices=0,/portal/sessions=100,/portal/stations=50')

  it('percent 0 is a kill switch: everybody goes to legacy, including sub-paths', () => {
    expect(routedToLegacy('/portal/invoices', rules, 'any')).toBe(true)
    expect(routedToLegacy('/portal/invoices/inv-1/dispute', rules, 'any')).toBe(true)
  })

  it('percent 100 and unlisted routes stay on Nuxt', () => {
    expect(routedToLegacy('/portal/sessions', rules, 'any')).toBe(false)
    expect(routedToLegacy('/login', rules, 'any')).toBe(false)
  })

  it('does not match a path that only shares a string prefix', () => {
    expect(routedToLegacy('/portal/invoices-archive', rules, 'any')).toBe(false)
  })

  it('a partial rollout is sticky per user and splits users', () => {
    const decisions = Array.from({ length: 400 }, (_, i) => routedToLegacy('/portal/stations', rules, `u${i}`))
    expect(decisions).toEqual(Array.from({ length: 400 }, (_, i) => routedToLegacy('/portal/stations', rules, `u${i}`)))
    const legacyShare = decisions.filter(Boolean).length / decisions.length
    expect(legacyShare).toBeGreaterThan(0.35)
    expect(legacyShare).toBeLessThan(0.65)
  })

  it('the longest matching prefix wins', () => {
    const nested = parseRollout('/portal/invoices=100,/portal/invoices/inv-9=0')
    expect(routedToLegacy('/portal/invoices/inv-9', nested, 'k')).toBe(true)
    expect(routedToLegacy('/portal/invoices/inv-1', nested, 'k')).toBe(false)
  })
})

describe('legacyPrefixesFor', () => {
  it('lists the prefixes this user is routed to legacy for (the client uses it to force full page loads)', () => {
    const rules = parseRollout('/portal/invoices=0,/portal/sessions=100')
    expect(legacyPrefixesFor(rules, 'k')).toEqual(['/portal/invoices'])
  })
})
