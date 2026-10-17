<script setup lang="ts">
import type { ShopListing } from '#shared/contracts/catalog'
import { breadcrumbJsonLd, listingCanonicalUrl, serializeJsonLd } from '#shared/seo'

definePageMeta({ layout: 'shop' })

const PAGE_SIZE = 12
const CONNECTORS = ['type2', 'ccs', 'card'] as const
const ORDERS = ['price-asc', 'price-desc', 'name-asc'] as const
type Connector = typeof CONNECTORS[number]
type Order = typeof ORDERS[number]

const route = useRoute()
const { t } = useI18n()
const fmt = useFormatters()
const requestUrl = useRequestURL()
const { track } = useShopEvents()

onMounted(() => track('listing_view'))

const queryValue = (value: string | (string | null)[] | null | undefined) => {
  const first = Array.isArray(value) ? value[0] : value
  return first ?? ''
}

const category = computed(() => String(route.params.category))
const categoryName = computed(() => {
  if (category.value === 'wallboxes') return t('shop.categories.wallboxes')
  if (category.value === 'accessories') return t('shop.categories.accessories')
  return category.value
})
const pageNumber = computed(() => {
  const raw = Array.isArray(route.query.page) ? route.query.page[0] : route.query.page
  const parsed = Number(raw ?? 1)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
})
const minPower = computed(() => {
  const value = queryValue(route.query.minPower)
  const parsed = Number(value)
  return value !== '' && Number.isFinite(parsed) && parsed >= 0 ? value : ''
})
const connector = computed<Connector | ''>(() => {
  const value = queryValue(route.query.connector)
  return CONNECTORS.includes(value as Connector) ? value as Connector : ''
})
const order = computed<Order>(() => {
  const value = queryValue(route.query.order)
  return ORDERS.includes(value as Order) ? value as Order : 'name-asc'
})
const tenant = computed(() => queryValue(route.query.tenant))
const activeQuery = computed(() => ({
  ...(minPower.value ? { minPower: minPower.value } : {}),
  ...(connector.value ? { connector: connector.value } : {}),
  ...(order.value === 'name-asc' ? {} : { order: order.value }),
  ...(tenant.value ? { tenant: tenant.value } : {}),
}))

const { data: listing, error } = await useFetch<ShopListing>(
  () => `/api/shop/listing/${encodeURIComponent(category.value)}`,
  {
    query: computed(() => ({
      page: pageNumber.value,
      limit: PAGE_SIZE,
      order: order.value,
      ...(minPower.value ? { minPower: minPower.value } : {}),
      ...(connector.value ? { connector: connector.value } : {}),
    })),
    default: () => ({ total: 0, page: pageNumber.value, limit: PAGE_SIZE, items: [] }),
  },
)

const totalPages = computed(() => Math.max(1, Math.ceil(listing.value.total / listing.value.limit)))
const pages = computed(() => Array.from({ length: totalPages.value }, (_, index) => index + 1))
const pageTarget = (page: number) => ({ path: `/shop/c/${category.value}`, query: { ...activeQuery.value, page } })
// Canonicals remove every filter. Page one points to the unfiltered category; later pages
// retain only their page number so paginated inventory remains independently discoverable.
const canonicalUrl = computed(() => listingCanonicalUrl(requestUrl.origin, category.value, pageNumber.value))
const listingImage = computed(() => {
  const image = listing.value.items[0]?.image.url
  return image ? new URL(image, requestUrl.origin).toString() : undefined
})

useSeoMeta({
  title: () => categoryName.value,
  description: () => t('shop.listing.caption'),
  ogTitle: () => categoryName.value,
  ogImage: () => listingImage.value,
  ogType: 'website',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  script: [{
    key: 'listing-breadcrumb-json-ld',
    type: 'application/ld+json',
    innerHTML: serializeJsonLd(breadcrumbJsonLd([
      { name: t('shop.breadcrumb.home'), url: new URL('/shop', requestUrl.origin).toString() },
      { name: categoryName.value, url: canonicalUrl.value },
    ])),
  }],
}))

// baseline (WP-10): no debounce on purpose, see WP-24
const onFilterInput = (event: Event) => {
  const control = event.currentTarget as HTMLInputElement | HTMLSelectElement
  if (!['minPower', 'connector', 'order'].includes(control.name)) return

  const query: Record<string, string> = { ...activeQuery.value }
  delete query[control.name]
  if (control.value && !(control.name === 'order' && control.value === 'name-asc')) {
    query[control.name] = control.value
  }
  void navigateTo({ path: route.path, query })
}
</script>

