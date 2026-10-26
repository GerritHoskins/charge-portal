import { expect, test, type APIRequestContext } from '@playwright/test'

// WP-28: a successful shop view must not prefetch chunks it never runs (Nuxt's error pages
// and the portal layout), because the route budget counts every JS file the page loads.
// Prefetch hints only exist in production HTML; Vite dev serves modules on demand.
const PRODUCT = '/shop/wallbox-home-7-4'
const isViteDev = (html: string) => html.includes('/_nuxt/@vite/client')
const NOT_PREFETCHED = ['error-404', 'error-500', 'default']

const prefetchedScripts = (html: string) =>
  [...html.matchAll(/<link\b[^>]*\brel="prefetch"[^>]*>/g)]
    .map(([tag]) => tag.match(/\bhref="([^"]+\.js)"/)?.[1])
    .filter((href): href is string => Boolean(href))

const componentNames = async (request: APIRequestContext, hrefs: string[]) => {
  const names = new Set<string>()
  for (const href of hrefs) {
    const response = await request.get(href)
    expect(response.status(), href).toBe(200)
    for (const [, name] of (await response.text()).matchAll(/__name:"([^"]+)"/g)) names.add(name!)
  }
  return names
}

test.describe('shop prefetch hints', () => {
  test('the product page does not prefetch error pages or the portal layout', async ({ request }) => {
    const response = await request.get(PRODUCT)
    expect(response.status()).toBe(200)
    const html = await response.text()
    test.skip(isViteDev(html), 'prefetch hints are emitted by production builds only')

    const names = await componentNames(request, prefetchedScripts(html))
    expect(NOT_PREFETCHED.filter((name) => names.has(name))).toEqual([])
  })

  test('an unmatched route still renders the 404 page after client-side navigation', async ({ page }) => {
    const scripts: string[] = []
    page.on('response', (response) => {
      if (response.url().includes('/_nuxt/') && response.url().endsWith('.js')) scripts.push(response.url())
    })
    await page.goto(PRODUCT)
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')
    const html = await page.content()

    await page.evaluate(() => {
      const app = (document.querySelector('#__nuxt') as unknown as { __vue_app__: { config: { globalProperties: { $router: { push: (to: string) => Promise<unknown> } } } } }).__vue_app__
      return app.config.globalProperties.$router.push('/shop/c/wallboxes/no/such/page')
    })

    await expect(page.getByRole('heading', { level: 1, name: '404' })).toBeVisible()
    // Without a prefetch hint the error page chunk must still arrive when it is needed.
    if (!isViteDev(html)) expect((await componentNames(page.request, scripts)).has('error-404')).toBe(true)
  })
})
