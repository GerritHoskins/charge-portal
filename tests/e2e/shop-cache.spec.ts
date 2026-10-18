import { expect, test } from '@playwright/test'
import { parseLegacyLogin } from '../../shared/contracts/login'
import { LEGACY_PORT } from '../../playwright.config'
import { DEMO_LOGIN } from './demo-login'

const LEGACY = process.env.E2E_LEGACY_ORIGIN ?? `http://localhost:${LEGACY_PORT}`

const getSetCookieHeaders = (response: { headersArray: () => { name: string, value: string }[] }) =>
  response.headersArray().filter((header) => header.name.toLowerCase() === 'set-cookie')

const cacheControl = (headers: Record<string, string>) => headers['cache-control'] ?? ''

const compareShopHtmlWithKnownDevNoise = (actual: string, expected: string) => {
  // Nuxt/Vite dev SSR injects style links in request-dependent order and may include
  // an empty dev log bootstrap. Production HTML stays raw.
  const isViteDev = (html: string) => html.includes('/_nuxt/@vite/client')
  expect(isViteDev(actual)).toBe(isViteDev(expected))
  if (!isViteDev(actual)) {
    expect(actual).toBe(expected)
    return
  }

  const stylePattern = /<link rel="stylesheet" href="\/_nuxt\/[^"]+\.vue\?vue&type=style[^"]*"[^>]*>/g
  const styleTags = (html: string) => html.match(stylePattern) ?? []
  const actualStyles = styleTags(actual).sort()
  const expectedStyles = styleTags(expected).sort()
  expect(actualStyles).toEqual(expectedStyles)

  // Vite dev SSR can emit these two global stylesheets in either order. tokens.css
  // defines custom properties only; base.css consumes them and defines no competing
  // token properties, so their order is equivalent. Revisit if either starts overriding
  // the other's properties. Keep the exact tags/counts checked.
  const globalStylePattern = /<link rel="stylesheet" href="\/_nuxt\/assets\/css\/(?:tokens|base)\.css" crossorigin>/g
  const globalStyleTags = (html: string) => html.match(globalStylePattern) ?? []
  const actualGlobalStyles = globalStyleTags(actual).sort()
  const expectedGlobalStyles = globalStyleTags(expected).sort()
  expect(actualGlobalStyles).toEqual([
    '<link rel="stylesheet" href="/_nuxt/assets/css/base.css" crossorigin>',
    '<link rel="stylesheet" href="/_nuxt/assets/css/tokens.css" crossorigin>',
  ])
  expect(expectedGlobalStyles).toEqual(actualGlobalStyles)

  const devLogsPattern = /<script\b[^>]*data-nuxt-logs="nuxt-app"[^>]*>[\s\S]*?<\/script>/g
  const withoutEmptyDevNoise = (html: string) => {
    const logTags = html.match(devLogsPattern) ?? []
    for (const tag of logTags) {
      expect(tag).toBe('<script type="application/json" data-nuxt-logs="nuxt-app">[[]]</script>')
    }
    return html.replace(stylePattern, '').replace(globalStylePattern, '').replace(devLogsPattern, '')
  }
  expect(withoutEmptyDevNoise(actual)).toBe(withoutEmptyDevNoise(expected))
}

const category = '/shop/c/wallboxes'
const product = '/shop/wallbox-home-7-4'

