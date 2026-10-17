import { describe, expect, it } from 'vitest'
import {
  catalogProductSchema,
  mapProductListing,
  storeApiProductListingSchema,
  storeApiProductSchema,
  toCatalogProduct,
} from '#shared/contracts/catalog'

const idA = 'd8e9c1b2a3f4e5d6c7b8a9d0e1f2a3b4'
const idB = '0123456789abcdef0123456789abcdef'
const idC = 'fedcba9876543210fedcba9876543210'
const idD = 'a1b2c3d4e5f60718293648a5b6c7d8e9'

const validProduct = {
  id: idA,
  productNumber: 'SW-14573',
  name: 'AC/DC Wallbox Pro',
  available: true,
  availableStock: 3,
  calculatedPrice: { apiAlias: 'calculated_price', unitPrice: 49999, totalPrice: 49999, quantity: 1 },
  cover: { id: idB, mediaId: idC, productId: idA, media: { id: idC, url: 'https://cdn.example/media/thumbnail/box.jpg', alt: 'Wallbox' } },
  seoUrls: [
    { id: idB, routeName: 'product', pathInfo: 'a1b2', seoPathInfo: '/catalog/ac-dc-wallbox-pro' },
  ],
  customFields: { bundleCode: 'WBX-PRO' },
}

const validListing = {
  total: 2,
  page: 1,
  limit: 24,
  apiAlias: 'product_listing',
  elements: [validProduct, { ...validProduct, id: idD, productNumber: 'SW-20007', name: 'Wallbox Lite', availableStock: 1 }],
  availableSortings: [{ key: 'name-asc', label: 'Name A-Z' }],
  currentFilters: { manufacturer: [], price: { min: 0, max: 0 }, properties: [], rating: null, 'shipping-free': false },
  aggregations: [],
}

describe('store-api catalog response contract', () => {
  it('accepts a well-formed product listing response', () => {
    expect(storeApiProductListingSchema.safeParse(validListing).success).toBe(true)
  })

  it('accepts a well-formed single product response', () => {
    expect(storeApiProductSchema.safeParse(validProduct).success).toBe(true)
  })

  it('rejects a product with an id that is not a Shopware uuid', () => {
    const result = storeApiProductSchema.safeParse({ ...validProduct, id: 'x' })
    expect(result.success).toBe(false)
  })

  it('rejects a product without a price', () => {
    const { calculatedPrice: _calculatedPrice, ...rest } = validProduct
    expect(storeApiProductSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects a product without an image url', () => {
    expect(storeApiProductSchema.safeParse({ ...validProduct, cover: { id: idB, media: { id: idC, url: '' } } }).success).toBe(false)
  })

  it('rejects a product without an available flag (drift)', () => {
    expect(storeApiProductSchema.safeParse({ ...validProduct, available: 'yes' }).success).toBe(false)
  })

  it('rejects a product without stock', () => {
    const { availableStock: _availableStock, ...rest } = validProduct
    expect(storeApiProductSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects a product without seo urls (slug source)', () => {
    expect(storeApiProductSchema.safeParse({ ...validProduct, seoUrls: [] }).success).toBe(false)
  })

  it('rejects a product without custom fields', () => {
    const { customFields: _customFields, ...rest } = validProduct
    expect(storeApiProductSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects a listing whose elements is not an array', () => {
    const result = storeApiProductListingSchema.safeParse({ ...validListing, elements: validProduct })
    expect(result.success).toBe(false)
  })

  it('rejects a listing without total', () => {
    const { total: _total, ...rest } = validListing
    expect(storeApiProductListingSchema.safeParse(rest).success).toBe(false)
  })
})

describe('catalog contract mapping', () => {
  it('maps a store-api product to a narrow portal entity', () => {
    expect(toCatalogProduct(validProduct)).toEqual({
      id: idA,
      name: 'AC/DC Wallbox Pro',
      price: 49999,
      imageUrl: 'https://cdn.example/media/thumbnail/box.jpg',
      inStock: true,
      stock: 3,
      slug: '/catalog/ac-dc-wallbox-pro',
      customFields: { bundleCode: 'WBX-PRO' },
    })
  })

  it('maps the slug from the first seo url', () => {
    const product = {
      ...validProduct,
      seoUrls: [
        { id: idB, seoPathInfo: '/first' },
        { id: idC, seoPathInfo: '/second' },
      ],
    }
    expect(toCatalogProduct(product).slug).toBe('/first')
  })

  it('maps a listing to items plus total', () => {
    expect(mapProductListing(validListing)).toEqual({
      total: 2,
      items: validListing.elements.map(toCatalogProduct),
    })
  })

  it('produces portal entities that satisfy the portal layer schema', () => {
    const mapped = mapProductListing(validListing)
    for (const item of mapped.items) {
      expect(catalogProductSchema.safeParse(item).success).toBe(true)
    }
  })
})
