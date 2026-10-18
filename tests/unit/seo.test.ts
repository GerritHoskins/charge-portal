import { describe, expect, it } from 'vitest'
import {
  breadcrumbJsonLd,
  listingCanonicalUrl,
  productJsonLd,
  serializeJsonLd,
} from '#shared/seo'

const product = {
  name: 'Wallbox Test 11',
  priceCents: 1999,
  image: { url: '/shop/wallbox-test-11-1600.jpg', alt: 'Wallbox Test 11' },
  inStock: true,
} satisfies Parameters<typeof productJsonLd>[0]

describe('product JSON-LD', () => {
  it('builds an exact schema.org Product with decimal euro pricing', () => {
    expect(productJsonLd(product, 'https://shop.example/shop/wallbox-test-11')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Wallbox Test 11',
      image: 'https://shop.example/shop/wallbox-test-11-1600.jpg',
      url: 'https://shop.example/shop/wallbox-test-11',
      offers: {
        '@type': 'Offer',
        price: '19.99',
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
        url: 'https://shop.example/shop/wallbox-test-11',
      },
    })
  })

  it('maps unavailable products to schema.org OutOfStock', () => {
    const jsonLd = productJsonLd({ ...product, inStock: false }, 'https://shop.example/shop/wallbox-test-11')

    expect(jsonLd.offers.availability).toBe('https://schema.org/OutOfStock')
  })
})

describe('breadcrumb JSON-LD', () => {
  it('builds ordered ListItem entries', () => {
    expect(breadcrumbJsonLd([
      { name: 'Shop', url: 'https://shop.example/shop' },
      { name: 'Wallboxen', url: 'https://shop.example/shop/c/wallboxes' },
      { name: 'Wallbox Test 11', url: 'https://shop.example/shop/wallbox-test-11' },
    ])).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Shop', item: 'https://shop.example/shop' },
        { '@type': 'ListItem', position: 2, name: 'Wallboxen', item: 'https://shop.example/shop/c/wallboxes' },
        { '@type': 'ListItem', position: 3, name: 'Wallbox Test 11', item: 'https://shop.example/shop/wallbox-test-11' },
      ],
    })
  })
})

describe('safe JSON-LD serialization', () => {
  it('replaces every less-than sign with the literal unicode escape sequence', () => {
    const value = { name: '</script><script>alert(1)</script>' }
    const serialized = serializeJsonLd(value)

    expect(serialized).toContain('\\u003c/script>\\u003cscript>')
    expect(serialized).not.toContain('<')
    expect(JSON.parse(serialized)).toEqual(value)
  })
})

describe('listing canonical URLs', () => {
  it('strips filters from page one and preserves only page for later pages', () => {
    expect(listingCanonicalUrl('https://shop.example', 'wallboxes', 1))
      .toBe('https://shop.example/shop/c/wallboxes')
    expect(listingCanonicalUrl('https://shop.example', 'wallboxes', 3))
      .toBe('https://shop.example/shop/c/wallboxes?page=3')
  })
})
