import { describe, expect, it } from 'vitest'
import {
  normalizeRoute,
  type VitalsBeacon,
  vitalsBeaconSchema,
} from '../../shared/contracts/vitals'
import { createVitalsStore, percentile } from '../../server/utils/vitals-store'

const beacon = (overrides: Partial<VitalsBeacon> = {}): VitalsBeacon => ({
  route: '/shop/wallbox-home-11',
  name: 'LCP',
  value: 1_800,
  rating: 'good',
  id: 'metric-1',
  navigationType: 'navigate',
  attribution: { target: 'main img' },
  ...overrides,
})

describe('vitalsBeaconSchema', () => {
  it('accepts a valid shop beacon', () => {
    expect(vitalsBeaconSchema.parse(beacon())).toEqual(beacon())
  })

  it.each([
    ['a negative value', { value: -1 }],
    ['an unknown metric', { name: 'FID' }],
    ['a route outside the shop', { route: '/portal/stations' }],
    ['an ambiguous route prefix', { route: '/shopper/product' }],
    ['an oversized route', { route: `/shop/${'x'.repeat(195)}` }],
    ['an oversized id', { id: 'x'.repeat(65) }],
    ['an oversized attribution target', { attribution: { target: 'x'.repeat(201) } }],
  ])('rejects %s', (_description, overrides) => {
    expect(vitalsBeaconSchema.safeParse(beacon(overrides as Partial<VitalsBeacon>)).success).toBe(false)
  })

  it('applies the metric-specific value ceilings', () => {
    expect(vitalsBeaconSchema.safeParse(beacon({ name: 'CLS', value: 10 })).success).toBe(true)
    expect(vitalsBeaconSchema.safeParse(beacon({ name: 'CLS', value: 10.01 })).success).toBe(false)
    expect(vitalsBeaconSchema.safeParse(beacon({ value: 120_000 })).success).toBe(true)
    expect(vitalsBeaconSchema.safeParse(beacon({ value: 120_001 })).success).toBe(false)
  })
})

describe('normalizeRoute', () => {
  it.each([
    ['/shop/wallbox-home-11', '/shop/:slug'],
    ['/shop/c/wallboxes?connector=ccs', '/shop/c/:category'],
    ['/shop/cart?source=header', '/shop/cart'],
    ['/shop?campaign=demo', '/shop'],
  ])('normalizes %s to %s', (route, expected) => {
    expect(normalizeRoute(route)).toBe(expected)
  })
})

describe('percentile', () => {
  it('uses nearest-rank on sorted and unsorted values', () => {
    expect(percentile([4, 1, 3, 2], 0.75)).toBe(3)
    expect(percentile([10, 20, 30], 0.75)).toBe(30)
  })

  it('returns null for an empty sample', () => {
    expect(percentile([], 0.75)).toBeNull()
  })

  it('rejects percentiles outside the nearest-rank domain', () => {
    expect(() => percentile([1], 0)).toThrow(RangeError)
    expect(() => percentile([1], 1.01)).toThrow(RangeError)
  })
})

describe('createVitalsStore', () => {
  it('requires a positive integer capacity', () => {
    expect(() => createVitalsStore({ capacity: 0 })).toThrow(RangeError)
    expect(() => createVitalsStore({ capacity: 1.5 })).toThrow(RangeError)
  })

  it('drops the oldest beacon when the ring buffer reaches capacity', () => {
    const store = createVitalsStore({ capacity: 2 })

    store.add(beacon({ route: '/shop/cart', value: 100 }))
    store.add(beacon({ route: '/shop/c/wallboxes', value: 200 }))
    store.add(beacon({ route: '/shop/wallbox-home-11', value: 300 }))

    const summary = store.summary()
    expect(summary['/shop/cart']).toBeUndefined()
    expect(summary['/shop/c/:category']?.LCP?.count).toBe(1)
    expect(summary['/shop/:slug']?.LCP?.count).toBe(1)
  })

  it('summarizes p75 and rating counts per normalized route and metric', () => {
    const store = createVitalsStore()

    store.add(beacon({ route: '/shop/one', value: 400, rating: 'poor' }))
    store.add(beacon({ route: '/shop/two', value: 100, rating: 'good' }))
    store.add(beacon({ route: '/shop/three', value: 300, rating: 'needs-improvement' }))
    store.add(beacon({ route: '/shop/four', value: 200, rating: 'good' }))
    store.add(beacon({ route: '/shop/four', name: 'CLS', value: 0.08, rating: 'good' }))

    expect(store.summary()).toEqual({
      '/shop/:slug': {
        LCP: {
          p75: 300,
          count: 4,
          good: 2,
          needsImprovement: 1,
          poor: 1,
        },
        CLS: {
          p75: 0.08,
          count: 1,
          good: 1,
          needsImprovement: 0,
          poor: 0,
        },
      },
    })
  })
})
