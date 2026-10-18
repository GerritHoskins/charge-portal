import { request as httpRequest } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
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

  // Same narrowly checked dev-only normalization as shop-cache.spec.ts. Vite may
  // reorder its injected style links as modules compile; production remains byte-exact.
  const vueStyles = /<link rel="stylesheet" href="\/_nuxt\/[^"]+\.vue\?vue&type=style[^"]*"[^>]*>/g
  const globals = /<link rel="stylesheet" href="\/_nuxt\/assets\/css\/(?:tokens|base)\.css" crossorigin>/g
  const texts = [actual, expected].map(body => body.toString('utf8'))
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

    const etag = header(gzip, 'etag')
    expect(etag).not.toBe('')
    const notModified = await rawGet(url, 'gzip', { 'if-none-match': etag })
    expect(notModified.statusCode).toBe(304)
    expect(varyTokens(notModified)).toContain('accept-encoding')
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
