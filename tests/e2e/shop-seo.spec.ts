import { expect, test, type APIResponse } from '@playwright/test'
import type { ShopListing, ShopProduct } from '../../shared/contracts/catalog'

const requireProduct = async (response: APIResponse): Promise<ShopProduct> => {
  expect(response.ok()).toBe(true)
  const listing = await response.json() as ShopListing
  const product = listing.items[0]
  expect(product).toBeDefined()
  return product as ShopProduct
}

const canonicalHref = (html: string): string | undefined => (
  html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"[^>]*>/)?.[1]
)

test.describe('public shop SSR metadata', () => {
  test('renders product SEO metadata and parsable Product JSON-LD', async ({ page }) => {
    const product = await requireProduct(await page.request.get('/api/shop/listing/wallboxes?limit=1'))
    const response = await page.request.get(`/shop/${product.slug}`)
    expect(response.ok()).toBe(true)
    const html = await response.text()
    const pageUrl = new URL(response.url())

    expect(html).toContain(`<title>${product.name} – Charge Portal</title>`)
    expect(html).toMatch(/<meta[^>]*name="description"[^>]*content="[^"]+"[^>]*>/)
    expect(canonicalHref(html)).toBe(`${pageUrl.origin}/shop/${product.slug}`)

    const jsonLd = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)]
      .map((match) => JSON.parse(match[1] ?? '') as Record<string, unknown>)
    const productLd = jsonLd.find((value) => value['@type'] === 'Product')
    expect(productLd).toBeDefined()
    const offers = productLd?.offers as Record<string, unknown>
    expect(offers.price).toBe((product.priceCents / 100).toFixed(2))
    expect(productLd?.url).toBe(`${pageUrl.origin}/shop/${product.slug}`)
  })

  test('canonicalizes listing filters away and retains only later page numbers', async ({ page }) => {
    const filtered = await page.request.get('/shop/c/wallboxes?connector=ccs&order=price-desc')
    const filteredHtml = await filtered.text()
    const origin = new URL(filtered.url()).origin
    expect(canonicalHref(filteredHtml)).toBe(`${origin}/shop/c/wallboxes`)

    const laterPage = await page.request.get('/shop/c/wallboxes?page=2&connector=ccs&order=price-desc')
    const laterHtml = await laterPage.text()
    expect(canonicalHref(laterHtml)).toBe(`${origin}/shop/c/wallboxes?page=2`)
    expect(laterHtml).not.toContain('hreflang=')
  })
})
