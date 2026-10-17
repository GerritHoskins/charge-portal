import { expect, test } from '@playwright/test'

test.describe('public shop security boundary', () => {
  test('keeps private BFF endpoints guarded for a logged-out request', async ({ request }) => {
    expect((await request.get('/api/me')).status()).toBe(401)
  })

  test('serves a contract-mapped listing without setting a cookie', async ({ request }) => {
    const response = await request.get('/api/shop/listing/wallboxes')

    expect(response.status()).toBe(200)
    expect(response.headers()['set-cookie']).toBeUndefined()
    const body = await response.json()
    expect(body.limit).toBe(24)
    expect(body.items).toHaveLength(24)
    expect(body.items.every((item: { priceCents: number }) => Number.isInteger(item.priceCents))).toBe(true)
  })

  test('forwards filters and rejects an unsupported order', async ({ request }) => {
    const unfiltered = await (await request.get('/api/shop/listing/wallboxes')).json()
    const filteredResponse = await request.get('/api/shop/listing/wallboxes?connector=ccs')

    expect(filteredResponse.status()).toBe(200)
    const filtered = await filteredResponse.json()
    expect(filtered.total).toBeGreaterThan(0)
    expect(filtered.total).toBeLessThan(unfiltered.total)
    expect(filtered.items.every((item: { customFields: { connectorType?: string } }) => item.customFields.connectorType === 'CCS')).toBe(true)
    expect((await request.get('/api/shop/listing/wallboxes?order=bogus')).status()).toBe(400)
  })

  test('returns a product by slug and passes an unknown slug through as 404', async ({ request }) => {
    const product = await request.get('/api/shop/products/wallbox-home-7-4')
    expect(product.status()).toBe(200)
    expect(Number.isInteger((await product.json()).priceCents)).toBe(true)

    expect((await request.get('/api/shop/products/not-a-product')).status()).toBe(404)
  })
})
