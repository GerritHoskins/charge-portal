import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// 320 px is the WCAG 1.4.10 reflow reference width; 375 px is a common phone.
const WIDTHS = [320, 375]
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

// The page itself must never scroll sideways. Wide content (tables) scrolls inside its own region.
const pageOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

for (const width of WIDTHS) {
  test.describe(`mobile ${width}px (signed in)`, () => {
    test.use({ viewport: { width, height: 700 } })

    for (const path of ['/portal/stations', '/portal/sessions', '/portal/invoices']) {
      test(`${path} does not scroll sideways and passes axe`, async ({ page }) => {
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        expect(await pageOverflow(page)).toBeLessThanOrEqual(0)
        const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
        expect(results.violations).toEqual([])
      })
    }

    test('wide tables scroll inside a focusable, named region', async ({ page }) => {
      await page.goto('/portal/stations')
      const region = page.getByRole('region', { name: /Ladestationen/ })
      await expect(region).toBeVisible()
      await region.focus()
      await expect(region).toBeFocused()
    })

    test('the header stays compact so content starts above the fold', async ({ page }) => {
      await page.goto('/portal/stations')
      const box = await page.locator('header.app-header').boundingBox()
      expect(box!.height).toBeLessThanOrEqual(190)
    })

    test('header controls stay reachable and large enough to tap', async ({ page }) => {
      await page.goto('/portal/stations')
      for (const control of [page.getByRole('button', { name: 'Abmelden' }), page.getByLabel('Sprache')]) {
        const box = await control.boundingBox()
        expect(box!.height).toBeGreaterThanOrEqual(44)
        expect(box!.x + box!.width).toBeLessThanOrEqual(width)
      }
    })
  })

  test.describe(`mobile ${width}px (signed out)`, () => {
    test.use({ viewport: { width, height: 700 }, storageState: { cookies: [], origins: [] } })

    test('login fits, fields and button are at least 44px tall, axe is clean', async ({ page }) => {
      await page.goto('/login')
      expect(await pageOverflow(page)).toBeLessThanOrEqual(0)
      for (const control of [page.getByLabel('Benutzername'), page.getByLabel('Passwort'), page.getByRole('button', { name: 'Anmelden' })]) {
        expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      }
      const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
      expect(results.violations).toEqual([])
    })

    test('input text is at least 16px so iOS does not zoom on focus', async ({ page }) => {
      await page.goto('/login')
      const size = await page.getByLabel('Benutzername').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
      expect(size).toBeGreaterThanOrEqual(16)
    })
  })
}
