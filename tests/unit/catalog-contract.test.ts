import { describe, expect, it } from 'vitest'
import {
  catalogProductSchema,
  mapProductListing,
  shopListingSchema,
  shopProductSchema,
  shopListingQuerySchema,
  storeApiProductListingSchema,
  storeApiProductSchema,
  toCatalogProduct,
  toShopListing,
  toShopProduct,
} from '#shared/contracts/catalog'

const idA = 'd8e9c1b2a3f4e5d6c7b8a9d0e1f2a3b4'
const idB = '0123456789abcdef0123456789abcdef'
const idC = 'fedcba9876543210fedcba9876543210'
const idD = 'a1b2c3d4e5f60718293648a5b6c7d8e9'

const validProduct = {
  id: idA,
  productNumber: 'SW-14573',
  name: 'AC/DC Wallbox Pro',
  translated: { name: 'AC/DC Wallbox Pro', description: 'AC/DC Wallbox Pro. 22 kW; Typ 2.' },
  available: true,
  availableStock: 3,
  calculatedPrice: { apiAlias: 'calculated_price', unitPrice: 49999, totalPrice: 49999, quantity: 1 },
  cover: { id: idB, mediaId: idC, productId: idA, media: { id: idC, url: 'https://cdn.example/media/thumbnail/box.jpg', alt: 'Wallbox', metaData: { width: 1600, height: 1200 } } },
  seoUrls: [
    { id: idB, routeName: 'product', pathInfo: 'a1b2', seoPathInfo: '/catalog/ac-dc-wallbox-pro' },
  ],
  customFields: { bundleCode: 'WBX-PRO', maxPowerKw: 22, connectorType: 'type2' as const },
}

