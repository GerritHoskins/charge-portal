import { expect, test, type APIRequestContext } from '@playwright/test'
import type { ShopListing, ShopProduct } from '../../shared/contracts/catalog'
import type { VitalsSummary } from '../../server/utils/vitals-store'

const loadInStockProduct = async (request: APIRequestContext): Promise<ShopProduct> => {
  const response = await request.get('/api/shop/listing/wallboxes?limit=12')
  expect(response.ok()).toBe(true)
  const listing = await response.json() as ShopListing
  const product = listing.items.find(({ inStock }) => inStock)
  expect(product, 'expected an in-stock product on the first listing page').toBeDefined()
  return product as ShopProduct
}

test.describe('public shop web vitals', () => {
  test('reports real product-page LCP and CLS beacons after the page is hidden', async ({ page, request }) => {
    const product = await loadInStockProduct(request)
    await page.goto(`/shop/${product.slug}`)
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')

    const addButton = page.getByRole('button', { name: 'In den Warenkorb' })
    await addButton.focus()
    await page.keyboard.press('Space')
    await expect(addButton).toBeFocused()

    await page.goto('about:blank')

    await expect.poll(async () => {
      const response = await request.get('/api/vitals/summary')
      if (!response.ok()) return false
      const summary = await response.json() as VitalsSummary
      const productRoute = summary['/shop/:slug']
      return (productRoute?.LCP?.count ?? 0) >= 1 && (productRoute?.CLS?.count ?? 0) >= 1
    }).toBe(true)
    // INP is intentionally not asserted: headless Chromium does not report it reliably.
  })

  test('rejects malformed text beacons', async ({ request }) => {
    const response = await request.post('/api/vitals', {
      data: 'not-json',
      headers: { 'content-type': 'text/plain' },
    })

    expect(response.status()).toBe(400)
  })

  test('rejects otherwise valid beacons for portal routes', async ({ request }) => {
    const response = await request.post('/api/vitals', {
      data: {
        route: '/portal/stations',
        name: 'LCP',
        value: 1_000,
        rating: 'good',
        id: 'portal-route-must-not-be-recorded',
        navigationType: 'navigate',
      },
    })

    expect(response.status()).toBe(400)
  })
})
