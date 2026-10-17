<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <header class="app-header">
    <nav :aria-label="t('nav.main')">
      <span>Charge Portal Shop</span>
      <div class="tools">
        <NuxtLink to="/shop/cart">Warenkorb (0)</NuxtLink>
        <AppLocaleSwitcher />
      </div>
    </nav>
  </header>
  <main id="main" tabindex="-1">
    <slot />
  </main>
</template>