const validListing = {
  total: 2,
  page: 1,
  limit: 24,
  sorting: 'name-asc' as const,
  apiAlias: 'product_listing',
  elements: [validProduct, { ...validProduct, id: idD, productNumber: 'SW-20007', name: 'Wallbox Lite', availableStock: 1 }],
  availableSortings: [{ key: 'name-asc', label: 'Name A-Z' }],
  currentFilters: { manufacturer: [], price: { min: 0, max: 0 }, properties: [], rating: null, 'shipping-free': false },
  aggregations: { maxPowerKw: { min: 22, max: 22 }, connectorType: [{ key: 'type2' as const, count: 2 }] },
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
      customFields: validProduct.customFields,
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

describe('shop listing query contract', () => {
  it('coerces numeric query strings and applies defaults', () => {
    expect(shopListingQuerySchema.parse({ page: '2', limit: '12', minPower: '11', connector: 'ccs' })).toEqual({
      page: 2,
      limit: 12,
      order: 'name-asc',
      minPower: 11,
      connector: 'ccs',
    })
  })

  it.each([
    { page: '0' },
    { limit: '0' },
    { limit: '49' },
    { minPower: '-1' },
  ])('rejects out-of-bounds numeric input %#', (query) => {
    expect(shopListingQuerySchema.safeParse(query).success).toBe(false)
  })

  it('rejects an unknown order', () => {
    expect(shopListingQuerySchema.safeParse({ order: 'bogus' }).success).toBe(false)
  })
})

describe('shop response mapping', () => {
  it('maps Store API euro amounts to integer cents and supplies image alt text', () => {
    expect(toShopProduct({ ...validProduct, calculatedPrice: { unitPrice: 499.99 } })).toEqual({
      id: idA,
      name: 'AC/DC Wallbox Pro',
      description: validProduct.translated.description,
      priceCents: 49999,
      image: {
        url: 'https://cdn.example/media/thumbnail/box.jpg',
        alt: 'Wallbox',
        width: 1600,
        height: 1200,
      },
      inStock: true,
      stock: 3,
      slug: '/catalog/ac-dc-wallbox-pro',
      maxPowerKw: 22,
      connectorType: 'type2',
      customFields: { bundleCode: 'WBX-PRO', maxPowerKw: 22, powerKw: 22, connectorType: 'Typ 2' },
    })
  })

  it('maps listing pagination and products to the public shop shape', () => {
    const listing = { ...validListing, elements: [{ ...validProduct, calculatedPrice: { unitPrice: 499.99 } }] }
    expect(toShopListing(listing)).toEqual({
      total: 2,
      page: 1,
      limit: 24,
      sorting: 'name-asc',
      aggregations: listing.aggregations,
      items: [toShopProduct(listing.elements[0])],
    })
  })
})

describe('reopened WP-02 required fields and typed metadata', () => {
  it.each([
    { translated: undefined },
    { translated: { name: '', description: 'Description' } },
    { translated: { name: 'Name', description: '' } },
    { translated: { name: 'Name', description: '<p>Not plain text</p>' } },
    { cover: undefined },
    { cover: { media: { url: '/image.jpg', alt: 'Image', metaData: { width: 0, height: 100 } } } },
    { cover: { media: { url: '/image.jpg', alt: '', metaData: { width: 100, height: 100 } } } },
    { cover: { media: { url: '/image.jpg', alt: 'Image' } } },
    { calculatedPrice: { unitPrice: '19.99' } },
    { calculatedPrice: { unitPrice: -1 } },
    { calculatedPrice: { unitPrice: Number.NaN } },
    { calculatedPrice: { unitPrice: Number.POSITIVE_INFINITY } },
    { availableStock: -1 },
    { customFields: { maxPowerKw: 11, connectorType: 'unknown' } },
    { customFields: { maxPowerKw: -1, connectorType: 'type2' } },
    { customFields: {} },
  ])('rejects required-field drift %#', (patch) => {
    expect(storeApiProductSchema.safeParse({ ...validProduct, ...patch }).success).toBe(false)
  })

  it.each(['type1', 'type2', 'ccs', 'card', 'cee', 'schuko', 'mixed', null] as const)('faithfully maps connector %s', (connectorType) => {
    const raw = storeApiProductSchema.parse({ ...validProduct, customFields: { maxPowerKw: null, connectorType } })
    const mapped = toShopProduct(raw)
    expect(mapped.connectorType).toBe(connectorType)
    expect(mapped.maxPowerKw).toBeNull()
    expect(shopProductSchema.safeParse(mapped).success).toBe(true)
  })

  it('uses translated fields and real image metadata rather than top-level fallback text', () => {
    const raw = storeApiProductSchema.parse({ ...validProduct, name: 'Untranslated fallback' })
    expect(toShopProduct(raw)).toMatchObject({
      name: validProduct.translated.name,
      description: validProduct.translated.description,
      image: { alt: 'Wallbox', width: 1600, height: 1200 },
    })
    expect(toCatalogProduct(raw).name).toBe(validProduct.translated.name)
  })

  it.each([[19.99, 1999], [0.1 + 0.2, 30]])('rounds %s euros to %s integer cents', (unitPrice, cents) => {
    expect(toShopProduct(storeApiProductSchema.parse({ ...validProduct, calculatedPrice: { unitPrice } })).priceCents).toBe(cents)
  })

  it.each([
    { sorting: undefined },
    { sorting: 'unknown' },
    { aggregations: undefined },
    { aggregations: { maxPowerKw: { min: 22, max: 11 }, connectorType: [] } },
    { aggregations: { maxPowerKw: { min: null, max: 11 }, connectorType: [] } },
    { aggregations: { maxPowerKw: { min: 0, max: 22 }, connectorType: [{ key: 'unknown', count: 1 }] } },
    { aggregations: { maxPowerKw: { min: 0, max: 22 }, connectorType: [{ key: 'type2', count: -1 }] } },
  ])('rejects listing metadata drift %#', (patch) => {
    expect(storeApiProductListingSchema.safeParse({ ...validListing, ...patch }).success).toBe(false)
  })

  it('maps a no-power empty listing with null range and no connector buckets', () => {
    const raw = storeApiProductListingSchema.parse({ ...validListing, elements: [], total: 0, aggregations: { maxPowerKw: { min: null, max: null }, connectorType: [] } })
    expect(shopListingSchema.parse(toShopListing(raw))).toMatchObject({ sorting: 'name-asc', aggregations: raw.aggregations, items: [] })
  })

  it('does not mutate parsed inputs or broaden the public query options', () => {
    const raw = storeApiProductListingSchema.parse(validListing)
    const before = structuredClone(raw)
    toShopListing(raw)
    expect(raw).toEqual(before)
    expect(shopListingQuerySchema.safeParse({ connector: 'type1' }).success).toBe(false)
  })
})
