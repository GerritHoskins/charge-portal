import AxeBuilder from '@axe-core/playwright'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { DEMO_LOGIN } from './demo-login'

const logIn = async (page: Page, password = DEMO_LOGIN.password) => {
  await page.getByLabel('Benutzername').fill(DEMO_LOGIN.username)
  await page.getByLabel('Passwort').fill(password)
  await page.getByRole('button', { name: 'Anmelden' }).click()
}

test.describe('login/logout in Nuxt, session owned by legacy (logged-out browser)', () => {
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
    await expect(page.getByText('Benutzername oder Passwort ungültig.')).toBeVisible()
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

// Fetches the login form the way a browser would and returns its CSRF token. The request
// context keeps the csrf_token cookie, like a browser cookie jar.
const csrfFrom = async (request: APIRequestContext): Promise<string> => {
  const html = await (await request.get('/login', { headers: { accept: 'text/html' } })).text()
  const token = html.match(/name="_csrf"[^>]*value="([^"]+)"/)?.[1] ?? html.match(/value="([^"]+)"[^>]*name="_csrf"/)?.[1]
  expect(token, 'login form carries a CSRF token').toBeTruthy()
  return token!
}

test.describe('CSRF protection and rate limiting on login/logout', () => {
  test('login page has no WCAG 2.2 AA violations detectable by axe', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { level: 1, name: 'Anmelden' })).toBeVisible()
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    expect(results.violations).toEqual([])
  })

  test('csrf cookie is HttpOnly and SameSite=Strict', async ({ page, context }) => {
    await page.goto('/login')
    const cookie = (await context.cookies()).find((c) => c.name === 'csrf_token')
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.sameSite).toBe('Strict')
  })

  test('a login post without a CSRF token is refused and logs nobody in', async ({ request }) => {
    const res = await request.post('/login', {
      form: { username: 'demo', password: 'demo-password' },
      maxRedirects: 0,
    })
    expect(res.status()).toBe(303)
    expect(res.headers().location).toContain('error=csrf')
    expect(res.headers()['set-cookie'] ?? '').not.toContain('legacy_session')
  })

  test('a login post with a token that does not match the cookie is refused', async ({ request }) => {
    await csrfFrom(request)
    const res = await request.post('/login', {
      form: { username: 'demo', password: 'demo-password', _csrf: 'attacker.chosen' },
      maxRedirects: 0,
    })
    expect(res.headers().location).toContain('error=csrf')
  })

  test('a valid token logs in', async ({ request }) => {
    const _csrf = await csrfFrom(request)
    const res = await request.post('/login', { form: { username: 'demo', password: 'demo-password', _csrf }, maxRedirects: 0 })
    expect(res.status()).toBe(303)
    expect(res.headers().location).toBe('/portal/stations')
    expect(res.headers()['set-cookie']).toContain('legacy_session=')
  })

  test('a cross-site style logout (no token) does not end the session', async ({ page, request, context }) => {
    await page.goto('/login?next=/portal/stations')
    await logIn(page)
    await expect(page).toHaveURL('/portal/stations')
    const cookies = await context.cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')

    const forged = await request.post('/logout', { headers: { cookie: cookieHeader }, form: {}, maxRedirects: 0 })
    expect(forged.status()).toBe(403)

    await page.goto('/portal/sessions')
    await expect(page).toHaveURL('/portal/sessions') // still signed in
  })

  test('the sixth wrong password for one account is throttled (with Retry-After)', async ({ request }) => {
    const username = `throttle-${Date.now()}`
    const attempt = async (password: string) => {
      const _csrf = await csrfFrom(request)
      return request.post('/login', { form: { username, password, _csrf }, maxRedirects: 0 })
    }

    for (let i = 0; i < 5; i += 1) {
      expect((await attempt('wrong')).headers().location, `attempt ${i + 1}`).toContain('error=invalid')
    }
    const blocked = await attempt('wrong')
    expect(blocked.headers().location).toContain('error=rate_limited')
    expect(Number(blocked.headers()['retry-after'])).toBeGreaterThan(0)
  })

  test('throttling another account does not lock out the demo user', async ({ page }) => {
    await page.goto('/login?next=/portal/stations')
    await logIn(page)
    await expect(page).toHaveURL('/portal/stations')
  })
})

test.describe('keyboard and language (logged-out browser)', () => {
  test('the login form works with the keyboard alone, in a logical focus order', async ({ page }) => {
    await page.goto('/login?next=/portal/sessions')
    await page.getByLabel('Benutzername').focus()
    await page.keyboard.type(DEMO_LOGIN.username)
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Passwort')).toBeFocused()
    await page.keyboard.type(DEMO_LOGIN.password)
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Anmelden' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL('/portal/sessions')
  })

  test('an error message is announced (role=alert) and the form stays usable', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Benutzername').fill('demo')
    await page.getByLabel('Passwort').fill('wrong')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('alert')).toContainText('ungültig')
    await expect(page.getByLabel('Benutzername')).toBeVisible()
  })

  test('the UI switches to English and sets the html lang', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    await page.getByLabel('Sprache').selectOption('en')
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
    expect(results.violations).toEqual([])
  })

  test('an English browser gets English without touching the switcher', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-GB' })
    const page = await context.newPage()
    await page.goto('/login')
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
    await context.close()
  })
})
