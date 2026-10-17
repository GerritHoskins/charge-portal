import { z } from 'zod'

// The contract between the Nuxt frontend and the Shopware Store API. The BFF
// parses every Store API response with the `storeApi*` schemas, so drift fails
// loudly at the boundary instead of deep inside a component. The mapping
// functions then produce the narrow portal entities (`catalogProductSchema`)
// that components are allowed to consume.
//
// Field names verified against the official Shopware Store API reference
// (OpenAPI spec 6.7.9999999-dev, https://shopware.stoplight.io/docs/store-api,
// consulted 2026-10-17): POST /store-api/product-listing/{categoryId} returns
// ProductListingResult (elements, total, page, limit, availableSortings,
// currentFilters, aggregations); GET /store-api/product/{productId} returns a
// Product (id, productNumber, name, available, availableStock,
// calculatedPrice.unitPrice, cover.media.url, seoUrls, customFields).

const shopwareUuid = z.string().regex(/^[0-9a-f]{32}$/)

export const storeApiProductSchema = z.object({
  id: shopwareUuid,
  productNumber: z.string(),
  name: z.string().min(1),
  available: z.boolean(),
  availableStock: z.number().int().nonnegative(),
  calculatedPrice: z.object({ unitPrice: z.number().nonnegative() }),
  cover: z.object({ media: z.object({ url: z.string().min(1) }) }),
  seoUrls: z.array(z.object({ seoPathInfo: z.string().min(1) })).min(1),
  customFields: z.record(z.string(), z.unknown()),
})

export const storeApiProductListingSchema = z.object({
  elements: z.array(storeApiProductSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  availableSortings: z.array(z.object({ key: z.string(), label: z.string() })).optional(),
  currentFilters: z.record(z.string(), z.unknown()).optional(),
  aggregations: z.unknown().optional(),
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

export type StoreApiProduct = z.infer<typeof storeApiProductSchema>
export type StoreApiProductListing = z.infer<typeof storeApiProductListingSchema>
export type CatalogProduct = z.infer<typeof catalogProductSchema>

export function toCatalogProduct(product: StoreApiProduct): CatalogProduct {
  const slug = product.seoUrls[0]?.seoPathInfo
  if (!slug) {
    throw new Error('toCatalogProduct: store-api product without seo url')
  }
  return {
    id: product.id,
    name: product.name,
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
