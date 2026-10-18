import { expect, test } from '@playwright/test'

test.describe('public shop security boundary', () => {
  test('keeps private BFF endpoints guarded for a logged-out request', async ({ request }) => {
    expect((await request.get('/api/me')).status()).toBe(401)
  })

  test('serves a contract-mapped listing without setting a cookie', async ({ request }) => {
    const defaultResponse = await request.get('/api/shop/listing/wallboxes')
    expect(defaultResponse.status()).toBe(200)
    const defaultListing = await defaultResponse.json()
    expect(defaultListing.limit).toBe(24)
    expect(defaultListing.items).toHaveLength(24)

    const response = await request.get('/api/shop/listing/wallboxes?limit=48&order=price-desc')

    expect(response.status()).toBe(200)
    expect(response.headers()['set-cookie']).toBeUndefined()
    const body = await response.json()
    expect(body.limit).toBe(48)
    expect(body.sorting).toBe('price-desc')
    expect(body.items.length).toBeGreaterThan(0)
    expect(body.items.every((item: { priceCents: number }) => Number.isInteger(item.priceCents))).toBe(true)

    const poweredProducts = body.items.filter((item: { maxPowerKw: number | null }) => item.maxPowerKw !== null)
    expect(body.aggregations.maxPowerKw).toEqual({
      min: Math.min(...poweredProducts.map((item: { maxPowerKw: number }) => item.maxPowerKw)),
      max: Math.max(...poweredProducts.map((item: { maxPowerKw: number }) => item.maxPowerKw)),
    })
    expect(Array.isArray(body.aggregations.connectorType)).toBe(true)
    expect(body.aggregations.connectorType.length).toBeGreaterThan(0)
    expect(body.aggregations.connectorType.every((entry: { key: string; count: number }) => (
      ['type1', 'type2', 'ccs', 'card', 'cee', 'schuko', 'mixed'].includes(entry.key)
      && Number.isInteger(entry.count)
      && entry.count > 0
    ))).toBe(true)
    expect(body.aggregations.connectorType.reduce((sum: number, entry: { count: number }) => sum + entry.count, 0))
      .toBe(body.total)

    const product = body.items[0]
    expect(product.description.trim().length).toBeGreaterThan(0)
    expect(product.image).toEqual(expect.objectContaining({
      alt: expect.any(String),
      width: expect.any(Number),
      height: expect.any(Number),
    }))
    expect(product.maxPowerKw === null || Number.isFinite(product.maxPowerKw)).toBe(true)
    expect(product.connectorType === null || [
      'type1', 'type2', 'ccs', 'card', 'cee', 'schuko', 'mixed',
    ].includes(product.connectorType)).toBe(true)
  })

  test('forwards filters and rejects an unsupported order', async ({ request }) => {
    const unfiltered = await (await request.get('/api/shop/listing/wallboxes')).json()
    const filteredResponse = await request.get('/api/shop/listing/wallboxes?connector=ccs')

    expect(filteredResponse.status()).toBe(200)
    const filtered = await filteredResponse.json()
    expect(filtered.total).toBeGreaterThan(0)
    expect(filtered.total).toBeLessThan(unfiltered.total)
    expect(filtered.items.every((item: { connectorType: string }) => item.connectorType === 'ccs')).toBe(true)
    expect((await request.get('/api/shop/listing/wallboxes?order=bogus')).status()).toBe(400)
  })

  test('returns a product by slug and passes an unknown slug through as 404', async ({ request }) => {
    const product = await request.get('/api/shop/products/wallbox-home-7-4')
    expect(product.status()).toBe(200)
    const body = await product.json()
    expect(Number.isInteger(body.priceCents)).toBe(true)
    expect(body.description.trim().length).toBeGreaterThan(0)
    expect(body.image).toEqual(expect.objectContaining({
      alt: expect.any(String),
      width: expect.any(Number),
      height: expect.any(Number),
    }))
    expect(body.maxPowerKw === null || Number.isFinite(body.maxPowerKw)).toBe(true)
    expect(body.connectorType === null || [
      'type1', 'type2', 'ccs', 'card', 'cee', 'schuko', 'mixed',
    ].includes(body.connectorType)).toBe(true)
    expect(body.customFields).toEqual(expect.objectContaining({
      powerKw: expect.any(Number),
      connectorType: expect.any(String),
    }))

    expect((await request.get('/api/shop/products/not-a-product')).status()).toBe(404)
  })
})
