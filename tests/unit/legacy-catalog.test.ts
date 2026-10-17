import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error plain .mjs module without type declarations
import { categories, products } from '../../legacy/catalog.mjs'
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
