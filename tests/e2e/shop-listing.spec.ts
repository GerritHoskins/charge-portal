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

  test('filters to CCS from page 2, resets pagination, and keeps state in the URL', async ({ page }) => {
    await page.goto('/shop/c/wallboxes?page=2')
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')

    await page.getByLabel('Anschlusstyp').selectOption('ccs')

    await expect(page).toHaveURL(/\/shop\/c\/wallboxes\?connector=ccs$/)
    await expect(page.getByRole('status')).toHaveText('2 Produkte angezeigt')
    const cards = page.getByRole('list', { name: 'Produkte' }).getByRole('listitem')
    await expect(cards).toHaveCount(2)
    for (const card of await cards.all()) await expect(card).toContainText('CCS')
  })

  test('minimum power hides every product below 22 kW', async ({ page }) => {
    await page.goto('/shop/c/wallboxes')
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')
    const all = await (await page.request.get('/api/shop/listing/wallboxes?limit=48')).json()
    const belowMinimum = all.items
      .filter((product: { customFields: { powerKw?: number } }) => (product.customFields.powerKw ?? 0) < 22)
      .map((product: { name: string }) => product.name)

    await page.getByLabel('Mindestleistung (kW)').fill('22')

    await expect(page).toHaveURL(/\/shop\/c\/wallboxes\?minPower=22$/)
    await expect(page.getByRole('status')).toHaveText('10 Produkte angezeigt')
    const shown = await page.getByRole('list', { name: 'Produkte' }).getByRole('link').allTextContents()
    expect(shown.length).toBeGreaterThan(0)
    expect(belowMinimum.length).toBeGreaterThan(0)
    for (const name of belowMinimum) expect(shown).not.toContain(name)
  })

  test('sorts prices descending', async ({ page }) => {
    await page.goto('/shop/c/wallboxes')
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')
    const listingResponse = page.waitForResponse((response) => response.url().includes('/api/shop/listing/wallboxes') && response.url().includes('order=price-desc'))

    await page.getByLabel('Sortierung').selectOption('price-desc')

    await expect(page).toHaveURL(/\/shop\/c\/wallboxes\?order=price-desc$/)
    await listingResponse
    const prices = page.getByRole('list', { name: 'Produkte' }).locator('.product-card__price')
    const first = Number((await prices.nth(0).textContent())?.replace(/\D/g, ''))
    const second = Number((await prices.nth(1).textContent())?.replace(/\D/g, ''))
    expect(first).toBeGreaterThanOrEqual(second)
  })

  test('server-renders a direct filtered and sorted URL without JavaScript', async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      locale: 'de-DE',
      baseURL: String(testInfo.project.use.baseURL),
    })
    const page = await context.newPage()

    try {
      await page.goto('/shop/c/wallboxes?connector=ccs&order=price-asc')

      expect(await page.locator('html').getAttribute('data-hydrated')).toBeNull()
      const cards = page.getByRole('list', { name: 'Produkte' }).getByRole('listitem')
      await expect(cards).toHaveCount(2)
      for (const card of await cards.all()) await expect(card).toContainText('CCS')
      const prices = cards.locator('.product-card__price')
      const first = Number((await prices.nth(0).textContent())?.replace(/\D/g, ''))
      const second = Number((await prices.nth(1).textContent())?.replace(/\D/g, ''))
      expect(first).toBeLessThanOrEqual(second)
    } finally {
      await context.close()
    }
  })

  test('supports keyboard-only connector filtering and announces the new count', async ({ page }) => {
    await page.goto('/shop/c/wallboxes')
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')
    const connector = page.getByLabel('Anschlusstyp')

    for (let tabs = 0; tabs < 12 && !(await connector.evaluate((element) => element === document.activeElement)); tabs += 1) {
      await page.keyboard.press('Tab')
    }
    await expect(connector).toBeFocused()
    await page.keyboard.press('ArrowDown')

    await expect(page).toHaveURL(/\/shop\/c\/wallboxes\?connector=ccs$/)
    await expect(page.getByRole('status')).toHaveText('2 Produkte angezeigt')
  })

  test('has no detectable WCAG 2.2 AA violations with a filter applied', async ({ page }) => {
    await page.goto('/shop/c/wallboxes?connector=ccs')

    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
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
