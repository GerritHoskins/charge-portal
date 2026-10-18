import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { shopListingSchema } from '../../shared/contracts/catalog'

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

test.describe('public shop listing', () => {
  test('redirects /shop permanently to the wallbox category', async ({ page, request }) => {
    const cart = await request.get('/shop/cart')
    expect(cart.status()).toBe(200)
    const isViteDev = (await cart.text()).includes('/_nuxt/@vite/client')
    const canonical = await request.get('/shop', { maxRedirects: 0 })
    expect(canonical.status()).toBe(301)
    // Nuxt dev canonicalizes the slash first; the built server redirects directly.
    // Both the pre-cache production control and the current build use that direct 301.
    expect(canonical.headers().location).toBe(isViteDev ? '/shop/' : '/shop/c/wallboxes')

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

  test('eagerly loads the first desktop row and lazy-loads images below it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/shop/c/wallboxes')
    const images = page.getByRole('list', { name: 'Produkte' }).locator('img')
    await expect(images).toHaveCount(12)
    await expect(images.nth(0)).toHaveAttribute('loading', 'eager')
    await expect(images.nth(0)).toHaveAttribute('fetchpriority', 'high')
    await expect(images.nth(1)).toHaveAttribute('loading', 'eager')
    await expect(images.nth(1)).not.toHaveAttribute('fetchpriority', 'high')
    await expect(images.nth(2)).toHaveAttribute('loading', 'eager')
    await expect(images.nth(2)).not.toHaveAttribute('fetchpriority', 'high')
    for (let index = 3; index < 12; index += 1) {
      await expect(images.nth(index)).toHaveAttribute('loading', 'lazy')
    }
    await expect.poll(() => images.nth(0).evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
    const desktopBounds = await images.nth(0).evaluate((image) => {
      const card = image.closest('.product-card')
      return { image: image.getBoundingClientRect().toJSON(), card: card?.getBoundingClientRect().toJSON(), pageWidth: document.documentElement.scrollWidth }
    })
    expect(desktopBounds.card).toBeDefined()
    expect(desktopBounds.image.width).toBeGreaterThan(0)
    expect(desktopBounds.image.right).toBeLessThanOrEqual((desktopBounds.card?.right ?? 0) + 1)
    expect(desktopBounds.pageWidth).toBeLessThanOrEqual(1280)

    await page.setViewportSize({ width: 390, height: 844 })
    const mobileBounds = await images.nth(0).evaluate((image) => {
      const card = image.closest('.product-card')
      return { image: image.getBoundingClientRect().toJSON(), card: card?.getBoundingClientRect().toJSON(), pageWidth: document.documentElement.scrollWidth }
    })
    expect(mobileBounds.card).toBeDefined()
    expect(mobileBounds.image.width).toBeGreaterThan(0)
    expect(mobileBounds.image.right).toBeLessThanOrEqual((mobileBounds.card?.right ?? 0) + 1)
    expect(mobileBounds.pageWidth).toBeLessThanOrEqual(390)
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

    const expectedResponse = await page.request.get('/api/shop/listing/wallboxes?limit=12&order=price-desc')
    expect(expectedResponse.status()).toBe(200)
    const expected = shopListingSchema.parse(await expectedResponse.json())
    expect(expected.items).toHaveLength(12)
    const expectedProducts = expected.items.map(({ slug, priceCents }) => ({ slug, priceCents }))
    expect(expectedProducts).toEqual([...expectedProducts].sort((left, right) => right.priceCents - left.priceCents))

    const sortedTransport = page.waitForResponse((response) => {
      const url = new URL(response.url())
      const isListingApi = url.pathname === '/api/shop/listing/wallboxes'
      const isCategoryPayload = url.pathname === '/shop/c/wallboxes/_payload.json'
      return (isListingApi || isCategoryPayload) && url.searchParams.get('order') === 'price-desc'
    })

    await page.getByLabel('Sortierung').selectOption('price-desc')

    await expect(page).toHaveURL(/\/shop\/c\/wallboxes\?order=price-desc$/)
    const transportResponse = await sortedTransport
    expect(transportResponse.status()).toBe(200)

    const cards = page.getByRole('list', { name: 'Produkte' }).getByRole('listitem')
    const readRenderedProducts = () => cards.evaluateAll((elements) => elements.map((element) => {
      const link = element.querySelector('a')
      const price = element.querySelector('.product-card__price')?.textContent ?? ''
      if (!link) throw new Error('Sorted product card has no product link')
      return {
        slug: new URL(link.href).pathname.split('/').at(-1),
        priceCents: Number(price.replace(/\D/g, '')),
      }
    }))
    await expect.poll(readRenderedProducts).toEqual(expectedProducts)
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
