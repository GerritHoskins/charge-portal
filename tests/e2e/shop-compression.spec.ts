import { request as httpRequest } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'
import { expect, test } from '@playwright/test'
import { parseLegacyLogin } from '../../shared/contracts/login'
import { LEGACY_PORT } from '../../playwright.config'
import { DEMO_LOGIN } from './demo-login'

type RawResponse = {
  statusCode: number
  headers: Record<string, string | string[] | undefined>
  body: Buffer
}

const rawGet = (url: URL, acceptEncoding: string, extraHeaders: Record<string, string> = {}) =>
  new Promise<RawResponse>((resolve, reject) => {
    const request = httpRequest(url, {
      method: 'GET',
      headers: {
        'accept-encoding': acceptEncoding,
        'accept-language': 'de-DE,de;q=0.9',
        cookie: '',
        connection: 'close',
        ...extraHeaders,
      },
    }, (response) => {
      const chunks: Buffer[] = []
      response.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
      response.on('end', () => resolve({
        statusCode: response.statusCode ?? 0,
        headers: response.headers,
        body: Buffer.concat(chunks),
      }))
      response.on('error', reject)
    })
    request.setTimeout(15_000, () => request.destroy(new Error('raw HTTP request timed out')))
    request.on('error', reject)
    request.end()
  })

const header = (response: RawResponse, name: string) => {
  const value = response.headers[name.toLowerCase()]
  return Array.isArray(value) ? value.join(', ') : value ?? ''
}

const varyTokens = (response: RawResponse) =>
  header(response, 'vary').split(',').map(value => value.trim().toLowerCase()).filter(Boolean)

const LEGACY = process.env.E2E_LEGACY_ORIGIN ?? `http://localhost:${LEGACY_PORT}`

const isViteDev = (body: Buffer) => body.toString('utf8').includes('/_nuxt/@vite/client')
const expectSameHtml = (actual: Buffer, expected: Buffer) => {
  expect(isViteDev(actual)).toBe(isViteDev(expected))
  if (!isViteDev(actual)) {
    expect(actual).toEqual(expected)
    return
  }

  // Vite may reorder style links as modules compile, or globally collect the lazy
  // Nuxt error component's scoped style, sometimes repeatedly. Ignore identical
  // copies of that exact style only if unused in both documents;
  // every other dev style remains mandatory and production stays byte-exact.
  const vueStyles = /<link rel="stylesheet" href="\/_nuxt\/[^"]+\.vue\?vue&type=style[^"]*"[^>]*>/g
  const globals = /<link rel="stylesheet" href="\/_nuxt\/assets\/css\/(?:tokens|base)\.css" crossorigin>/g
  const unusedErrorStyle = /<link rel="stylesheet" href="\/_nuxt\/[^"?]*\/node_modules\/nuxt\/dist\/app\/components\/error-500\.vue\?vue&type=style&index=0&scoped=([a-f0-9]{8})&lang\.css" crossorigin>/g
  const errorStyleTags = new Set<string>()
  const texts = [actual, expected].map(body => {
    const text = body.toString('utf8')
    const errorStyles = [...text.matchAll(unusedErrorStyle)]
    for (const match of errorStyles) {
      errorStyleTags.add(match[0])
      expect(text).not.toContain(`data-v-${match[1]}`)
    }
    return text.replace(unusedErrorStyle, '')
  })
  expect(errorStyleTags.size).toBeLessThanOrEqual(1)
  expect((texts[0]!.match(vueStyles) ?? []).sort()).toEqual((texts[1]!.match(vueStyles) ?? []).sort())
  for (const text of texts) {
    expect((text.match(globals) ?? []).sort()).toEqual([
      '<link rel="stylesheet" href="/_nuxt/assets/css/base.css" crossorigin>',
      '<link rel="stylesheet" href="/_nuxt/assets/css/tokens.css" crossorigin>',
    ])
  }
  const logs = /<script\b[^>]*data-nuxt-logs="nuxt-app"[^>]*>[\s\S]*?<\/script>/g
  const normalized = texts.map(text => {
    for (const tag of text.match(logs) ?? []) {
      expect(tag).toBe('<script type="application/json" data-nuxt-logs="nuxt-app">[[]]</script>')
    }
    return text.replace(vueStyles, '').replace(globals, '').replace(logs, '')
  })
  expect(normalized[0]).toBe(normalized[1])
}

