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
  for (const locale of ['de', 'en'] as const) {
    for (const width of [320, 390, 650, 1280] as const) {
      for (const count of [0, 1, 12, 480] as const) test(`reserves the header width (${locale}, ${width}px, ${count} items)`, async ({ page, baseURL }) => {
        if (!baseURL) throw new Error('Playwright baseURL is required to seed the locale cookie')
        await page.setViewportSize({ width, height: 900 })
        await page.context().addCookies([{ name: 'i18n_locale', value: locale, url: baseURL }])
        const items = Array.from({ length: Math.ceil(count / 10) }, (_, index) => ({
          slug: `geometry-${index}`,
          name: `Geometry ${index}`,
          priceCents: 100,
          quantity: Math.min(10, count - index * 10),
        }))
        await page.addInitScript((seededItems) => {
          localStorage.setItem('charge-portal-cart', JSON.stringify(seededItems))
        }, items)

        let resumeScripts: (() => void) | undefined
        let notifyScriptPause: (() => void) | undefined
        let holdScripts = true
        const scriptsResumed = new Promise<void>((resolve) => { resumeScripts = resolve })
        const scriptPaused = new Promise<void>((resolve) => { notifyScriptPause = resolve })
        await page.route('**/_nuxt/**', async (route) => {
          if (route.request().resourceType() === 'script' && holdScripts) {
            notifyScriptPause?.()
            await scriptsResumed
          }
          await route.continue()
        })

        const headerGeometry = () => page.evaluate(() => {
          const bounds = (selector: string) => {
            const rect = document.querySelector(selector)?.getBoundingClientRect()
            if (!rect) throw new Error(`Missing header geometry target: ${selector}`)
            return [rect.x, rect.y, rect.width, rect.height].map((value) => Number(value.toFixed(2)))
          }
          return {
            tools: bounds('.app-header .tools'),
            cart: bounds('.app-header .tools a[href="/shop/cart"]'),
            locale: bounds('.app-header .lang'),
            scrollWidth: document.documentElement.scrollWidth,
          }
        })

        try {
          await page.goto('/shop/ladekabel-typ-1-10-m', { waitUntil: 'commit' })
          await expect(page.locator('.app-header .tools')).toBeVisible()
          await scriptPaused
          await page.waitForFunction(() => {
            const stylesheets = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
            return stylesheets.length > 0 && stylesheets.every((stylesheet) => stylesheet.sheet)
          })
          await expect(page.locator('html')).toHaveAttribute('lang', locale)
          await expect(page.locator('html')).not.toHaveAttribute('data-hydrated', '')
          const beforeHydration = await headerGeometry()

          holdScripts = false
          resumeScripts?.()
          await expect(page.locator('html')).toHaveAttribute('data-hydrated', '', { timeout: 15_000 })
          const countLabel = locale === 'de' ? `(${count} Artikel)` : `(${count} items)`
          await expect(page.getByRole('link', { name: `${locale === 'de' ? 'Warenkorb' : 'Cart'} ${countLabel}` })).toBeVisible({ timeout: 15_000 })
          const afterHydration = await headerGeometry()

          expect(afterHydration).toEqual(beforeHydration)
          expect(afterHydration.scrollWidth).toBeLessThanOrEqual(width)
        } finally {
          resumeScripts?.()
          await page.unroute('**/_nuxt/**')
        }
      })
    }
  }

  test('supports the complete cart journey with a keyboard and persists the item', async ({ page, request }) => {
    const product = await loadFirstPageProduct(request)
    const expectedTotal = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
      .format(product.priceCents * 3 / 100)

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

    await page.evaluate(() => {
      const region = document.querySelector('[role="status"]')
      if (!(region instanceof HTMLElement)) throw new Error('product status region is missing')
      const values: string[] = []
      ;(window as typeof window & { __announcementMutations?: string[] }).__announcementMutations = values
      new MutationObserver(() => values.push(region.textContent ?? ''))
        .observe(region, { childList: true, characterData: true, subtree: true })
    })

    await page.keyboard.press('Space')
    await expect(addButton).toBeFocused()
    await expect.poll(() => page.evaluate(() => (
      (window as typeof window & { __announcementMutations?: string[] }).__announcementMutations
    ))).toEqual(['', 'Zum Warenkorb hinzugefügt'])
    await expect(page.getByRole('link', { name: /Warenkorb.*2 Artikel/ })).toBeVisible()

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')
    const cartLink = page.getByRole('link', { name: /Warenkorb.*2 Artikel/ })
    await tabTo(page, cartLink)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL('/shop/cart')

    const quantity = page.getByLabel(`Menge ${product.name}`)
    await tabTo(page, quantity)
    await page.keyboard.press('Control+A')
    await page.keyboard.type('3')
    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: /Warenkorb.*3 Artikel/ })).toBeVisible()
    await expect(page.getByText(expectedTotal, { exact: true })).toBeVisible()

    await page.getByLabel('Sprache').selectOption('en')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('link', { name: 'Cart (3 items)' })).toBeVisible()
    await page.getByLabel('Language').selectOption('de')
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    await expect(page.getByRole('link', { name: /Warenkorb.*3 Artikel/ })).toBeVisible()

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
