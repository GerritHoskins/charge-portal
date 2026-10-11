import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('migrated route: /portal/stations (Nuxt)', () => {
  test('lists stations from the legacy API through the BFF contract', async ({ page }) => {
    await page.goto('/portal/stations')
    await expect(page.getByRole('heading', { level: 1, name: 'Stationen' })).toBeVisible()
    await expect(page.getByRole('row')).toHaveCount(6) // header + 5 stations
  })

  test('filters by status and announces the result', async ({ page }) => {
    await page.goto('/portal/stations')
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')
    await page.getByLabel('Status').selectOption('faulted')
    await expect(page.getByRole('row')).toHaveCount(2)
    await expect(page.getByRole('status')).toHaveText('1 Stationen angezeigt')
  })

  test('has no WCAG 2.2 AA violations detectable by axe', async ({ page }) => {
    await page.goto('/portal/stations')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })

  test.describe('white-label theming', () => {
    for (const tenant of ['stadtwerke-demo', 'fleet-demo']) {
      test(`tenant ${tenant} stays AA-compliant`, async ({ page }) => {
        await page.goto(`/portal/stations?tenant=${tenant}`)
        await expect(page.locator('html')).toHaveAttribute('data-tenant', tenant)
        const results = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze()
        expect(results.violations).toEqual([])
      })
    }
  })

  test('skip link moves focus to main content', async ({ page }) => {
    await page.goto('/portal/stations')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Zum Inhalt springen' })).toBeFocused()
  })
})

test.describe('not yet migrated: /portal/sessions (legacy via proxy)', () => {
  test('is still served by the legacy backend behind the same origin', async ({ page }) => {
    await page.goto('/portal/sessions')
    await expect(page.getByRole('heading', { name: 'Sessions (legacy)' })).toBeVisible()
    expect(new URL(page.url()).port).toBe('3000')
  })
})
