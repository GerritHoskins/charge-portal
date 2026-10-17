import AxeBuilder from '@axe-core/playwright'
import { expect, test, type APIRequestContext } from '@playwright/test'
import type { ShopListing, ShopProduct } from '../../shared/contracts/catalog'

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

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

test.describe('public shop product page', () => {
  test('renders product details, the cart action, and eight same-category related products', async ({ page, request }) => {
    const listing = await loadCategory(request)
    const product = requireProduct(listing, ({ inStock, customFields }) => (
      inStock && typeof customFields.powerKw === 'number' && typeof customFields.connectorType === 'string'
    ))
    const expectedPrice = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
      .format(product.priceCents / 100)

    await page.goto(`/shop/${product.slug}`)

    await expect(page.getByRole('heading', { level: 1, name: product.name })).toBeVisible()
    await expect(page.getByText(expectedPrice, { exact: true })).toBeVisible()
    await expect(page.locator('#product-stock')).toHaveText('Auf Lager')
    await expect(page.getByRole('heading', { level: 2, name: 'Technische Daten' })).toBeVisible()
    await expect(page.getByText(`${String(product.customFields.powerKw)} kW`, { exact: true })).toBeVisible()
    await expect(page.getByText(String(product.customFields.connectorType), { exact: true })).toBeVisible()
    await expect(page.getByText('Ladekarten, Wallboxen, Kabel und Adapter', { exact: true })).toBeVisible()
    await expect(page.getByRole('img', { name: product.name })).toHaveAttribute('src', product.image.url)
    await expect(page.getByRole('button', { name: 'In den Warenkorb' })).toBeEnabled()

    const related = page.getByRole('list', { name: 'Produkte' })
    await expect(related.getByRole('listitem')).toHaveCount(8)
    await expect(related.getByRole('link', { name: product.name })).toHaveCount(0)
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
