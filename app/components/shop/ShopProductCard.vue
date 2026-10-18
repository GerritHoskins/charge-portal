<script setup lang="ts">
import { computed } from 'vue'
import type { ShopProduct } from '#shared/contracts/catalog'

type ShopProductCardProduct = Pick<ShopProduct, 'name' | 'image'> & Partial<ShopProduct>

const props = withDefaults(defineProps<{
  product: ShopProductCardProduct
  href: string
  price: string
  stockLabel: string
  imageLoading?: 'eager' | 'lazy'
  imageFetchPriority?: 'high' | 'low' | 'auto'
  imageOptimized?: boolean
}>(), {
  imageLoading: 'lazy',
  imageFetchPriority: undefined,
  imageOptimized: false,
})

const imageWidths = [320, 400, 448, 640, 800, 1200, 1600] as const
const imageSizes = '(min-width: 1352px) 25vw, (min-width: 1008px) 33vw, (min-width: 664px) 50vw, 100vw'
const imageSource = computed(() => {
  const url = props.product.image.url
  const canOptimize = props.imageOptimized
    && url.startsWith('/shop/')
    && url.endsWith('-1600.jpg')
    && !url.includes('..')
  return {
    src: canOptimize ? `/_ipx/f_webp&w_800${url}` : url,
    srcset: canOptimize
      ? imageWidths.map((width) => `/_ipx/f_webp&w_${width}${url} ${width}w`).join(', ')
      : undefined,
  }
})
</script>

<template>
  <article class="product-card">
    <img
      class="product-card__image"
      :src="imageSource.src"
      :srcset="imageSource.srcset"
      :sizes="imageSource.srcset ? imageSizes : undefined"
      :alt="product.image.alt"
      :loading="imageLoading"
      :fetchpriority="imageFetchPriority"
      width="1600"
      height="1600"
    >
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
