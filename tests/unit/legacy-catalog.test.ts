import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
// @ts-expect-error plain .mjs module without type declarations
import { categories, products, queryListing } from '../../legacy/catalog.mjs'
import { storeApiProductSchema } from '#shared/contracts/catalog'

const publicFile = (url: string) => path.resolve(process.cwd(), 'public', url.replace(/^\//, ''))

describe('legacy catalogue (WP-03)', () => {
  const connectorLabels = {
    type1: 'Typ 1',
    type2: 'Typ 2',
    ccs: 'CCS',
    card: 'Ladekarte',
    cee: 'CEE',
    schuko: 'Schuko',
    mixed: 'Typ 1/Typ 2',
  }

  it('parses every product with the Store API product schema', () => {
    expect(products).toHaveLength(48)
    for (const product of products) {
      const parsed = storeApiProductSchema.parse(product)
      expect(parsed).toMatchObject({ id: product.id, translated: { name: product.name } })
    }
  })

  it('provides translated plain-text product copy and complete media metadata', async () => {
    for (const product of products) {
      expect(product.translated.name).toBe(product.name)
      const power = product.customFields.maxPowerKw === null ? [] : [`${product.customFields.maxPowerKw} kW`]
      const connector = product.customFields.connectorType === null ? [] : [connectorLabels[product.customFields.connectorType]]
      expect(product.translated.description).toBe(`${product.name}. ${[product.productNumber, ...power, ...connector].join('; ')}.`)
      expect(product.translated.description).not.toMatch(/<[^>]+>/)
      expect(product.cover.media.alt).toBe(product.name)

      const imagePath = publicFile(product.cover.media.url)
      const metadata = await sharp(imagePath).metadata()
      expect(product.cover.media.metaData).toEqual({ width: metadata.width, height: metadata.height })
      expect(product.cover.media.metaData.width).toBeGreaterThan(0)
      expect(product.cover.media.metaData.height).toBeGreaterThan(0)
    }

    expect(products[0].translated.description).toBe('Wallbox Home 7.4. WB-1001; 7.4 kW; Typ 2.')
    expect(products[24].translated.description).toBe('Ladekabel Typ 1, 5 m. AC-1001; Typ 1.')
    expect(products.find(({ name }) => name === 'Kabelring, 5 Stück').translated.description).toBe('Kabelring, 5 Stück. AC-1016.')
  })

  it('keeps existing product identities and prices while exposing typed canonical fields', () => {
    expect(products.map(({ productNumber }) => productNumber)).toEqual([
      ...Array.from({ length: 24 }, (_, index) => `WB-${1001 + index}`),
      ...Array.from({ length: 24 }, (_, index) => `AC-${1001 + index}`),
    ])

    for (const product of products) {
      expect(product.customFields).toHaveProperty('maxPowerKw')
      expect(product.customFields.maxPowerKw === null || typeof product.customFields.maxPowerKw === 'number').toBe(true)
      expect(product.customFields.connectorType === null || [
        'type1', 'type2', 'ccs', 'card', 'cee', 'schuko', 'mixed',
      ].includes(product.customFields.connectorType)).toBe(true)
    }

    expect(products.slice(0, 3).map(({ calculatedPrice }) => calculatedPrice.unitPrice)).toEqual([399, 445.75, 492.5])
    expect(products.slice(24, 27).map(({ calculatedPrice }) => calculatedPrice.unitPrice)).toEqual([24.9, 33.25, 41.6])
    expect(products.find(({ name }) => name === 'Wallbox Fleet CCS 50').calculatedPrice.unitPrice).toBe(899)
    expect(products.find(({ name }) => name === 'CCS-Schutzkappe').calculatedPrice.unitPrice).toBe(34.9)

    expect(products.find(({ name }) => name === 'Wallbox Home 7.4').customFields).toMatchObject({ maxPowerKw: 7.4, connectorType: 'type2' })
    expect(products.find(({ name }) => name === 'Wallbox Fleet CCS 50').customFields).toMatchObject({ maxPowerKw: 50, connectorType: 'ccs' })
    expect(products.find(({ name }) => name === 'Ladekabel Typ 1, 5 m').customFields).toMatchObject({ maxPowerKw: null, connectorType: 'type1' })
    expect(products.find(({ name }) => name === 'Steckeradapter CEE 16 A').customFields).toMatchObject({ maxPowerKw: null, connectorType: 'cee' })
    expect(products.find(({ name }) => name === 'Steckeradapter Schuko 16 A').customFields).toMatchObject({ maxPowerKw: null, connectorType: 'schuko' })
    expect(products.find(({ name }) => name === 'Steckeradapter Typ 1 auf Typ 2').customFields).toMatchObject({ maxPowerKw: null, connectorType: 'mixed' })
    expect(products.find(({ name }) => name === 'Kabelring, 5 Stück').customFields).toMatchObject({ maxPowerKw: null, connectorType: null })
  })

  it('freezes all existing product identities, prices, availability, images, and categories', () => {
    const baseline = products.map((product) => [
      product.id,
      product.name,
      product.slug,
      product.calculatedPrice.unitPrice,
      product.availableStock,
      product.available,
      product.cover.media.url,
      product.categoryId,
    ])
    const digest = createHash('sha256').update(JSON.stringify(baseline)).digest('hex')
    expect(digest).toBe('fb470bc38516dd05b629633b267d0ebe5b5121014027885f1a3ec6626cc8faf1')
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

  it('defines exactly 24 products per category for the default listing page', () => {
    for (const category of categories) {
      expect(products.filter((product) => product.categoryId === category.id), `category ${category.slug}`).toHaveLength(24)
    }
  })

  it('reuses existing placeholder images for the eight added fixtures', () => {
    const originalImageUrls = new Set(products.filter((product) => Number(product.productNumber.slice(3)) <= 1020).map((product) => product.cover.media.url))
    const addedProducts = products.filter((product) => Number(product.productNumber.slice(3)) > 1020)

    expect(addedProducts).toHaveLength(8)
    for (const product of addedProducts) {
      expect(originalImageUrls.has(product.cover.media.url), `${product.name} should reuse an existing image`).toBe(true)
      expect(existsSync(publicFile(product.cover.media.url)), `missing reused image ${product.cover.media.url}`).toBe(true)
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
    expect(connector.elements.every((product) => product.customFields.connectorType === 'type1')).toBe(true)
  })

  it('keeps legacy connector labels and accepts canonical keys with the same filtered products', () => {
    const legacy = queryListing(accessoryCategory.id, { connector: 'Typ 1', limit: 48 })
    const canonical = queryListing(accessoryCategory.id, { connector: 'type1', limit: 48 })
    expect(canonical.elements.map((product) => product.productNumber)).toEqual(legacy.elements.map((product) => product.productNumber))
    expect(canonical.elements.map((product) => product.productNumber).sort()).toEqual(['AC-1001', 'AC-1002', 'AC-1003'])
    expect(canonical.elements.every((product) => product.customFields.connectorType === 'type1')).toBe(true)

    const noPowerAtZero = queryListing(accessoryCategory.id, { 'min-power': 0, limit: 48 })
    expect(noPowerAtZero.total).toBe(0)
  })

  it.each([
    ['Typ 1', 'type1', ['AC-1001', 'AC-1002', 'AC-1003']],
    ['Typ 2', 'type2', ['AC-1004', 'AC-1005', 'AC-1006', 'AC-1007', 'AC-1008', 'AC-1009', 'AC-1010', 'AC-1011', 'AC-1023']],
    ['CCS', 'ccs', ['AC-1021', 'AC-1022']],
    ['CEE', 'cee', ['AC-1012']],
    ['Schuko', 'schuko', ['AC-1013']],
    ['Typ 1/Typ 2', 'mixed', ['AC-1014', 'AC-1024']],
    ['Ladekarte', 'card', []],
  ])('preserves the %s legacy connector filter result set', (legacyLabel, canonicalKey, expected) => {
    const legacy = queryListing(accessoryCategory.id, { connector: legacyLabel, limit: 48 })
    const canonical = queryListing(accessoryCategory.id, { connector: canonicalKey, limit: 48 })
    const numbers = (listing) => listing.elements.map((product) => product.productNumber).sort()
    expect(numbers(legacy)).toEqual([...expected].sort())
    expect(numbers(canonical)).toEqual(numbers(legacy))
  })

  it('returns the sorting key and typed min/max/count aggregations over all filtered products', () => {
    const wallboxes = queryListing(wallboxCategory.id, { order: 'price-asc', limit: 2 })
    expect(wallboxes.sorting).toBe('price-asc')
    expect(wallboxes.aggregations).toEqual({
      maxPowerKw: { min: 7.4, max: 75 },
      connectorType: [{ key: 'type2', count: 22 }, { key: 'ccs', count: 2 }],
    })
    expect(wallboxes.total).toBe(24)
    expect(wallboxes.elements.map((product) => product.productNumber)).toEqual(['WB-1001', 'WB-1002'])

    const accessories = queryListing(accessoryCategory.id, { limit: 2 })
    expect(accessories.aggregations).toEqual({
      maxPowerKw: { min: null, max: null },
      connectorType: [
        { key: 'type1', count: 3 },
        { key: 'type2', count: 9 },
        { key: 'ccs', count: 2 },
        { key: 'cee', count: 1 },
        { key: 'schuko', count: 1 },
        { key: 'mixed', count: 2 },
      ],
    })
    expect(accessories.total).toBe(24)
    expect(accessories.elements.map((product) => product.productNumber)).toEqual(['AC-1019', 'AC-1022'])
  })

  it('returns a non-empty strict CCS subset for both categories', () => {
    for (const category of [wallboxCategory, accessoryCategory]) {
      const all = queryListing(category.id, { limit: 48 })
      const ccs = queryListing(category.id, { connector: 'CCS', limit: 48 })
      expect(ccs.total, `CCS fixtures for ${category.slug}`).toBeGreaterThan(0)
      expect(ccs.total).toBeLessThan(all.total)
      expect(ccs.elements.every((product) => product.customFields.connectorType === 'ccs')).toBe(true)
    }
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
    expect(first).toMatchObject({ page: 1, limit: 48, total: 24 })

    const second = queryListing(wallboxCategory.id, { page: 2, limit: 3, order: 'name-asc' })
    const all = queryListing(wallboxCategory.id, { limit: 48, order: 'name-asc' })
    expect(second.elements).toEqual(all.elements.slice(3, 6))
  })

  it('returns undefined for an unknown category', () => {
    expect(queryListing('unknown-category', {})).toBeUndefined()
  })
})
