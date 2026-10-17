<script setup lang="ts">
import type { ShopListing, ShopProduct } from '#shared/contracts/catalog'

definePageMeta({ layout: 'shop' })

const route = useRoute()
const { t } = useI18n()
const fmt = useFormatters()
const announcement = ref('')
const { addItem } = useCart()

const slug = computed(() => String(route.params.slug))
const { data: product, error: productError } = await useFetch<ShopProduct>(
  () => `/api/shop/products/${encodeURIComponent(slug.value)}`,
)

const notFound = computed(() => productError.value?.statusCode === 404)
if (import.meta.server && notFound.value) {
  const event = useRequestEvent()
  if (event) setResponseStatus(event, 404)
}

// The narrow ShopProduct contract has no category field. For this synthetic two-category
// catalogue, powerKw identifies wallboxes; everything else belongs to accessories.
const category = computed(() => (
  typeof product.value?.customFields.powerKw === 'number' ? 'wallboxes' : 'accessories'
))
const categoryName = computed(() => t(`shop.categories.${category.value}`))

const { data: categoryListing } = await useFetch<ShopListing>(
  () => `/api/shop/listing/${category.value}`,
  {
    query: { limit: 48 },
    default: () => ({ total: 0, page: 1, limit: 48, items: [] }),
  },
)
const relatedProducts = computed(() => categoryListing.value.items
  .filter(({ slug: relatedSlug }) => relatedSlug !== product.value?.slug)
  .slice(0, 8))

const maxPower = computed(() => {
  const value = product.value?.customFields.powerKw
  return typeof value === 'number' ? `${value} kW` : '—'
})
const connectorType = computed(() => {
  const value = product.value?.customFields.connectorType
  return typeof value === 'string' ? value : '—'
})

useHead({ title: () => product.value?.name ?? t('shop.product.notFound') })

const onAddToCart = async () => {
  if (!product.value) return
  addItem({
    slug: product.value.slug,
    name: product.value.name,
    priceCents: product.value.priceCents,
  })
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
    <!-- baseline (WP-09): unoptimized on purpose, see WP-20 -->
    <img class="product-hero" :src="product.image.url" :alt="product.image.alt">

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
