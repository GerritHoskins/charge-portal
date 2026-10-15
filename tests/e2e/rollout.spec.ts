import { expect, test } from '@playwright/test'
import { ROLLBACK_PORT } from '../../playwright.config'
import { DEMO_LOGIN } from './demo-login'

// A second Nuxt (see playwright.config.ts) runs with NUXT_ROLLOUT="/portal/invoices=0":
// invoices are rolled back to legacy for everybody, everything else stays on Nuxt.
const base = `http://localhost:${ROLLBACK_PORT}`
test.use({ baseURL: base })

const logIn = async (page: import('@playwright/test').Page) => {
  await page.goto('/login?next=/portal/stations')
  await page.getByLabel('Benutzername').fill(DEMO_LOGIN.username)
  await page.getByLabel('Passwort').fill(DEMO_LOGIN.password)
  await page.getByRole('button', { name: 'Anmelden' }).click()
  await expect(page).toHaveURL('/portal/stations')
}

test.describe('rollback switch (NUXT_ROLLOUT)', () => {
  test('a rolled-back route is served by legacy, others stay on Nuxt', async ({ page }) => {
    await logIn(page)

    const nuxt = await page.request.get('/portal/stations', { headers: { accept: 'text/html' } })
    expect(nuxt.headers()['x-served-by']).toBe('nuxt')

    const legacy = await page.request.get('/portal/invoices', { headers: { accept: 'text/html' } })
    expect(legacy.headers()['x-served-by']).toBe('legacy')
    expect(await legacy.text()).toContain('legacy-rendered')
  })

  test('client-side navigation to a rolled-back route becomes a full load that legacy answers', async ({ page }) => {
    await logIn(page)
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')
    await page.getByRole('link', { name: 'Rechnungen' }).click()
    await expect(page.getByRole('heading', { name: 'Invoices (legacy)' })).toBeVisible()
  })

  test('the legacy fallback still enforces login (rollback does not open a hole)', async ({ request }) => {
    const res = await request.get('/portal/invoices', { headers: { accept: 'text/html' }, maxRedirects: 0 })
    expect(res.status()).toBe(302)
    expect(res.headers().location).toContain('/login')
  })

  test('BFF endpoints are not affected by the rollback', async ({ page }) => {
    await logIn(page)
    expect((await page.request.get('/api/invoices')).status()).toBe(200)
  })
})
