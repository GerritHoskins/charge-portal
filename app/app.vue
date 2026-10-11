<script setup lang="ts">
const { tenant } = useTenant()

// Lets E2E tests wait for hydration before interacting with SSR-rendered controls.
onMounted(() => document.documentElement.setAttribute('data-hydrated', ''))

useHead({
  htmlAttrs: { lang: 'de', 'data-tenant': tenant },
  titleTemplate: (title) => (title ? `${title} – Charge Portal` : 'Charge Portal'),
})
</script>

<template>
  <a class="skip-link" href="#main">Zum Inhalt springen</a>
  <header class="app-header">
    <nav aria-label="Hauptnavigation">
      <ul>
        <li><NuxtLink to="/portal/stations">Stationen</NuxtLink></li>
        <!-- Not yet migrated: full page loads served by the legacy backend. -->
        <li><a href="/portal/sessions">Ladevorgänge</a></li>
        <li><a href="/portal/invoices">Rechnungen</a></li>
      </ul>
    </nav>
  </header>
  <main id="main" tabindex="-1">
    <NuxtPage />
  </main>
</template>

<style>
.app-header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}
.app-header ul {
  display: flex;
  gap: var(--space-4);
  margin: 0;
  padding: var(--space-3);
  list-style: none;
}
.app-header a {
  color: var(--color-brand);
  font-weight: 600;
}
main {
  padding: var(--space-4) var(--space-3);
  max-width: 64rem;
  margin: 0 auto;
}
</style>
