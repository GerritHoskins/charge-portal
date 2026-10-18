import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { acceptsGzip, compressPublicShopHtml, mergeShopCacheVary, mergeVary } from '../../server/utils/shop-html-compression'

const input = (overrides: Partial<Parameters<typeof compressPublicShopHtml>[0]> = {}) => ({
  pathname: '/shop/c/wallboxes',
  method: 'GET',
  statusCode: 200,
  contentType: 'text/html;charset=utf-8',
  contentEncoding: undefined,
  cacheControl: 'public, s-maxage=60',
  etag: 'W/"cached-html"',
  range: undefined,
  contentRange: undefined,
  acceptEncoding: 'gzip',
  body: '<html><body>synthetic storefront html</body></html>'.repeat(8),
  ...overrides,
})

describe('shop HTML gzip eligibility and negotiation', () => {
  it.each([
    [undefined, false],
    ['', false],
    ['br', false],
    ['gzip', true],
    ['GZIP;q=0.8, br;q=1', false],
    ['gzip;q=0.8, identity;q=0.4', true],
    ['gzip;q=0.4, identity;q=0.8', false],
    ['gzip;q=0', false],
    ['gzip;q=1, identity;q=0', true],
    ['*', true],
    ['*;q=0.5', false],
    ['*;q=0, gzip;q=1', true],
    ['*;q=0', false],
    ['gzip;q=bogus', false],
  ])('negotiates %s as gzip=%s', (header, expected) => {
    expect(acceptsGzip(header)).toBe(expected)
  })

  it('compresses eligible HTML bytes and can restore them exactly', () => {
    const original = Buffer.from(input().body as string)
    const compressed = compressPublicShopHtml(input())

    expect(compressed).toBeDefined()
    expect(compressed!.byteLength).toBeLessThan(original.byteLength)
    expect(gunzipSync(compressed!)).toEqual(original)
  })

  it('distinguishes a request that rejects both supported representations', () => {
    expect(compressPublicShopHtml(input({ acceptEncoding: 'gzip;q=0, identity;q=0' }))).toBeNull()
  })

  it.each([
    ['outside public shop', { pathname: '/portal/stations' }],
    ['shop root redirect', { pathname: '/shop' }],
    ['HEAD', { method: 'HEAD' }],
    ['error', { statusCode: 500 }],
    ['no content', { statusCode: 204, body: '' }],
    ['reset content', { statusCode: 205, body: '' }],
    ['partial content', { statusCode: 206 }],
    ['non-HTML', { contentType: 'application/json' }],
    ['HTML-like MIME suffix', { contentType: 'text/htmlish' }],
    ['already encoded', { contentEncoding: 'gzip' }],
    ['no-transform', { cacheControl: 'public, no-transform' }],
    ['strong validator', { etag: '"strong-validator"' }],
    ['request range', { range: 'bytes=0-100' }],
    ['partial response range', { contentRange: 'bytes 0-100/200' }],
    ['unsupported encoding', { acceptEncoding: 'br' }],
    ['no body', { body: undefined }],
    ['stream body', { body: { pipe() {} } }],
    ['empty body', { body: '' }],
  ] as const)('leaves %s unchanged', (_name, overrides) => {
    expect(compressPublicShopHtml(input(overrides))).toBeUndefined()
  })

  it('preserves and deduplicates Vary tokens, including the cache safety dimensions', () => {
    expect(mergeVary('Origin, Accept-Encoding', ['origin', 'X-Request-ID']))
      .toBe('Origin, Accept-Encoding, X-Request-ID')
    expect(mergeVary('*', 'Accept-Encoding')).toBe('*')
    expect(mergeShopCacheVary('Origin, accept-encoding'))
      .toBe('Origin, accept-encoding, Cookie, Accept-Language, Host, X-Forwarded-Proto')
  })
})
