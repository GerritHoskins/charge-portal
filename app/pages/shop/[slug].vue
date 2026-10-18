<script setup lang="ts">
import type { ShopListing, ShopProduct } from '#shared/contracts/catalog'
import { breadcrumbJsonLd, productJsonLd, serializeJsonLd } from '#shared/seo'

definePageMeta({ layout: 'shop' })

type ProductPageData = Pick<ShopProduct, 'slug' | 'name' | 'priceCents' | 'image' | 'inStock'> & {
  customFields: { powerKw?: number; connectorType?: string }
}
type RelatedCardProduct = Pick<ShopProduct, 'id' | 'slug' | 'name' | 'priceCents' | 'image' | 'inStock'>
type RelatedProductsData = { items: RelatedCardProduct[] }

const route = useRoute()
const { t } = useI18n()
const fmt = useFormatters()
const announcement = ref('')
const { addItem } = useCart()
const { track } = useShopEvents()
const requestUrl = useRequestURL()
const isShopImage = (url: string) => url.startsWith('/shop/') && url.endsWith('-1600.jpg') && !url.includes('..')
const shopImageUrl = (url: string) => isShopImage(url) ? `/_ipx/f_webp&w_800${url}` : url
const shopImageSrcset = (url: string) => isShopImage(url)
  ? `/_ipx/f_webp&w_320${url} 320w, /_ipx/f_webp&w_400${url} 400w, /_ipx/f_webp&w_448${url} 448w, /_ipx/f_webp&w_640${url} 640w, /_ipx/f_webp&w_800${url} 800w, /_ipx/f_webp&w_1200${url} 1200w, /_ipx/f_webp&w_1600${url} 1600w`
  : undefined

const slug = computed(() => String(route.params.slug))
const { data: product, error: productError } = await useFetch(
  () => `/api/shop/products/${encodeURIComponent(slug.value)}`,
  {
    transform: (data: ShopProduct): ProductPageData => ({
      slug: data.slug,
      name: data.name,
      priceCents: data.priceCents,
      image: data.image,
      inStock: data.inStock,
      customFields: {
        ...(typeof data.customFields.powerKw === 'number' ? { powerKw: data.customFields.powerKw } : {}),
        ...(typeof data.customFields.connectorType === 'string'
          ? { connectorType: data.customFields.connectorType }
          : {}),
      },
    }),
  },
)

const notFound = computed(() => productError.value?.statusCode === 404)
if (import.meta.server && notFound.value) {
  const event = useRequestEvent()
  if (event) setResponseStatus(event, 404)
}

onMounted(() => {
  if (product.value) track('product_view')
})

// The narrow ShopProduct contract has no category field. For this synthetic two-category
// catalogue, powerKw identifies wallboxes; everything else belongs to accessories.
const category = computed(() => (
  typeof product.value?.customFields.powerKw === 'number' ? 'wallboxes' : 'accessories'
))
const categoryName = computed(() => t(`shop.categories.${category.value}`))

const { data: categoryListing } = await useFetch(
  () => `/api/shop/listing/${category.value}`,
  {
    key: computed(() => `shop-related-${category.value}-${slug.value}`),
    query: { limit: 48 },
    immediate: Boolean(product.value),
    default: () => ({ items: [] } satisfies RelatedProductsData),
    transform: (data: ShopListing): RelatedProductsData => ({
      items: data.items
        .filter(({ slug: relatedSlug }) => relatedSlug !== product.value?.slug)
        .slice(0, 8)
        .map(({ id, slug: relatedSlug, name, priceCents, image, inStock }) => ({
          id,
          slug: relatedSlug,
          name,
          priceCents,
          image,
          inStock,
        })),
    }),
  },
)
const relatedProducts = computed(() => categoryListing.value.items)

const maxPower = computed(() => {
  const value = product.value?.customFields.powerKw
  return typeof value === 'number' ? `${value} kW` : '—'
})
const connectorType = computed(() => {
  const value = product.value?.customFields.connectorType
  return typeof value === 'string' ? value : '—'
})

const canonicalUrl = computed(() => new URL(route.path, requestUrl.origin).toString())
const productDescription = computed(() => (
  product.value
    ? `${product.value.name}. ${t('shop.listing.caption')}`.slice(0, 155)
    : t('shop.product.notFound')
))
const productImage = computed(() => (
  product.value ? new URL(product.value.image.url, requestUrl.origin).toString() : undefined
))
const productHeroUrl = computed(() => product.value ? shopImageUrl(product.value.image.url) : undefined)
const productHeroSrcset = computed(() => product.value ? shopImageSrcset(product.value.image.url) : undefined)

useSeoMeta({
  title: () => product.value?.name ?? t('shop.product.notFound'),
  description: () => productDescription.value,
  ogTitle: () => product.value?.name ?? t('shop.product.notFound'),
  ogImage: () => productImage.value,
  ogType: 'website',
})