<template>
  <section aria-labelledby="category-heading">
    <h1 id="category-heading">{{ categoryName }}</h1>

    <form class="filters" method="get" :action="route.path">
      <fieldset>
        <legend>{{ t('shop.filter.heading') }}</legend>

        <div class="filter-control">
          <label for="min-power">{{ t('shop.filter.minPower') }} (kW)</label>
          <input id="min-power" name="minPower" type="number" min="0" step="1" :value="minPower" @input="onFilterInput">
        </div>

        <div class="filter-control">
          <label for="connector">{{ t('shop.filter.connector') }}</label>
          <select id="connector" name="connector" :value="connector" @input="onFilterInput">
            <option value="">{{ t('shop.filter.connectorAll') }}</option>
            <option value="ccs">{{ t('shop.filter.connectorType.ccs') }}</option>
            <option value="type2">{{ t('shop.filter.connectorType.type2') }}</option>
            <option value="card">{{ t('shop.filter.connectorType.card') }}</option>
          </select>
        </div>

        <div class="filter-control">
          <label for="order">{{ t('shop.sort.label') }}</label>
          <select id="order" name="order" :value="order" @input="onFilterInput">
            <option value="name-asc">{{ t('shop.sort.nameAsc') }}</option>
            <option value="price-asc">{{ t('shop.sort.priceAsc') }}</option>
            <option value="price-desc">{{ t('shop.sort.priceDesc') }}</option>
          </select>
        </div>
      </fieldset>
      <input v-if="tenant" type="hidden" name="tenant" :value="tenant">
      <DsButton type="submit">{{ t('shop.filter.heading') }}</DsButton>
    </form>

    <DsAlert v-if="error"><p>{{ t('shop.listing.loadError') }}</p></DsAlert>

    <p class="sr-only" role="status">{{ t('shop.listing.shown', { n: listing.items.length }) }}</p>

    <ul v-if="listing.items.length" class="product-grid" :aria-label="t('shop.listing.heading')">
      <li v-for="(product, index) in listing.items" :key="product.id">
        <ShopProductCard
          :product="product"
          :href="`/shop/${product.slug}`"
          :price="fmt.money(product.priceCents)"
          :stock-label="t(product.inStock ? 'shop.product.inStock' : 'shop.product.outOfStock')"
          :image-loading="index < 3 ? 'eager' : 'lazy'"
          :image-fetch-priority="index === 0 ? 'high' : undefined"
          image-optimized
        />
      </li>
    </ul>
    <p v-else-if="!error">{{ t('shop.listing.empty') }}</p>

    <nav v-if="totalPages > 1" class="pagination" :aria-label="t('shop.pagination.label')">
      <NuxtLink v-if="listing.page > 1" :to="pageTarget(listing.page - 1)">{{ t('shop.pagination.prev') }}</NuxtLink>
      <template v-for="page in pages" :key="page">
        <span v-if="page === listing.page" aria-current="page">{{ page }}</span>
        <NuxtLink v-else :to="pageTarget(page)">{{ page }}</NuxtLink>
      </template>
      <NuxtLink v-if="listing.page < totalPages" :to="pageTarget(listing.page + 1)">{{ t('shop.pagination.next') }}</NuxtLink>
      <span>{{ t('shop.pagination.page', { n: listing.page, total: totalPages }) }}</span>
    </nav>
  </section>
</template>

<style scoped>
.filters {
  margin-bottom: var(--space-4);
}
.filters fieldset {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, calc(var(--bp-md) / 3)), 1fr));
  gap: var(--space-3);
  margin: 0 0 var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.filters legend {
  padding: 0 var(--space-1);
  font-weight: 600;
}
.filter-control {
  display: grid;
  gap: var(--space-1);
}
.filter-control input,
.filter-control select {
  min-height: var(--control-min-height);
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-bg);
  color: var(--color-text);
  font: inherit;
}
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, calc(var(--bp-md) / 2)), 1fr));
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}
.pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-4);
}
.pagination a,
.pagination [aria-current] {
  display: inline-flex;
  min-height: var(--control-min-height);
  align-items: center;
  padding: 0 var(--space-2);
}
</style>
