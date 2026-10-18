import type { ShopProduct } from './contracts/catalog'

export type ProductJsonLdInput = Pick<ShopProduct, 'name' | 'priceCents' | 'image' | 'inStock'>

export type BreadcrumbItem = {
  name: string
  url: string
}

export const productJsonLd = (product: ProductJsonLdInput, url: string) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.name,
  image: new URL(product.image.url, url).toString(),
  url,
  offers: {
    '@type': 'Offer',
    price: (product.priceCents / 100).toFixed(2),
    priceCurrency: 'EUR',
    availability: product.inStock
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
    url,
  },
})

export const breadcrumbJsonLd = (items: BreadcrumbItem[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
})

export const serializeJsonLd = (value: unknown): string => (
  JSON.stringify(value).replaceAll('<', '\\u003c')
)

export const listingCanonicalUrl = (origin: string, category: string, page: number): string => {
  const url = new URL(`/shop/c/${encodeURIComponent(category)}`, origin)
  if (page >= 2) url.searchParams.set('page', String(page))
  return url.toString()
}
