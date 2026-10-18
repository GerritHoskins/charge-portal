import { z } from 'zod'

// The contract between the Nuxt frontend and the Shopware Store API. The BFF
// parses every Store API response with the `storeApi*` schemas, so drift fails
// loudly at the boundary instead of deep inside a component. The mapping
// functions then produce the narrow portal entities (`catalogProductSchema`)
// that components are allowed to consume.
//
// Field names verified against the official Shopware Store API reference
// (OpenAPI spec 6.7.9999999-dev,
// https://raw.githubusercontent.com/shopware/store-api-reference/main/storeapi.json,
// consulted 2026-10-18): POST /store-api/product-listing/{categoryId} returns
// ProductListingResult (elements, total, page, limit, availableSortings,
// currentFilters, sorting, aggregations); POST/GET /store-api/product/{productId}
// returns product detail. Product.translated and Media.alt/metaData.width/height
// are official field names. Required plain translated text, connector codes,
// custom power fields and simplified aggregations below are our synthetic subset,
// not a claim that these custom fields or aggregation layout are Shopware defaults.

const shopwareUuid = z.string().regex(/^[0-9a-f]{32}$/)
const plainDescription = z.string().min(1).regex(/^[^<>]+$/)
const connectorTypeSchema = z.enum(['type1', 'type2', 'ccs', 'card', 'cee', 'schuko', 'mixed'])
const sortingSchema = z.enum(['price-asc', 'price-desc', 'name-asc'])

// Simplified synthetic aggregation over all filtered matches, before pagination.
// Null/null means there are no applicable power specifications, not zero power.
const listingAggregationsSchema = z.object({
  maxPowerKw: z.object({
    min: z.number().nonnegative().nullable(),
    max: z.number().nonnegative().nullable(),
  }).refine(({ min, max }) => min === null ? max === null : max !== null && min <= max),
  connectorType: z.array(z.object({ key: connectorTypeSchema, count: z.number().int().positive() })),
})

export const storeApiProductSchema = z.object({
  id: shopwareUuid,
  productNumber: z.string(),
  name: z.string().min(1),
  translated: z.object({ name: z.string().min(1), description: plainDescription }),
  available: z.boolean(),
  availableStock: z.number().int().nonnegative(),
  calculatedPrice: z.object({ unitPrice: z.number().nonnegative() }),
  cover: z.object({ media: z.object({
    url: z.string().min(1),
    alt: z.string().min(1),
    metaData: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }),
  }) }),
  seoUrls: z.array(z.object({ seoPathInfo: z.string().min(1) })).min(1),
  customFields: z.object({
    maxPowerKw: z.number().nonnegative().nullable(),
    connectorType: connectorTypeSchema.nullable(),
  }).catchall(z.unknown()),
})

export const storeApiProductListingSchema = z.object({
  elements: z.array(storeApiProductSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  sorting: sortingSchema,
  availableSortings: z.array(z.object({ key: z.string(), label: z.string() })).optional(),
  currentFilters: z.record(z.string(), z.unknown()).optional(),
  aggregations: listingAggregationsSchema,
})

export const storeApiProductDetailSchema = z.object({
  product: storeApiProductSchema,
})

export const shopListingQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
  order: sortingSchema.default('name-asc'),
  minPower: z.coerce.number().nonnegative().optional(),
  connector: z.enum(['type2', 'ccs', 'card']).optional(),
})

// Portal entity: the only shape components may consume.
export const catalogProductSchema = z.object({
  id: shopwareUuid,
  name: z.string().min(1),
  price: z.number().nonnegative(),
  imageUrl: z.string().min(1),
  inStock: z.boolean(),
  stock: z.number().int().nonnegative(),
  slug: z.string().min(1),
  customFields: z.record(z.string(), z.unknown()),
})

export const shopProductSchema = z.object({
  id: shopwareUuid,
  name: z.string().min(1),
  description: plainDescription,
  priceCents: z.number().int().nonnegative(),
  image: z.object({
    url: z.string().min(1),
    alt: z.string().min(1),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  inStock: z.boolean(),
  stock: z.number().int().nonnegative(),
  slug: z.string().min(1),
  maxPowerKw: z.number().nonnegative().nullable(),
  connectorType: connectorTypeSchema.nullable(),
  customFields: z.record(z.string(), z.unknown()),
})

export const shopListingSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  sorting: sortingSchema,
  aggregations: listingAggregationsSchema,
  items: z.array(shopProductSchema),
})

export type StoreApiProduct = z.infer<typeof storeApiProductSchema>
export type StoreApiProductListing = z.infer<typeof storeApiProductListingSchema>
export type CatalogProduct = z.infer<typeof catalogProductSchema>
export type ShopListingQuery = z.infer<typeof shopListingQuerySchema>
export type ShopProduct = z.infer<typeof shopProductSchema>
export type ShopListing = z.infer<typeof shopListingSchema>

export function toCatalogProduct(product: StoreApiProduct): CatalogProduct {
  const slug = product.seoUrls[0]?.seoPathInfo
  if (!slug) {
    throw new Error('toCatalogProduct: store-api product without seo url')
  }
  return {
    id: product.id,
    name: product.translated.name,
    price: product.calculatedPrice.unitPrice,
    imageUrl: product.cover.media.url,
    inStock: product.available,
    stock: product.availableStock,
    slug,
    customFields: product.customFields,
  }
}

export function mapProductListing(listing: StoreApiProductListing): { total: number; items: CatalogProduct[] } {
  return {
    total: listing.total,
    items: listing.elements.map(toCatalogProduct),
  }
}

export function toShopProduct(product: StoreApiProduct): ShopProduct {
  const slug = product.seoUrls[0]?.seoPathInfo
  if (!slug) {
    throw new Error('toShopProduct: store-api product without seo url')
  }
  const { maxPowerKw, connectorType, ...customFields } = product.customFields
  // Preserve existing BFF specification labels for older callers. Pages use the
  // typed flat fields instead and must not serialize this compatibility object.
  const connectorLabels = {
    type1: 'Typ 1', type2: 'Typ 2', ccs: 'CCS', card: 'Ladekarte',
    cee: 'CEE', schuko: 'Schuko', mixed: 'Typ 1/Typ 2',
  } as const
  return {
    id: product.id,
    name: product.translated.name,
    description: product.translated.description,
    priceCents: Math.round(product.calculatedPrice.unitPrice * 100),
    image: {
      url: product.cover.media.url,
      alt: product.cover.media.alt,
      width: product.cover.media.metaData.width,
      height: product.cover.media.metaData.height,
    },
    inStock: product.available,
    stock: product.availableStock,
    slug,
    maxPowerKw,
    connectorType,
    customFields: {
      ...customFields,
      maxPowerKw,
      ...(maxPowerKw === null ? {} : { powerKw: maxPowerKw }),
      ...(connectorType === null ? {} : { connectorType: connectorLabels[connectorType] }),
    },
  }
}

export function toShopListing(listing: StoreApiProductListing): ShopListing {
  return {
    total: listing.total,
    page: listing.page,
    limit: listing.limit,
    sorting: listing.sorting,
    aggregations: listing.aggregations,
    items: listing.elements.map(toShopProduct),
  }
}
