import { z } from 'zod'

export const shopEventTypeSchema = z.enum(['listing_view', 'product_view', 'add_to_cart'])

export const shopEventSchema = z.object({
  type: shopEventTypeSchema,
  route: z.string().max(200).refine(
    (route) => /^\/shop(?:[/?#]|$)/.test(route),
    { message: 'Route must be a shop path' },
  ),
  tabId: z.string().min(1).max(64),
})

export type ShopEventType = z.infer<typeof shopEventTypeSchema>
export type ShopEvent = z.infer<typeof shopEventSchema>

export interface FunnelSummary {
  listingViews: number
  productViews: number
  addToCarts: number
  viewToProductRate: number | null
  productToCartRate: number | null
}

export const funnel = (events: readonly ShopEvent[]): FunnelSummary => {
  let listingViews = 0
  let productViews = 0
  let addToCarts = 0
  const listingTabs = new Set<string>()
  const productTabs = new Set<string>()
  const viewToProductTabs = new Set<string>()
  const productToCartTabs = new Set<string>()
  const reachedListing = new Set<string>()
  const reachedProduct = new Set<string>()

  for (const event of events) {
    if (event.type === 'listing_view') {
      listingViews += 1
      listingTabs.add(event.tabId)
      reachedListing.add(event.tabId)
      continue
    }

    if (event.type === 'product_view') {
      productViews += 1
      productTabs.add(event.tabId)
      if (reachedListing.has(event.tabId)) viewToProductTabs.add(event.tabId)
      reachedProduct.add(event.tabId)
      continue
    }

    addToCarts += 1
    if (reachedProduct.has(event.tabId)) productToCartTabs.add(event.tabId)
  }

  // Counts are raw event totals. Each conversion numerator counts a tab once only when the
  // next step occurs later in this event sequence; an out-of-order step never backfills it.
  return {
    listingViews,
    productViews,
    addToCarts,
    viewToProductRate: listingTabs.size === 0 ? null : viewToProductTabs.size / listingTabs.size,
    productToCartRate: productTabs.size === 0 ? null : productToCartTabs.size / productTabs.size,
  }
}
