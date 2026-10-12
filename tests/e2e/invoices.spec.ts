import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { LEGACY_PORT } from '../../playwright.config'

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

// Disputing changes legacy state, so every test starts from the seed data.
test.beforeEach(async ({ request }) => {
  const res = await request.post(`http://localhost:${LEGACY_PORT}/__test/reset`)
  expect(res.ok(), 'legacy must run with LEGACY_ALLOW_RESET=1 (stop a stale server on the legacy port)').toBe(true)
})

const openForm = async (page: Page) => {
  await page.goto('/portal/invoices/inv-0042/dispute')
  await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')
}

test.describe('migrated route: /portal/invoices (Nuxt)', () => {
  test('lists invoices with German money and date formatting', async ({ page }) => {
    await page.goto('/portal/invoices')
    await expect(page.getByRole('heading', { level: 1, name: 'Rechnungen' })).toBeVisible()
    await expect(page.getByRole('row')).toHaveCount(4) // header + 3 invoices
    const open = page.getByRole('row', { name: /RE-2026-0042/ })
    await expect(open).toContainText('42,10')
    await expect(open).toContainText('Offen')
    expect(await page.content()).not.toContain('legacy-rendered')
  })

  test('offers the dispute action for open invoices only, with a unique accessible name', async ({ page }) => {
    await page.goto('/portal/invoices')
    await expect(page.getByRole('link', { name: 'Beanstanden Rechnung RE-2026-0042' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Beanstanden/ })).toHaveCount(2) // 0042 and 0040, not paid 0041
  })

  test('list and form have no WCAG 2.2 AA violations', async ({ page }) => {
    await page.goto('/portal/invoices')
    expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([])
    await openForm(page)
    expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([])
  })
})

test.describe('dispute form: accessible validation flow', () => {
  test('an empty submit shows a focused error summary linking to each invalid field', async ({ page }) => {
    await openForm(page)
    await page.getByRole('button', { name: 'Beanstandung senden' }).click()

    const summary = page.getByRole('alert')
    await expect(summary).toBeFocused()
    await expect(summary.getByRole('heading', { name: 'Bitte korrigieren Sie 2 Felder' })).toBeVisible()
    await expect(summary.getByRole('link')).toHaveText(['Bitte wählen Sie einen Grund.', /mindestens 10 Zeichen/])

    // Field-level error is programmatically tied to the control.
    const message = page.getByLabel('Beschreibung')
    await expect(message).toHaveAttribute('aria-invalid', 'true')
    await expect(message).toHaveAccessibleDescription(/mindestens 10 Zeichen/)

    // Summary links move focus to the control.
    await summary.getByRole('link', { name: /mindestens 10 Zeichen/ }).click()
    await expect(message).toBeFocused()

    expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([])
  })

  test('errors clear and the form submits once the input is valid (keyboard only)', async ({ page }) => {
    await openForm(page)
    await page.getByRole('button', { name: 'Beanstandung senden' }).click()
    await expect(page.getByRole('alert')).toBeFocused()

    await page.getByRole('radio', { name: 'Der Betrag ist falsch' }).check()
    await page.getByLabel('Beschreibung').fill('Es wurden 20 kWh berechnet, geladen habe ich 12.')
    await page.getByLabel('Beschreibung').press('Tab')
    await expect(page.getByRole('button', { name: 'Beanstandung senden' })).toBeFocused()
    await page.keyboard.press('Enter')

    const heading = page.getByRole('heading', { level: 1, name: 'Beanstandung eingegangen' })
    await expect(heading).toBeFocused()
    await expect(page.locator('main').getByRole('status')).toContainText('RE-2026-0042')
    expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([])
  })

  test('the disputed invoice shows as in clarification and loses its action', async ({ page }) => {
    await openForm(page)
    await page.getByRole('radio', { name: 'Anderer Grund' }).check()
    await page.getByLabel('Beschreibung').fill('Bitte um Prüfung dieser Rechnung.')
    await page.getByRole('button', { name: 'Beanstandung senden' }).click()
    await page.getByRole('link', { name: 'Zurück zu den Rechnungen' }).click()

    const row = page.getByRole('row', { name: /RE-2026-0042/ })
    await expect(row).toContainText('In Klärung')
    await expect(row.getByRole('link')).toHaveCount(0)
  })

  test('the server rejects invalid input even if the client check is bypassed', async ({ request }) => {
    const res = await request.post('/api/invoices/inv-0042/disputes', { data: { reason: 'wrong-amount', message: 'kurz' } })
    expect(res.status()).toBe(422)
    expect((await res.json()).data.fields.message).toContain('mindestens 10 Zeichen')
  })

  test('a paid or unknown invoice cannot be disputed', async ({ page, request }) => {
    const paid = await page.goto('/portal/invoices/inv-0041/dispute')
    expect(paid?.status()).toBe(404)
    const direct = await request.post('/api/invoices/inv-0041/disputes', { data: { reason: 'other', message: 'Zahlung war falsch.' } })
    expect(direct.status()).toBe(409)
  })

  test('tenant themes keep the error state AA-compliant', async ({ page }) => {
    for (const tenant of ['stadtwerke-demo', 'fleet-demo']) {
      await page.goto(`/portal/invoices/inv-0042/dispute?tenant=${tenant}`)
      await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')
      await page.getByRole('button', { name: 'Beanstandung senden' }).click()
      await expect(page.getByRole('alert')).toBeVisible()
      expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations, tenant).toEqual([])
    }
  })
})
