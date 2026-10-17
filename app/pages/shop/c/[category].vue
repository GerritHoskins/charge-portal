<script setup lang="ts">
import type { ShopListing } from '#shared/contracts/catalog'

definePageMeta({ layout: 'shop' })

const PAGE_SIZE = 12
const route = useRoute()
const { t } = useI18n()
const fmt = useFormatters()

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

useHead({ title: () => categoryName.value })

const { data: listing, error } = await useFetch<ShopListing>(
  () => `/api/shop/listing/${encodeURIComponent(category.value)}`,
  {
    query: computed(() => ({ page: pageNumber.value, limit: PAGE_SIZE })),
    default: () => ({ total: 0, page: pageNumber.value, limit: PAGE_SIZE, items: [] }),
  },
)

const totalPages = computed(() => Math.max(1, Math.ceil(listing.value.total / listing.value.limit)))
const pages = computed(() => Array.from({ length: totalPages.value }, (_, index) => index + 1))
const pageTarget = (page: number) => ({ path: `/shop/c/${category.value}`, query: { page } })
</script>

<template>
  <section aria-labelledby="category-heading">
    <h1 id="category-heading">{{ categoryName }}</h1>

    <DsAlert v-if="error"><p>{{ t('shop.listing.loadError') }}</p></DsAlert>

    <p class="sr-only" role="status">{{ t('shop.listing.shown', { n: listing.items.length }) }}</p>

    <ul v-if="listing.items.length" class="product-grid" :aria-label="t('shop.listing.heading')">
      <li v-for="product in listing.items" :key="product.id">
        <ShopProductCard
          :product="product"
          :href="`/shop/${product.slug}`"
          :price="fmt.money(product.priceCents)"
          :stock-label="t(product.inStock ? 'shop.product.inStock' : 'shop.product.outOfStock')"
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
