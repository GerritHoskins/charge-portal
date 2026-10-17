import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error plain .mjs module without type declarations
import { categories, products, queryListing } from '../../legacy/catalog.mjs'
import { storeApiProductSchema } from '#shared/contracts/catalog'

const publicFile = (url: string) => path.resolve(process.cwd(), 'public', url.replace(/^\//, ''))

describe('legacy catalogue (WP-03)', () => {
  it('parses every product with the Store API product schema', () => {
    expect(products).toHaveLength(40)
    for (const product of products) {
      const parsed = storeApiProductSchema.parse(product)
      expect(parsed).toMatchObject({ id: product.id, name: product.name })
    }
  })

  it('keeps product ids and seoPathInfo values unique', () => {
    const ids = products.map((product) => product.id)
    expect(new Set(ids).size).toBe(ids.length)
    const slugs = products.flatMap((product) => product.seoUrls.map((seoUrl) => seoUrl.seoPathInfo))
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('references an image file that exists on disk for every product', () => {
    for (const product of products) {
      const url = product.cover.media.url
      expect(existsSync(publicFile(url)), `missing image ${url} for ${product.name}`).toBe(true)
    }
  })

  it('defines two categories with at least 15 products each', () => {
    expect(categories).toHaveLength(2)
    for (const category of categories) {
      const count = products.filter((product) => product.categoryId === category.id).length
      expect(count, `category ${category.slug}`).toBeGreaterThanOrEqual(15)
    }
  })

  it('links every product to one of the two categories', () => {
    const ids = new Set(categories.map((category) => category.id))
    for (const product of products) {
      expect(ids.has(product.categoryId), `product ${product.name}`).toBe(true)
    }
  })
})

describe('queryListing (WP-04)', () => {
  const wallboxCategory = categories.find((category) => category.slug === 'wallboxes')
  const accessoryCategory = categories.find((category) => category.slug === 'accessories')

  it('filters by minimum power and connector type', () => {
    const powered = queryListing(wallboxCategory.id, { 'min-power': 22 })
    expect(powered.elements).not.toHaveLength(0)
    expect(powered.elements.every((product) => product.customFields.powerKw >= 22)).toBe(true)

    const connector = queryListing(accessoryCategory.id, { connector: 'Typ 1' })
    expect(connector.elements).not.toHaveLength(0)
    expect(connector.elements.every((product) => product.customFields.connectorType === 'Typ 1')).toBe(true)
  })

  it.each([
    ['price-asc', (product) => product.calculatedPrice.unitPrice],
    ['price-desc', (product) => -product.calculatedPrice.unitPrice],
    ['name-asc', (product) => product.name],
  ])('sorts by %s', (order, valueOf) => {
    const listing = queryListing(wallboxCategory.id, { order, limit: 48 })
    const values = listing.elements.map(valueOf)
    const expected = [...values].sort((left, right) =>
      typeof left === 'string' ? left.localeCompare(right, 'de') : left - right,
    )
    expect(values).toEqual(expected)
  })

  it('paginates after filtering and clamps page and limit bounds', () => {
    const first = queryListing(wallboxCategory.id, { page: -5, limit: 100, order: 'name-asc' })
    expect(first).toMatchObject({ page: 1, limit: 48, total: 20 })

    const second = queryListing(wallboxCategory.id, { page: 2, limit: 3, order: 'name-asc' })
    const all = queryListing(wallboxCategory.id, { limit: 48, order: 'name-asc' })
    expect(second.elements).toEqual(all.elements.slice(3, 6))
  })

  it('returns undefined for an unknown category', () => {
    expect(queryListing('unknown-category', {})).toBeUndefined()
  })
})
