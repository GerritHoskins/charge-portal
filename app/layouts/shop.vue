<script setup lang="ts">
const { t } = useI18n()
// The persisted count is loaded only after mount so SSR and first hydration render both omit it.
const { hydrated, itemCount } = useCart()
</script>

<template>
  <LazyShopVitals />
  <header class="app-header">
    <nav :aria-label="t('nav.main')">
      <span>Charge Portal Shop</span>
      <div class="tools">
        <NuxtLink to="/shop/cart">
          {{ t('shop.cart') }}<span v-if="hydrated" aria-live="polite">({{ t('shop.cartCount', { n: itemCount }) }})</span>
        </NuxtLink>
        <AppLocaleSwitcher />
      </div>
    </nav>
  </header>
  <main id="main" tabindex="-1">
    <slot />
  </main>
</template>

<style>
.app-header .tools > a[href='/shop/cart'] {
  display: inline-grid;
  grid-template-columns: auto auto;
  column-gap: var(--space-1);
  font-variant-numeric: tabular-nums;
}

/* Keep this hidden reserve aligned with the supported de/en shop.cartCount strings. */
.app-header .tools > a[href='/shop/cart']::before,
.app-header .tools > a[href='/shop/cart'] > span {
  grid-column: 2;
  grid-row: 1;
}

.app-header .tools > a[href='/shop/cart']::before {
  content: '(999 Artikel)';
  visibility: hidden;
}

html[lang='en'] .app-header .tools > a[href='/shop/cart']::before {
  content: '(999 items)';
}
</style>
