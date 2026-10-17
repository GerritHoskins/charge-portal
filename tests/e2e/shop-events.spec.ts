import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import type { ShopListing, ShopProduct } from '../../shared/contracts/catalog'
import type { FunnelSummary } from '../../shared/contracts/events'

const loadInStockProduct = async (request: APIRequestContext): Promise<ShopProduct> => {
  const response = await request.get('/api/shop/listing/wallboxes?limit=12')
  expect(response.ok()).toBe(true)
  const listing = await response.json() as ShopListing
  const product = listing.items.find(({ inStock }) => inStock)
  expect(product, 'expected an in-stock product on the first listing page').toBeDefined()
  return product as ShopProduct
}

const waitForShopEvent = (page: Page, type: string) => page.waitForResponse((response) => {
  if (!response.url().endsWith('/api/events') || response.request().method() !== 'POST') return false
  const body = response.request().postData()
  if (!body) return false
  try {
    return (JSON.parse(body) as { type?: string }).type === type
  } catch {
    return false
  }
})

test('records a complete shop funnel in one fresh tab', async ({ page, request }) => {
  const product = await loadInStockProduct(request)
  const listingEvent = waitForShopEvent(page, 'listing_view')
  await page.goto('/shop/c/wallboxes')
  await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')
  expect((await listingEvent).status()).toBe(204)

  const productEvent = waitForShopEvent(page, 'product_view')
  await page.getByRole('link', { name: new RegExp(product.name) }).click()
  await expect(page.getByRole('heading', { level: 1, name: product.name })).toBeVisible()
  expect((await productEvent).status()).toBe(204)

  const cartEvent = waitForShopEvent(page, 'add_to_cart')
  await page.getByRole('button', { name: 'In den Warenkorb' }).click()
  expect((await cartEvent).status()).toBe(204)

  await expect.poll(async () => {
    const response = await request.get('/api/events/funnel')
    if (!response.ok()) return null
    return response.json() as Promise<FunnelSummary>
  }).toMatchObject({
    listingViews: expect.any(Number),
    productViews: expect.any(Number),
    addToCarts: expect.any(Number),
  })

  const response = await request.get('/api/events/funnel')
  expect(response.ok()).toBe(true)
  const summary = await response.json() as FunnelSummary
  expect(summary.listingViews).toBeGreaterThanOrEqual(1)
  expect(summary.productViews).toBeGreaterThanOrEqual(1)
  expect(summary.addToCarts).toBeGreaterThanOrEqual(1)
  expect(summary.viewToProductRate ?? 0).toBeGreaterThan(0)
  expect(summary.productToCartRate ?? 0).toBeGreaterThan(0)
})