const expectConditional304 = async (
  initial: RawResponse,
  conditionalGet: (etag: string) => Promise<RawResponse>,
  identityGet: () => Promise<RawResponse>,
) => {
  let current = initial
  for (let attempt = 0; attempt < 3; attempt++) {
    const etag = header(current, 'etag')
    expect(etag).not.toBe('')
    const response = await conditionalGet(etag)
    expect(varyTokens(response)).toContain('accept-encoding')
    if (response.statusCode === 304) {
      expect(header(response, 'etag')).toBe(etag)
      expect(response.body.byteLength).toBe(0)
      return
    }

    // Dev SWR can refresh Vite's style ordering between the two requests. Production
    // must return 304 immediately; dev must prove a genuine changed representation
    // and still converge to 304 within this fixed bound.
    expect(isViteDev(gunzipSync(current.body))).toBe(true)
    expect(response.statusCode).toBe(200)
    const nextEtag = header(response, 'etag')
    expect(nextEtag).not.toBe('')
    expect(nextEtag).not.toBe(etag)
    expect(header(response, 'content-encoding')).toBe('gzip')
    expect(Number(header(response, 'content-length'))).toBe(response.body.byteLength)
    const decoded = gunzipSync(response.body)
    expectSameHtml(decoded, gunzipSync(current.body))
    const identity = await identityGet()
    expect(identity.statusCode).toBe(200)
    expect(header(identity, 'content-encoding')).toBe('')
    expect(header(identity, 'etag')).toBe(nextEtag)
    expectSameHtml(decoded, identity.body)
    current = response
  }
  throw new Error('development HTML validator did not stabilize within three conditional requests')
}

test('HTML comparison only normalizes an unused Nuxt development error stylesheet', () => {
  const productStyle = '<link rel="stylesheet" href="/_nuxt/app/pages/shop/product.vue?vue&type=style&index=0&scoped=1234abcd&lang.css" crossorigin>'
  const errorStyle = '<link rel="stylesheet" href="/_nuxt/home/runner/work/charge-portal/charge-portal/node_modules/nuxt/dist/app/components/error-500.vue?vue&type=style&index=0&scoped=347e4e05&lang.css" crossorigin>'
  const fixture = (extra = '', markup = '<main>synthetic storefront</main>') => Buffer.from(
    '<html><head><script src="/_nuxt/@vite/client"></script>'
    + '<link rel="stylesheet" href="/_nuxt/assets/css/base.css" crossorigin>'
    + '<link rel="stylesheet" href="/_nuxt/assets/css/tokens.css" crossorigin>'
    + productStyle + extra + '</head><body>' + markup + '</body></html>',
  )

  expectSameHtml(fixture(errorStyle), fixture())
  expectSameHtml(fixture(), fixture(errorStyle))
  expectSameHtml(fixture(errorStyle + errorStyle), fixture())
  expectSameHtml(fixture(), fixture(errorStyle + errorStyle))
  expectSameHtml(fixture(errorStyle.repeat(3)), fixture(errorStyle))
  expect(() => expectSameHtml(fixture(errorStyle + errorStyle.replace('347e4e05', '347e4e06')), fixture())).toThrow()
  expect(() => expectSameHtml(fixture(errorStyle), fixture(errorStyle.replace('347e4e05', '347e4e06')))).toThrow()
  expect(() => expectSameHtml(fixture(errorStyle), fixture(errorStyle.replace('/home/runner/', '/other/runner/')))).toThrow()
  const activeError = '<main data-v-347e4e05>synthetic storefront</main>'
  expect(() => expectSameHtml(fixture(errorStyle, activeError), fixture('', activeError))).toThrow()
  expect(() => expectSameHtml(
    Buffer.from(fixture(errorStyle).toString().replace(productStyle, '')), fixture(),
  )).toThrow()
  expect(() => expectSameHtml(
    Buffer.from(fixture(errorStyle).toString().replace('scoped=1234abcd', 'scoped=8765dcba')), fixture(),
  )).toThrow()
  expect(() => expectSameHtml(fixture(errorStyle.replace('error-500.vue', 'error-404.vue')), fixture())).toThrow()
  expect(() => expectSameHtml(fixture(errorStyle.replace('index=0', 'index=1')), fixture())).toThrow()
  const production = (extra = '') => Buffer.from(fixture(extra).toString().replace('/_nuxt/@vite/client', '/_nuxt/entry.js'))
  expect(() => expectSameHtml(production(errorStyle), production())).toThrow()
})

