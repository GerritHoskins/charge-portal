import AxeBuilder from '@axe-core/playwright'
import { expect, test, type APIRequestContext } from '@playwright/test'
import { parse as parseDevalue } from 'devalue'
import type { ShopListing, ShopProduct } from '../../shared/contracts/catalog'

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const nuxtPayloadRevivers = {
  ShallowReactive: (data: unknown) => data,
  Reactive: (data: unknown) => data,
  ShallowRef: (data: unknown) => data,
  Ref: (data: unknown) => data,
}

const loadCategory = async (request: APIRequestContext, category = 'wallboxes'): Promise<ShopListing> => {
  const response = await request.get(`/api/shop/listing/${category}?limit=48`)
  expect(response.ok()).toBe(true)
  return response.json() as Promise<ShopListing>
}

const requireProduct = (listing: ShopListing, predicate: (product: ShopProduct) => boolean): ShopProduct => {
  const product = listing.items.find(predicate)
  expect(product, 'expected the synthetic catalogue to contain a matching product').toBeDefined()
  return product as ShopProduct
}

const loadNuxtPayload = async (request: APIRequestContext, path: string, expectedStatus = 200): Promise<unknown> => {
  const response = await request.get(path)
  expect(response.status()).toBe(expectedStatus)
  const html = await response.text()
  const script = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  expect(script, 'expected SSR Nuxt hydration data').not.toBeNull()
  const source = script?.[0].match(/data-src="([^"]+)"/)?.[1]
  if (!html.includes('/_nuxt/@vite/client')) {
    expect(source, 'production must externalize the Nuxt payload').toBeDefined()
  }
  const body = source
    ? await request.get(source).then(async (payload) => {
        expect([200, expectedStatus]).toContain(payload.status())
        return payload.text()
      })
    : script?.[1] ?? ''

  return parseDevalue(body, nuxtPayloadRevivers)
}

const isPayloadRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const collectPayloadRecords = (value: unknown, seen = new WeakSet<object>(), records: Record<string, unknown>[] = []) => {
  if (typeof value !== 'object' || value === null || seen.has(value)) return records
  seen.add(value)
  if (isPayloadRecord(value)) {
    records.push(value)
    Object.values(value).forEach((child) => collectPayloadRecords(child, seen, records))
  } else if (Array.isArray(value)) {
    value.forEach((child) => collectPayloadRecords(child, seen, records))
  }
  return records
}

