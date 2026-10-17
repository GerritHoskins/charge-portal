<script setup lang="ts">
const { t } = useI18n()
// The persisted count is loaded only after mount so SSR and first hydration render both omit it.
const { hydrated, itemCount } = useCart()
</script>

<template>
  <header class="app-header">
    <nav :aria-label="t('nav.main')">
      <span>Charge Portal Shop</span>
      <div class="tools">
        <NuxtLink to="/shop/cart">
          {{ t('shop.cart') }}<span v-if="hydrated" aria-live="polite"> ({{ t('shop.cartCount', { n: itemCount }) }})</span>
        </NuxtLink>
        <AppLocaleSwitcher />
      </div>
    </nav>
  </header>
  <main id="main" tabindex="-1">
    <slot />
  </main>
</template>