test('conditional comparison requires a stable 304 and only retries validated development changes', async () => {
  const html = Buffer.from('<script src="/_nuxt/@vite/client"></script>'
    + '<link rel="stylesheet" href="/_nuxt/assets/css/base.css" crossorigin>'
    + '<link rel="stylesheet" href="/_nuxt/assets/css/tokens.css" crossorigin><main>synthetic</main>')
  const changedHtml = Buffer.from(html.toString().replace(
    /(<link[^>]+base\.css[^>]+>)(<link[^>]+tokens\.css[^>]+>)/, '$2$1',
  ))
  const gzip = (body: Buffer, etag: string): RawResponse => {
    const wire = gzipSync(body)
    return { statusCode: 200, body: wire, headers: {
      etag, vary: 'Accept-Encoding', 'content-encoding': 'gzip', 'content-length': String(wire.byteLength),
    } }
  }
  const identity = (body: Buffer, etag: string): RawResponse => ({ statusCode: 200, body, headers: { etag } })
  const notModified = (etag: string): RawResponse => ({ statusCode: 304, body: Buffer.alloc(0), headers: { etag, vary: 'Accept-Encoding' } })
  const initial = gzip(html, 'one')
  const changed = gzip(changedHtml, 'two')
  for (const changes of [1, 2]) {
    const validators: string[] = []
    await expectConditional304(initial, async (etag) => {
      validators.push(etag)
      return validators.length <= changes ? { ...changed, headers: { ...changed.headers, etag: String(validators.length) } } : notModified(etag)
    }, async () => identity(changedHtml, String(validators.length)))
    expect(validators).toHaveLength(changes + 1)
  }
  const reject = async (response: RawResponse, fresh = identity(changedHtml, 'two'), start = initial) => {
    await expect(expectConditional304(start, async () => response, async () => fresh)).rejects.toThrow()
  }
  await reject({ ...changed, headers: { ...changed.headers, etag: 'one' } })
  await reject({ ...changed, headers: { ...changed.headers, etag: '' } })
  await reject({ ...changed, headers: { ...changed.headers, 'content-encoding': '' } })
  await reject({ ...changed, headers: { ...changed.headers, 'content-length': '1' } })
  await reject({ ...changed, headers: { ...changed.headers, vary: '' } })
  const invalidGzip = Buffer.from('invalid gzip')
  await reject({ ...changed, body: invalidGzip, headers: { ...changed.headers, 'content-length': String(invalidGzip.byteLength) } })
  await reject(gzip(Buffer.from(changedHtml.toString().replace('synthetic', 'different')), 'two'))
  await reject(changed, identity(html, 'wrong-validator'))
  await reject(changed, identity(Buffer.from('different body'), 'two'))
  const production = Buffer.from('<main>production</main>')
  await reject(gzip(production, 'two'), identity(production, 'two'), gzip(production, 'one'))
  await expectConditional304(gzip(production, 'one'), async () => notModified('one'),
    async () => { throw new Error('production must not need a new identity request') })
  await reject(notModified('wrong-validator'))
  await reject({ ...notModified('one'), body: Buffer.from('unexpected body') })
  let attempts = 0
  await expect(expectConditional304(initial, async () => gzip(changedHtml, String(++attempts)),
    async () => identity(changedHtml, String(attempts)))).rejects.toThrow('did not stabilize')
  expect(attempts).toBe(3)
})

