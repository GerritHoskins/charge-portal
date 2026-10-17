import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

test.describe('public shop listing', () => {
  test('redirects /shop permanently to the wallbox category', async ({ page, request }) => {
    const canonical = await request.get('/shop', { maxRedirects: 0 })
    expect(canonical.status()).toBe(301)
    expect(canonical.headers().location).toBe('/shop/')

    const response = await request.get('/shop/', { maxRedirects: 0 })
    expect(response.status()).toBe(301)
    expect(response.headers().location).toBe('/shop/c/wallboxes')

    await page.goto('/shop')
    await expect(page).toHaveURL(/\/shop\/c\/wallboxes$/)
  })

  test('renders a logged-out product-card list with price and textual stock', async ({ page }) => {
    await page.goto('/shop/c/wallboxes')

    await expect(page.getByRole('heading', { level: 1, name: 'Wallboxen' })).toBeVisible()
    await expect(page.getByRole('status')).toHaveText('12 Produkte angezeigt')
    await expect(page.getByRole('link', { name: 'Stationen' })).toHaveCount(0)

    const cards = page.getByRole('list', { name: 'Produkte' }).getByRole('listitem')
    await expect(cards).toHaveCount(12)
    for (const card of await cards.all()) {
      await expect(card.getByRole('link')).toHaveCount(1)
      await expect(card).toContainText('€')
      await expect(card).toContainText(/Auf Lager|Nicht auf Lager/)
    }
  })

  test('loads the second result page from the pagination link', async ({ page }) => {
    await page.goto('/shop/c/wallboxes')
    const firstProduct = await page.getByRole('list', { name: 'Produkte' }).getByRole('link').first().textContent()

    await page.getByRole('link', { name: 'Nächste Seite' }).click()

    await expect(page).toHaveURL(/\/shop\/c\/wallboxes\?page=2$/)
    await expect(page.getByRole('status')).toHaveText('12 Produkte angezeigt')
    await expect(page.getByRole('list', { name: 'Produkte' }).getByRole('listitem')).toHaveCount(12)
    await expect(page.getByRole('list', { name: 'Produkte' }).getByRole('link').first()).not.toHaveText(firstProduct ?? '')
  })

  for (const url of ['/shop/c/wallboxes', '/shop/c/wallboxes?tenant=stadtwerke-demo']) {
    test(`${url} has no detectable WCAG 2.2 AA violations`, async ({ page }) => {
      await page.goto(url)
      await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')

      const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
      expect(results.violations).toEqual([])
    })
  }
})
