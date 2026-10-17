import { describe, expect, it } from 'vitest'
import { funnel, shopEventSchema, type ShopEvent } from '../../shared/contracts/events'

const event = (type: ShopEvent['type'], tabId: string): ShopEvent => ({
  type,
  route: type === 'listing_view' ? '/shop/c/wallboxes' : '/shop/wallbox-home-7-4',
  tabId,
})

describe('shopEventSchema', () => {
  it('accepts the three bounded shop funnel events', () => {
    for (const type of ['listing_view', 'product_view', 'add_to_cart'] as const) {
      expect(shopEventSchema.safeParse(event(type, 'tab-1')).success).toBe(true)
    }
  })

  it('rejects unsupported event types, non-shop routes, and oversized tab ids', () => {
    expect(shopEventSchema.safeParse({ ...event('listing_view', 'tab-1'), type: 'checkout' }).success).toBe(false)
    expect(shopEventSchema.safeParse({ ...event('product_view', 'tab-1'), route: '/portal/stations' }).success).toBe(false)
    expect(shopEventSchema.safeParse(event('add_to_cart', 'x'.repeat(65))).success).toBe(false)
  })
})

describe('funnel', () => {
  it('counts events while conversion rates use distinct tabs in event order', () => {
    const summary = funnel([
      event('listing_view', 'tab-a'),
      event('product_view', 'tab-a'),
      event('add_to_cart', 'tab-a'),
      event('product_view', 'tab-a'),
      event('add_to_cart', 'tab-a'),
      event('listing_view', 'tab-b'),
      event('product_view', 'tab-b'),
      event('product_view', 'tab-c'),
      event('add_to_cart', 'tab-c'),
      event('add_to_cart', 'tab-d'),
    ])

    expect(summary).toEqual({
      listingViews: 2,
      productViews: 4,
      addToCarts: 4,
      viewToProductRate: 1,
      productToCartRate: 2 / 3,
    })
  })

  it('counts an add without a preceding product view but excludes it from conversion', () => {
    expect(funnel([
      event('listing_view', 'tab-a'),
      event('add_to_cart', 'tab-a'),
      event('product_view', 'tab-a'),
    ])).toEqual({
      listingViews: 1,
      productViews: 1,
      addToCarts: 1,
      viewToProductRate: 1,
      productToCartRate: 0,
    })
  })

  it('returns null rates when their denominators are zero', () => {
    expect(funnel([])).toEqual({
      listingViews: 0,
      productViews: 0,
      addToCarts: 0,
      viewToProductRate: null,
      productToCartRate: null,
    })

    expect(funnel([event('add_to_cart', 'tab-a')])).toMatchObject({
      addToCarts: 1,
      viewToProductRate: null,
      productToCartRate: null,
    })
  })
})
