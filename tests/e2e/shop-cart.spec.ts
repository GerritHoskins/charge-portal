import AxeBuilder from '@axe-core/playwright'
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test'
import type { ShopListing, ShopProduct } from '../../shared/contracts/catalog'

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const loadFirstPageProduct = async (request: APIRequestContext): Promise<ShopProduct> => {
  const response = await request.get('/api/shop/listing/wallboxes?limit=12')
  expect(response.ok()).toBe(true)
  const listing = await response.json() as ShopListing
  const product = listing.items.find(({ inStock }) => inStock)
  expect(product, 'expected an in-stock product on the first listing page').toBeDefined()
  return product as ShopProduct
}

const tabTo = async (page: Page, target: Locator, maximumTabs = 40) => {
  for (let tabs = 0; tabs < maximumTabs; tabs += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return
    await page.keyboard.press('Tab')
  }
  await expect(target).toBeFocused()
}

test.describe('client-side shop cart', () => {
  test('supports the complete cart journey with a keyboard and persists the item', async ({ page, request }) => {
    const product = await loadFirstPageProduct(request)
    const expectedTotal = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
      .format(product.priceCents * 2 / 100)

    await page.goto('/shop/c/wallboxes')
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')

    const productLink = page.getByRole('link', { name: product.name })
    await tabTo(page, productLink)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(`/shop/${product.slug}`)
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')

    const addButton = page.getByRole('button', { name: 'In den Warenkorb' })
    await tabTo(page, addButton)
    await page.keyboard.press('Space')
    await expect(addButton).toBeFocused()
    await expect(page.getByRole('status')).toHaveText('Zum Warenkorb hinzugefügt')
    await expect(page.getByRole('link', { name: /Warenkorb.*1 Artikel/ })).toBeVisible()

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')
    const cartLink = page.getByRole('link', { name: /Warenkorb.*1 Artikel/ })
    await tabTo(page, cartLink)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL('/shop/cart')

    const quantity = page.getByLabel(`Menge ${product.name}`)
    await tabTo(page, quantity)
    await page.keyboard.press('Control+A')
    await page.keyboard.type('2')
    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: /Warenkorb.*2 Artikel/ })).toBeVisible()
    await expect(page.getByText(expectedTotal, { exact: true })).toBeVisible()

    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])

    const remove = page.getByRole('button', { name: `${product.name} entfernen` })
    await tabTo(page, remove)
    await page.keyboard.press('Enter')

    await expect(page.getByText('Der Warenkorb ist leer.')).toBeVisible()
    await expect(page.getByRole('link', { name: /Warenkorb.*0 Artikel/ })).toBeVisible()
  })

  test('has no detectable WCAG 2.2 AA violations when empty', async ({ page }) => {
    await page.goto('/shop/cart')
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')
    await expect(page.getByText('Der Warenkorb ist leer.')).toBeVisible()

    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })
})