useHead(() => ({
  link: [
    { rel: 'canonical', href: canonicalUrl.value },
    ...(productHeroUrl.value && productHeroSrcset.value
      ? [{
          rel: 'preload' as const,
          as: 'image' as const,
          href: productHeroUrl.value,
          imagesrcset: productHeroSrcset.value,
          imagesizes: '100vw',
          fetchpriority: 'high' as const,
        }]
      : []),
  ],
  script: product.value
    ? [
        {
          key: 'product-json-ld',
          type: 'application/ld+json',
          innerHTML: serializeJsonLd(productJsonLd(product.value, canonicalUrl.value)),
        },
        {
          key: 'product-breadcrumb-json-ld',
          type: 'application/ld+json',
          innerHTML: serializeJsonLd(breadcrumbJsonLd([
            { name: t('shop.breadcrumb.home'), url: new URL('/shop', requestUrl.origin).toString() },
            { name: categoryName.value, url: new URL(`/shop/c/${category.value}`, requestUrl.origin).toString() },
            { name: product.value.name, url: canonicalUrl.value },
          ])),
        },
      ]
    : [],
}))

const onAddToCart = async () => {
  if (!product.value) return
  addItem({
    slug: product.value.slug,
    name: product.value.name,
    priceCents: product.value.priceCents,
  })
  track('add_to_cart')
  announcement.value = ''
  await nextTick()
  announcement.value = t('shop.product.added')
}
</script>

<template>
  <article v-if="product" class="product-page" aria-labelledby="product-heading">
    <nav :aria-label="t('shop.breadcrumb.label')">
      <ol class="breadcrumb">
        <li><NuxtLink to="/shop">{{ t('shop.breadcrumb.home') }}</NuxtLink></li>
        <li><NuxtLink :to="`/shop/c/${category}`">{{ categoryName }}</NuxtLink></li>
        <li aria-current="page">{{ product.name }}</li>
      </ol>
    </nav>

    <h1 id="product-heading">{{ product.name }}</h1>
    <img
      class="product-hero"
      :src="productHeroUrl"
      :srcset="productHeroSrcset"
      sizes="100vw"
      :alt="product.image.alt"
      width="1600"
      height="1600"
      loading="eager"
      fetchpriority="high"
    >

    <p>{{ t('shop.listing.caption') }}</p>
    <p>{{ fmt.money(product.priceCents) }}</p>
    <p id="product-stock">{{ t(product.inStock ? 'shop.product.inStock' : 'shop.product.outOfStock') }}</p>

    <section aria-labelledby="product-specs-heading">
      <h2 id="product-specs-heading">{{ t('shop.product.specs') }}</h2>
      <dl class="product-specs">
        <div>
          <dt>{{ t('shop.product.maxPower') }}</dt>
          <dd>{{ maxPower }}</dd>
        </div>
        <div>
          <dt>{{ t('shop.product.connector') }}</dt>
          <dd>{{ connectorType }}</dd>
        </div>
      </dl>
    </section>

    <DsButton
      :disabled="!product.inStock"
      aria-describedby="product-stock"
      @click="onAddToCart"
    >
      {{ t('shop.product.addToCart') }}
    </DsButton>
    <p role="status" aria-live="polite">{{ announcement }}</p>

    <section v-if="relatedProducts.length" aria-labelledby="related-heading">
      <h2 id="related-heading">{{ t('shop.listing.heading') }}</h2>
      <ul class="product-grid" :aria-label="t('shop.listing.heading')">
        <li v-for="related in relatedProducts" :key="related.id">
          <ShopProductCard
            :product="related"
            :href="`/shop/${related.slug}`"
            :price="fmt.money(related.priceCents)"
            :stock-label="t(related.inStock ? 'shop.product.inStock' : 'shop.product.outOfStock')"
            image-optimized
          />
        </li>
      </ul>
    </section>
  </article>

  <section v-else-if="notFound" aria-labelledby="not-found-heading">
    <h1 id="not-found-heading">{{ t('shop.product.notFound') }}</h1>
    <p>{{ t('shop.listing.caption') }}</p>
  </section>

  <DsAlert v-else-if="productError">
    <p>{{ t('shop.listing.loadError') }}</p>
  </DsAlert>
</template>

<style scoped>
.product-page,
.product-specs,
.product-grid {
  display: grid;
  gap: var(--space-4);
}
.breadcrumb,
.product-grid {
  margin: 0;
  padding: 0;
  list-style: none;
}
.breadcrumb {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.product-hero {
  max-width: 100%;
  height: auto;
}
.product-specs div {
  display: grid;
  gap: var(--space-1);
}
.product-specs dd {
  margin: 0;
}
.product-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, calc(var(--bp-md) / 2)), 1fr));
}
</style>
