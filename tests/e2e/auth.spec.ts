import { expect, test, type Page } from '@playwright/test'
import { DEMO_LOGIN } from './demo-login'

const logIn = async (page: Page, password = DEMO_LOGIN.password) => {
  await page.getByLabel('User').fill(DEMO_LOGIN.username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()
}

test.describe('auth hand-over between legacy and Nuxt (logged-out browser)', () => {
  test('migrated page redirects to login and returns after login', async ({ page }) => {
    await page.goto('/portal/sessions')
    await expect(page).toHaveURL('/login?next=%2Fportal%2Fsessions')
    await logIn(page)
    await expect(page).toHaveURL('/portal/sessions')
    await expect(page.getByRole('heading', { level: 1, name: 'Ladevorgänge' })).toBeVisible()
  })

  test('no portal HTML is sent to a logged-out request (server-side guard)', async ({ request }) => {
    const res = await request.get('/portal/stations', { maxRedirects: 0 })
    expect(res.status()).toBe(302)
    expect(res.headers().location).toBe('/login?next=%2Fportal%2Fstations')
    expect(await res.text()).not.toContain('Ladestationen')
  })

  test('BFF endpoints answer 401 without a session', async ({ request }) => {
    for (const path of ['/api/stations', '/api/sessions', '/api/invoices', '/api/me']) {
      expect((await request.get(path)).status(), path).toBe(401)
    }
  })

  test('a logged-out client cannot submit a dispute (write endpoints are guarded too)', async ({ request }) => {
    const res = await request.post('/api/invoices/inv-0042/disputes', { data: { reason: 'other', message: 'Ohne Anmeldung.' } })
    expect(res.status()).toBe(401)
  })

  test('wrong password shows an error and keeps the user logged out', async ({ page }) => {
    await page.goto('/login?next=/portal/stations')
    await logIn(page, 'wrong')
    await expect(page.getByText('Invalid user or password')).toBeVisible()
    await page.goto('/portal/stations')
    await expect(page).toHaveURL(/\/login/)
  })

  test('the legacy-issued cookie is accepted by every migrated page (shared cookie)', async ({ page }) => {
    await page.goto('/login?next=/portal/stations')
    await logIn(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Stationen' })).toBeVisible()
    await page.getByRole('link', { name: 'Rechnungen' }).click() // no second login
    await expect(page.getByRole('heading', { level: 1, name: 'Rechnungen' })).toBeVisible()
  })

  test('the session cookie is HttpOnly and SameSite=Lax', async ({ page, context }) => {
    await page.goto('/login?next=/portal/stations')
    await logIn(page)
    const cookie = (await context.cookies()).find((c) => c.name === 'legacy_session')
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.sameSite).toBe('Lax')
  })

  test('next= cannot redirect off-site (open-redirect guard)', async ({ page }) => {
    await page.goto('/login?next=//evil.example')
    await logIn(page)
    await expect(page).toHaveURL('/portal/stations')
  })

  test('logout ends the session on the server', async ({ page, context }) => {
    await page.goto('/login?next=/portal/stations')
    await logIn(page)
    await expect(page.getByText('Angemeldet als Demo Operator')).toBeVisible()
    const stolen = (await context.cookies()).find((c) => c.name === 'legacy_session')!

    await page.getByRole('button', { name: 'Abmelden' }).click()
    await expect(page).toHaveURL('/login')
    await page.goto('/portal/stations')
    await expect(page).toHaveURL(/\/login/)

    // The old cookie value must be dead server-side, not merely deleted in the browser.
    await context.addCookies([stolen])
    await page.goto('/portal/stations')
    await expect(page).toHaveURL(/\/login/)
  })
})
