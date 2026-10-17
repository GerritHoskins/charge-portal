import { describe, expect, it } from 'vitest'
import { isPublicApi } from '../../server/utils/public-api'

describe('isPublicApi', () => {
  it.each([
    '/api/shop/',
    '/api/shop/products/x',
    '/api/vitals',
    '/api/vitals/summary',
    '/api/events',
    '/api/events/funnel',
  ])('allows the explicitly public path %s', (pathname) => {
    expect(isPublicApi(pathname)).toBe(true)
  })

  it.each([
    '/api/me',
    '/api/stations',
    '/api/shopping',
    '/api/shop',
    '/api/shop-admin',
    '/api/shop/../me',
    '/api/vitals/../me',
    '/API/shop/x',
    '/api/events/funnel/x',
  ])('keeps the unlisted or ambiguous path private: %s', (pathname) => {
    expect(isPublicApi(pathname)).toBe(false)
  })
})