test.describe('public shop HTML compression on the raw HTTP wire', () => {
  test('gzip preserves HTML bytes, advertises encoding variance, and keeps variance on 304', async ({ request }) => {
    const baseURL = String(test.info().project.use.baseURL)
    const url = new URL('/shop/c/wallboxes', baseURL)

    // Node's HTTP client exposes the actual wire bytes and does not transparently gunzip.
    const identity = await rawGet(url, 'identity')
    expect(identity.statusCode).toBe(200)
    expect(header(identity, 'content-encoding')).toBe('')
    const identityLength = Number(header(identity, 'content-length'))
    expect(identityLength).toBe(identity.body.byteLength)

    const gzip = await rawGet(url, 'gzip')
    expect(gzip.statusCode).toBe(200)
    expect(header(gzip, 'content-encoding')).toBe('gzip')
    expect(Number(header(gzip, 'content-length'))).toBe(gzip.body.byteLength)
    expect(gzip.body.byteLength).toBeLessThan(identity.body.byteLength)
    expectSameHtml(gunzipSync(gzip.body), identity.body)
    expect(varyTokens(gzip)).toContain('accept-encoding')

    await expectConditional304(gzip,
      etag => rawGet(url, 'gzip', { 'if-none-match': etag }),
      () => rawGet(url, 'identity'))
    expect(varyTokens(identity)).toContain('accept-encoding')

    const gzipHit = await rawGet(url, 'gzip')
    expect(gzipHit.statusCode).toBe(200)
    expect(header(gzipHit, 'content-encoding')).toBe('gzip')
    expectSameHtml(gunzipSync(gzipHit.body), identity.body)
    if (!isViteDev(identity.body)) expect(gzipHit.body).toEqual(gzip.body)

    const gzipExcluded = await rawGet(url, 'gzip;q=0')
    expect(gzipExcluded.statusCode).toBe(200)
    expect(header(gzipExcluded, 'content-encoding')).toBe('')
    expectSameHtml(gzipExcluded.body, identity.body)

    const noAcceptableRepresentation = await rawGet(url, 'gzip;q=0, identity;q=0')
    expect(noAcceptableRepresentation.statusCode).toBe(406)
    expect(noAcceptableRepresentation.body.byteLength).toBe(0)
    expect(header(noAcceptableRepresentation, 'cache-control')).toContain('no-store')
    expect(varyTokens(noAcceptableRepresentation)).toContain('accept-encoding')

    const identityAfterRejectedRequest = await rawGet(url, 'identity')
    expect(identityAfterRejectedRequest.statusCode).toBe(200)
    expectSameHtml(identityAfterRejectedRequest.body, identity.body)

    const wildcard = await rawGet(url, '*')
    expect(wildcard.statusCode).toBe(200)
    expect(header(wildcard, 'content-encoding')).toBe('gzip')
    expectSameHtml(gunzipSync(wildcard.body), identity.body)

    const identityPreferred = await rawGet(url, 'gzip;q=0.4, identity;q=0.8')
    expect(header(identityPreferred, 'content-encoding')).toBe('')
    expectSameHtml(identityPreferred.body, identity.body)

    const englishCookie = await request.get('/shop/c/wallboxes', {
      headers: { cookie: 'i18n_locale=en', 'accept-language': 'de-DE' },
    })
    expect(englishCookie.status()).toBe(200)
    const englishIdentityBody = Buffer.from(await englishCookie.body())
    expect(englishIdentityBody.toString('utf8')).toMatch(/<html\s+lang="en"/)

    const login = await request.post(`${LEGACY}/login`, {
      form: { username: DEMO_LOGIN.username, password: DEMO_LOGIN.password },
      maxRedirects: 0,
    })
    const loginCookies = login.headersArray().filter(item => item.name.toLowerCase() === 'set-cookie').map(item => item.value)
    expect(parseLegacyLogin(login.status(), loginCookies).kind).toBe('ok')
    const sessionCookie = loginCookies.map(cookie => cookie.split(';')[0]).find(cookie => cookie.startsWith('legacy_session='))
    expect(sessionCookie).toBeTruthy()

    const englishSession = await rawGet(url, 'gzip', { cookie: `i18n_locale=en; ${sessionCookie}` })
    expect(englishSession.statusCode).toBe(200)
    expect(header(englishSession, 'content-encoding')).toBe('gzip')
    expectSameHtml(gunzipSync(englishSession.body), englishIdentityBody)
    expect(header(englishSession, 'set-cookie')).toBe('')

    const product = new URL('/shop/wallbox-home-7-4', baseURL)
    const firstGzip = await rawGet(product, 'gzip')
    expect(firstGzip.statusCode).toBe(200)
    expect(header(firstGzip, 'content-encoding')).toBe('gzip')
    const identityHit = await rawGet(product, 'identity')
    expect(identityHit.statusCode).toBe(200)
    expect(header(identityHit, 'content-encoding')).toBe('')
    expectSameHtml(identityHit.body, gunzipSync(firstGzip.body))
    if (!isViteDev(identityHit.body)) expect(identityHit.headers.etag).toBe(firstGzip.headers.etag)
  })

  test('API, external JSON, portal, and static asset responses keep their existing encodings', async () => {
    const baseURL = String(test.info().project.use.baseURL)
    const api = new URL('/api/shop/listing/wallboxes?limit=1', baseURL)
    const identityApi = await rawGet(api, 'identity')
    const gzipApi = await rawGet(api, 'gzip')
    expect(identityApi.statusCode).toBe(200)
    expect(gzipApi.statusCode).toBe(200)
    expect(header(gzipApi, 'content-encoding')).toBe('')
    expect(gzipApi.body).toEqual(identityApi.body)

    const metadata = new URL('/_nuxt/builds/latest.json', baseURL)
    const identityMetadata = await rawGet(metadata, 'identity')
    const gzipMetadata = await rawGet(metadata, 'gzip')
    expect(identityMetadata.statusCode).toBe(200)
    expect(header(identityMetadata, 'content-type')).toContain('application/json')
    expect(header(gzipMetadata, 'content-encoding')).toBe('')
    expect(gzipMetadata.body).toEqual(identityMetadata.body)

    const portal = await rawGet(new URL('/portal/stations', baseURL), 'gzip')
    expect(portal.statusCode).toBeGreaterThanOrEqual(300)
    expect(header(portal, 'content-encoding')).toBe('')

    const shop = await rawGet(new URL('/shop/c/wallboxes', baseURL), 'identity')
    expect(shop.statusCode).toBe(200)
    const stylesheet = shop.body.toString('utf8').match(/<link\b(?=[^>]*rel="stylesheet")(?=[^>]*href="([^"]+\.css(?:\?[^"]*)?)")[^>]*>/)?.[1]
    expect(stylesheet, 'shop HTML should expose a stylesheet URL').toBeTruthy()
    const asset = new URL(stylesheet!, baseURL)
    const identityAsset = await rawGet(asset, 'identity')
    const gzipAsset = await rawGet(asset, 'gzip')
    expect(identityAsset.statusCode).toBe(200)
    expect(gzipAsset.statusCode).toBe(200)
    if (header(gzipAsset, 'content-encoding') === 'gzip') {
      expect(gunzipSync(gzipAsset.body)).toEqual(identityAsset.body)
    } else {
      expect(header(gzipAsset, 'content-encoding')).toBe('')
      expect(gzipAsset.body).toEqual(identityAsset.body)
    }

    const isViteDev = shop.body.toString('utf8').includes('/_nuxt/@vite/client')
    if (!isViteDev) {
      const publicPath = decodeURIComponent(asset.pathname).replace(/^\/+/, '')
      const nativeGzip = await readFile(resolve(process.cwd(), '.output/public', `${publicPath}.gz`))
      expect(header(gzipAsset, 'content-encoding')).toBe('gzip')
      expect(gzipAsset.body).toEqual(nativeGzip)
    }
  })

  test('locale and route payload JSON are unchanged when gzip is accepted', async ({ page }) => {
    const localeUrls = new Set<string>()
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (url.pathname.startsWith('/_i18n/') && url.pathname.endsWith('/messages.json')) localeUrls.add(url.href)
    })

    const document = await page.goto('/shop/c/wallboxes')
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', '')
    await page.waitForLoadState('networkidle')
    const isViteDev = (await document!.text()).includes('/_nuxt/@vite/client')
    if (isViteDev) {
      // Installed i18n context.js forces runtime import loaders in development;
      // its separate messages.json transport is a production behavior.
      expect(localeUrls.size).toBe(0)
    } else {
      expect(localeUrls.size, 'production must request its real locale JSON').toBeGreaterThan(0)
    }

    const baseURL = String(test.info().project.use.baseURL)
    const documentURL = new URL(page.url())
    const payloadURL = new URL(`${documentURL.pathname}/_payload.json`, baseURL)
    const resources = [...localeUrls].map(url => new URL(url))
    resources.push(payloadURL)

    for (const resource of resources) {
      const identity = await rawGet(resource, 'identity')
      const gzip = await rawGet(resource, 'gzip')
      expect(identity.statusCode, resource.pathname).toBe(200)
      expect(header(identity, 'content-type'), resource.pathname).toContain('application/json')
      expect(header(gzip, 'content-encoding'), resource.pathname).toBe('')
      expect(gzip.body, resource.pathname).toEqual(identity.body)
    }
  })
})