test.describe('public shop product page', () => {
  test('does not serialize product or related records for a missing product', async ({ request }) => {
    const payload = await loadNuxtPayload(request, '/shop/not-a-product', 404)
    const products = collectPayloadRecords(payload).filter((record) => (
      typeof record.slug === 'string' && typeof record.priceCents === 'number'
    ))

    expect(products).toEqual([])
  })

  test('serializes a narrow detail and eight rendered related products', async ({ request }) => {
    const listing = await loadCategory(request)
    const product = requireProduct(listing, ({ maxPowerKw, connectorType }) => (
      maxPowerKw !== null && connectorType !== null
    ))
    const payload = await loadNuxtPayload(request, `/shop/${product.slug}`)
    const records = collectPayloadRecords(payload)
    const products = records.filter((record) => (
      typeof record.slug === 'string' && typeof record.priceCents === 'number'
    ))
    const detail = products.find((record) => 'description' in record)
    const related = products.filter((record) => 'id' in record)

    expect(products).toHaveLength(9)
    expect(detail).toBeDefined()
    if (!detail) return
    expect(Object.keys(detail).sort()).toEqual(['connectorType', 'description', 'image', 'inStock', 'maxPowerKw', 'name', 'priceCents', 'slug'])
    expect(typeof detail.description).toBe('string')
    expect((detail.description as string).trim().length).toBeGreaterThan(0)
    expect(detail.maxPowerKw === null || typeof detail.maxPowerKw === 'number').toBe(true)
    expect(isPayloadRecord(detail.image)).toBe(true)
    if (isPayloadRecord(detail.image)) expect(Object.keys(detail.image).sort()).toEqual(['alt', 'height', 'url', 'width'])
    expect(related).toHaveLength(8)
    for (const item of related) {
      expect(Object.keys(item).sort()).toEqual(['id', 'image', 'inStock', 'name', 'priceCents', 'slug'])
    }
    expect(records.some((record) => 'total' in record && 'page' in record && 'limit' in record)).toBe(false)
  })

  test('renders product details, the cart action, and eight same-category related products', async ({ page, request }) => {
    const listing = await loadCategory(request)
    const product = requireProduct(listing, ({ inStock, maxPowerKw, connectorType }) => (
      inStock && maxPowerKw !== null && connectorType === 'ccs'
    ))
    const expectedPrice = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
      .format(product.priceCents / 100)

    await page.goto(`/shop/${product.slug}`)

    await expect(page.getByRole('heading', { level: 1, name: product.name })).toBeVisible()
    await expect(page.getByText(expectedPrice, { exact: true })).toBeVisible()
    await expect(page.locator('#product-stock')).toHaveText('Auf Lager')
    await expect(page.getByRole('heading', { level: 2, name: 'Technische Daten' })).toBeVisible()
    await expect(page.getByText(`${String(product.maxPowerKw)} kW`, { exact: true })).toBeVisible()
    await expect(page.getByText('CCS', { exact: true })).toBeVisible()
    await expect(page.getByText(product.description, { exact: true })).toBeVisible()
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', product.description.slice(0, 155))
    const hero = page.locator('.product-hero')
    await expect(hero).toHaveAttribute('alt', product.image.alt)
    await expect(hero).toHaveAttribute('width', String(product.image.width))
    await expect(hero).toHaveAttribute('height', String(product.image.height))
    await expect(hero).toHaveAttribute('srcset', /\S+/)
    await expect(hero).toHaveAttribute('loading', 'eager')
    await expect(hero).toHaveAttribute('fetchpriority', 'high')
    await expect.poll(() => hero.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
    const ssr = await request.get(`/shop/${product.slug}`)
    expect(ssr.ok()).toBe(true)
    const html = await ssr.text()
    const imagePreload = html.match(/<link\b(?=[^>]*\brel="preload")(?=[^>]*\bas="image")(?=[^>]*\bimagesrcset="([^"]+)")[^>]*>/)
    expect(imagePreload?.[1]?.replaceAll('&amp;', '&')).toBe(await hero.getAttribute('srcset'))
    await expect(page.getByRole('button', { name: 'In den Warenkorb' })).toBeEnabled()

    const related = page.getByRole('list', { name: 'Produkte' })
    await expect(related.getByRole('listitem')).toHaveCount(8)
    for (const image of await related.locator('img').all()) await expect(image).toHaveAttribute('loading', 'lazy')
    await expect(related.getByRole('link', { name: product.name })).toHaveCount(0)
  })

  test('shows precise connector labels and the missing power value for accessory products', async ({ page, request }) => {
    const accessories = await loadCategory(request, 'accessories')
    const expectedLabels = {
      type1: 'Typ 1',
      type2: 'Typ 2',
      ccs: 'CCS',
      cee: 'CEE',
      schuko: 'Schuko',
      mixed: 'Typ 1/Typ 2',
    } as const

    for (const [connectorType, label] of Object.entries(expectedLabels)) {
      const product = requireProduct(accessories, (item) => item.connectorType === connectorType)
      expect(product.maxPowerKw).toBeNull()
      await page.goto(`/shop/${product.slug}`)
      await expect(page.getByRole('heading', { level: 2, name: 'Technische Daten' })).toBeVisible()
      const specs = page.locator('.product-specs dd')
      await expect(specs.nth(0)).toHaveText('—')
      await expect(specs.nth(1)).toHaveText(label)
    }
  })

  test('does not repeat the current product when opened by its stable id', async ({ page, request }) => {
    const listing = await loadCategory(request)
    const product = requireProduct(listing, ({ maxPowerKw, connectorType }) => (
      maxPowerKw !== null && connectorType !== null
    ))

    const productPath = `/shop/${product.id}?wp25-cache-probe=${Date.now()}`
    await page.goto(productPath)

    await expect(page.getByRole('heading', { level: 1, name: product.name })).toBeVisible()
    const related = page.getByRole('list', { name: 'Produkte' })
    await expect(related.getByRole('listitem')).toHaveCount(8)
    await expect(related.getByRole('link', { name: product.name, exact: true })).toHaveCount(0)

    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: product.name })).toBeVisible()
    await expect(related.getByRole('listitem')).toHaveCount(8)
    await expect(related.getByRole('link', { name: product.name, exact: true })).toHaveCount(0)
  })

  test('server-renders related products with native links and no client refetches', async ({ page, request }) => {
    const listing = await loadCategory(request)
    const product = requireProduct(listing, ({ maxPowerKw }) => maxPowerKw !== null)
    const relatedProduct = requireProduct(listing, ({ slug }) => slug !== product.slug)
    const productPath = `/shop/${product.slug}`
    const relatedHref = `/shop/${relatedProduct.slug}`

    const ssr = await request.get(productPath)
    expect(ssr.ok()).toBe(true)
    const html = await ssr.text()
    expect(html).toMatch(new RegExp(`<a\\b[^>]*href="${relatedHref}"`))

    const clientDataRequests: string[] = []
    page.on('request', (browserRequest) => {
      const { pathname } = new URL(browserRequest.url())
      if (pathname.startsWith('/api/shop/products/') || pathname.startsWith('/api/shop/listing/')) {
        clientDataRequests.push(pathname)
      }
    })
    await page.setViewportSize({ width: 390, height: 600 })
    await page.goto(productPath)
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')
    await page.waitForLoadState('networkidle', { timeout: 5_000 })

    const related = page.locator('section[aria-labelledby="related-heading"]')
    await expect(related).toBeVisible()
    const relatedLink = related.getByRole('link', { name: relatedProduct.name, exact: true })
    await expect(relatedLink).toHaveAttribute('href', relatedHref)
    expect(clientDataRequests).toEqual([])
  })

  test('related product labels and formatting follow the selected English locale', async ({ page, request }) => {
    const listing = await loadCategory(request)
    const product = requireProduct(listing, ({ maxPowerKw }) => maxPowerKw !== null)
    const relatedProduct = requireProduct(listing, ({ slug }) => slug !== product.slug)
    const clientDataRequests: string[] = []
    page.on('request', (browserRequest) => {
      const { pathname } = new URL(browserRequest.url())
      if (pathname.startsWith('/api/shop/products/') || pathname.startsWith('/api/shop/listing/')) {
        clientDataRequests.push(pathname)
      }
    })

    await page.setViewportSize({ width: 390, height: 600 })
    await page.goto(`/shop/${product.slug}`)
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')
    await page.getByLabel('Sprache').selectOption('en')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')

    const related = page.locator('section[aria-labelledby="related-heading"]')
    await expect(related).toBeVisible()
    await related.scrollIntoViewIfNeeded()
    await expect(related.getByRole('heading', { level: 2, name: 'Products' })).toBeVisible()
    const relatedLink = related.getByRole('link', { name: relatedProduct.name, exact: true })
    await expect(relatedLink).toHaveAttribute('href', `/shop/${relatedProduct.slug}`)
    const relatedItem = related.locator('li').filter({ hasText: relatedProduct.name })
    const expectedPrice = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' })
      .format(relatedProduct.priceCents / 100)
    await expect(relatedItem.getByText(expectedPrice, { exact: true })).toBeVisible()
    await expect(relatedItem.getByText(relatedProduct.inStock ? 'In stock' : 'Out of stock', { exact: true })).toBeVisible()
    await page.waitForLoadState('networkidle', { timeout: 5_000 })
    expect(clientDataRequests).toEqual([])

    await page.getByLabel('Language').selectOption('de')
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    await expect(related.getByRole('heading', { level: 2, name: 'Produkte' })).toBeVisible()
    const germanPrice = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
      .format(relatedProduct.priceCents / 100)
    await expect(relatedItem.getByText(germanPrice, { exact: true })).toBeVisible()
    await expect(relatedItem.getByText(relatedProduct.inStock ? 'Auf Lager' : 'Nicht auf Lager', { exact: true })).toBeVisible()
    expect(clientDataRequests).toEqual([])
  })

  test('returns a 404 response with a not-found heading for an unknown slug', async ({ page }) => {
    const response = await page.goto('/shop/nicht-vorhandenes-produkt')

    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1, name: 'Produkt nicht gefunden' })).toBeVisible()
  })

  test('provides linked breadcrumb ancestors and marks the product as current', async ({ page, request }) => {
    const product = requireProduct(await loadCategory(request), ({ inStock }) => inStock)
    await page.goto(`/shop/${product.slug}`)

    const breadcrumb = page.getByRole('navigation', { name: 'Brotkrümelnavigation' })
    await expect(breadcrumb.getByRole('link', { name: 'Shop-Startseite' })).toHaveAttribute('href', '/shop')
    await expect(breadcrumb.getByRole('link', { name: 'Wallboxen' })).toHaveAttribute('href', '/shop/c/wallboxes')
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(product.name)

    await breadcrumb.getByRole('link', { name: 'Wallboxen' }).click()
    await expect(page).toHaveURL(/\/shop\/c\/wallboxes$/)
  })

  test('disables the cart action and associates it with the out-of-stock explanation', async ({ page, request }) => {
    const product = requireProduct(await loadCategory(request), ({ inStock }) => !inStock)
    await page.goto(`/shop/${product.slug}`)

    const button = page.getByRole('button', { name: 'In den Warenkorb' })
    await expect(button).toBeDisabled()
    await expect(button).toHaveAttribute('aria-describedby', 'product-stock')
    await expect(page.locator('#product-stock')).toHaveText('Nicht auf Lager')
  })

  test('has no detectable WCAG 2.2 AA violations', async ({ page, request }) => {
    const product = requireProduct(await loadCategory(request), ({ inStock }) => inStock)
    await page.goto(`/shop/${product.slug}`)
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')

    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })

  test('has no detectable WCAG 2.2 AA violations on the 404 state', async ({ page }) => {
    await page.goto('/shop/nicht-vorhandenes-produkt')
    await expect(page.getByRole('heading', { level: 1, name: 'Produkt nicht gefunden' })).toBeVisible()

    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })
})