test.describe('public shop response caching safety', () => {
  test('category HTML is identical for logged-out and legacy-session visitors', async ({ playwright, request }) => {
    const guest = await request.get(category, { headers: { cookie: '' } })
    expect(guest.status()).toBe(200)

    const legacy = await playwright.request.newContext()
    try {
      const login = await legacy.post(`${LEGACY}/login`, {
        form: { username: DEMO_LOGIN.username, password: DEMO_LOGIN.password },
        maxRedirects: 0,
      })
      const setCookies = getSetCookieHeaders(login).map((header) => header.value)
      expect(parseLegacyLogin(login.status(), setCookies).kind).toBe('ok')
      const sessionCookie = setCookies.map((cookie) => cookie.split(';')[0]).find((cookie) => cookie.startsWith('legacy_session='))
      expect(sessionCookie).toBeTruthy()

      const signedIn = await request.get(category, { headers: { cookie: sessionCookie! } })
      expect(signedIn.status()).toBe(200)
      // Keep this byte-for-byte until a real per-request value is observed and identified.
      compareShopHtmlWithKnownDevNoise(await signedIn.text(), await guest.text())
    } finally {
      await legacy.dispose()
    }
  })

  test('shop documents never set cookies on cold or warm responses', async ({ request }) => {
    for (const path of [category, product, '/shop/cart']) {
      const first = await request.get(path, { headers: { cookie: '' } })
      expect(first.status(), `${path} first response`).toBe(200)
      expect(getSetCookieHeaders(first), `${path} first response`).toEqual([])

      const warm = await request.get(path, { headers: { cookie: '' } })
      expect(warm.status(), `${path} warm response`).toBe(200)
      expect(getSetCookieHeaders(warm), `${path} warm response`).toEqual([])
    }
  })

  test('cached HTML isolates cookie and Accept-Language locale variants', async ({ request }) => {
    const englishCookie = await request.get(category, {
      headers: { cookie: 'i18n_locale=en', 'accept-language': 'de-DE' },
    })
    const germanCookie = await request.get(category, {
      headers: { cookie: 'i18n_locale=de', 'accept-language': 'de-DE' },
    })
    const englishCookieHtml = await englishCookie.text()
    const germanCookieHtml = await germanCookie.text()
    expect(englishCookieHtml).toMatch(/<html\s+lang="en"/)
    expect(englishCookieHtml).toContain('Wallboxes')
    expect(germanCookieHtml).toMatch(/<html\s+lang="de"/)
    expect(germanCookieHtml).toContain('Wallboxen')

    const englishHeader = await request.get(category, {
      headers: { cookie: '', 'accept-language': 'en-GB,en;q=0.9' },
    })
    const germanHeader = await request.get(category, {
      headers: { cookie: '', 'accept-language': 'de-DE,de;q=0.9' },
    })
    expect(await englishHeader.text()).toMatch(/<html\s+lang="en"/)
    expect(await germanHeader.text()).toMatch(/<html\s+lang="de"/)

    // Alternate after both cache entries have been warmed to detect cross-visitor bleed.
    const englishCookieWarm = await request.get(category, {
      headers: { cookie: 'i18n_locale=en', 'accept-language': 'de-DE' },
    })
    const germanCookieWarm = await request.get(category, {
      headers: { cookie: 'i18n_locale=de', 'accept-language': 'de-DE' },
    })
    const englishHeaderWarm = await request.get(category, {
      headers: { cookie: '', 'accept-language': 'en-GB,en;q=0.9' },
    })
    const germanHeaderWarm = await request.get(category, {
      headers: { cookie: '', 'accept-language': 'de-DE,de;q=0.9' },
    })
    compareShopHtmlWithKnownDevNoise(await englishCookieWarm.text(), englishCookieHtml)
    compareShopHtmlWithKnownDevNoise(await germanCookieWarm.text(), germanCookieHtml)
    expect(await englishHeaderWarm.text()).toMatch(/<html\s+lang="en"/)
    expect(await germanHeaderWarm.text()).toMatch(/<html\s+lang="de"/)
  })

  test('query-driven tenant and filter variants remain separate', async ({ request }) => {
    const cityTenant = await request.get('/shop/c/wallboxes?tenant=stadtwerke-demo')
    const fleetTenant = await request.get('/shop/c/wallboxes?tenant=fleet-demo')
    expect(await cityTenant.text()).toContain('data-tenant="stadtwerke-demo"')
    expect(await fleetTenant.text()).toContain('data-tenant="fleet-demo"')

    const allProducts = await request.get('/shop/c/wallboxes')
    const filteredProducts = await request.get('/shop/c/wallboxes?connector=ccs')
    expect((await allProducts.text()).match(/class="product-card"/g)?.length).toBe(12)
    expect((await filteredProducts.text()).match(/class="product-card"/g)?.length).toBe(2)
  })

  test('cached SEO origins vary by host and forwarded protocol', async ({ request }) => {
    const shopA = await request.get(category, {
      headers: { cookie: '', 'accept-language': 'de-DE', host: 'localhost:3000', 'x-forwarded-proto': 'https' },
    })
    const shopAHtml = await shopA.text()
    expect(shopAHtml).toContain('href="https://localhost:3000/shop/c/wallboxes"')
    expect(shopAHtml).toContain('https://localhost:3000/shop/c/wallboxes')

    const shopB = await request.get(category, {
      headers: { cookie: '', 'accept-language': 'de-DE', host: '127.0.0.1:3000', 'x-forwarded-proto': 'https' },
    })
    const shopBHtml = await shopB.text()
    expect(shopBHtml).toContain('href="https://127.0.0.1:3000/shop/c/wallboxes"')
    expect(shopBHtml).toContain('https://127.0.0.1:3000/shop/c/wallboxes')

    const shopC = await request.get(category, {
      headers: { cookie: '', 'accept-language': 'de-DE', host: 'localhost:3000', 'x-forwarded-proto': 'http' },
    })
    const shopCHtml = await shopC.text()
    expect(shopCHtml).toContain('href="http://localhost:3000/shop/c/wallboxes"')
    expect(shopCHtml).toContain('http://localhost:3000/shop/c/wallboxes')

    const shopAWarm = await request.get(category, {
      headers: { cookie: '', 'accept-language': 'de-DE', host: 'localhost:3000', 'x-forwarded-proto': 'https' },
    })
    const shopBWarm = await request.get(category, {
      headers: { cookie: '', 'accept-language': 'de-DE', host: '127.0.0.1:3000', 'x-forwarded-proto': 'https' },
    })
    const shopCWarm = await request.get(category, {
      headers: { cookie: '', 'accept-language': 'de-DE', host: 'localhost:3000', 'x-forwarded-proto': 'http' },
    })
    compareShopHtmlWithKnownDevNoise(await shopAWarm.text(), shopAHtml)
    compareShopHtmlWithKnownDevNoise(await shopBWarm.text(), shopBHtml)
    compareShopHtmlWithKnownDevNoise(await shopCWarm.text(), shopCHtml)
  })

  test('public listing and product HTML advertise their bounded SWR cache', async ({ request }) => {
    for (const [path, maxAge] of [[category, 60], [product, 300]] as const) {
      const cold = await request.get(path, { headers: { cookie: '' } })
      expect(cold.status(), `${path} cold`).toBe(200)
      expect(cacheControl(cold.headers()), path).toMatch(new RegExp(`s-maxage=${maxAge}(?:,|$)`))
      expect(cacheControl(cold.headers()), path).toContain('stale-while-revalidate')
      const vary = cold.headers().vary?.split(',').map(value => value.trim().toLowerCase()) ?? []
      for (const header of ['cookie', 'accept-language', 'host', 'x-forwarded-proto']) {
        expect(vary, `${path} Vary`).toContain(header)
      }
      expect(cold.headers().etag, path).toBeTruthy()
      expect(getSetCookieHeaders(cold), `${path} cold`).toEqual([])

      // Nitro 2.13.4 stamps Last-Modified once when the cached handler stores the response.
      // Keep the requests in different timestamp seconds so a re-render cannot pass by chance.
      const coldLastModified = cold.headers()['last-modified']
      expect(coldLastModified, `${path} cold Last-Modified`).toBeTruthy()
      expect(Number.isFinite(Date.parse(coldLastModified ?? '')), `${path} cold Last-Modified is valid`).toBe(true)
      await new Promise(resolve => setTimeout(resolve, 1_100))
      const warm = await request.get(path, { headers: { cookie: '' } })
      expect(warm.status(), `${path} warm`).toBe(200)
      expect(warm.headers()['last-modified'], path).toBe(coldLastModified)
      expect(getSetCookieHeaders(warm), `${path} warm`).toEqual([])
    }
  })

  test('redirects, cart HTML and shop API responses do not advertise or expose shared caching', async ({ request }) => {
    for (const path of ['/shop', '/shop/', '/shop/cart', '/api/shop/listing/wallboxes?limit=1']) {
      const response = await request.get(path, { maxRedirects: 0 })
      const isRedirect = path === '/shop' || path === '/shop/'
      expect(response.status(), path).toBe(isRedirect ? 301 : 200)
      const headers = response.headers()
      expect(headers['x-cache'], path).toBeUndefined()
      expect(cacheControl(headers), path).not.toMatch(/(?:public|s-maxage|max-age\s*=\s*[1-9])/i)
      expect(cacheControl(headers), path).toMatch(/(?:no-store|^$)/i)
      if (isRedirect) expect(getSetCookieHeaders(response), path).toEqual([])
    }
  })

  test('navigates through the shop redirect without requesting a redirect payload', async ({ page }) => {
    const redirectPayloadRequests: string[] = []
    const payloadWarnings: string[] = []
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/shop/_payload.json') {
        redirectPayloadRequests.push(request.url())
      }
    })
    page.on('console', (message) => {
      if (message.text().includes('NUXT_E7002')) payloadWarnings.push(message.text())
    })

    await page.goto(product)
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')
    await page.locator('.breadcrumb a[href="/shop"]').click()
    await expect(page).toHaveURL(/\/shop\/c\/wallboxes$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Wallboxen' })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Produkte' }).getByRole('listitem')).toHaveCount(12)
    await page.waitForLoadState('networkidle')

    expect(redirectPayloadRequests).toEqual([])
    expect(payloadWarnings).toEqual([])
  })
})
