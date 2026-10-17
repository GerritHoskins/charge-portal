<script setup lang="ts">
import type { ShopProduct } from '#shared/contracts/catalog'

defineProps<{
  product: ShopProduct
  href: string
  price: string
  stockLabel: string
}>()
</script>

<template>
  <article class="product-card">
    <!-- baseline (WP-09): unoptimized on purpose, see WP-20 -->
    <img class="product-card__image" :src="product.image.url" :alt="product.image.alt">
    <h2><a :href="href">{{ product.name }}</a></h2>
    <p class="product-card__price">{{ price }}</p>
    <p class="product-card__stock">{{ stockLabel }}</p>
  </article>
</template>

<style scoped>
.product-card {
  height: 100%;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}
.product-card__image {
  display: block;
  max-width: 100%;
  height: auto;
}
.product-card h2 {
  margin: var(--space-3) 0 var(--space-2);
}
.product-card__price {
  margin: 0 0 var(--space-2);
  font-weight: 600;
}
.product-card__stock {
  margin: 0;
  color: var(--color-text-muted);
}
</style>
