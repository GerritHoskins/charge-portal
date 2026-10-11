<script setup lang="ts">
const { tenant } = useTenant()

const { data: me } = await useFetch('/api/me')

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
        <li><NuxtLink to="/portal/sessions">Ladevorgänge</NuxtLink></li>
        <!-- Not yet migrated: full page load served by the legacy backend. -->
        <li><a href="/portal/invoices">Rechnungen</a></li>
      </ul>
      <!-- Plain POST form: logout is handled by the legacy session owner. -->
      <form v-if="me" class="session" method="post" action="/logout">
        <span>Angemeldet als {{ me.name }}</span>
        <button type="submit">Abmelden</button>
      </form>
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
.app-header nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: var(--space-3);
}
.app-header .session {
  display: flex;
  align-items: center;
  gap: var(--space-3);
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
