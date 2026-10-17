<script setup lang="ts">
const { tenant } = useTenant()
const { t, locale } = useI18n()

// Lets E2E tests wait for hydration before interacting with SSR-rendered controls.
onMounted(() => document.documentElement.setAttribute('data-hydrated', ''))

useHead({
  htmlAttrs: { lang: locale, 'data-tenant': tenant },
  titleTemplate: (title) => (title ? `${title} – Charge Portal` : 'Charge Portal'),
})
</script>

<template>
  <a class="skip-link" href="#main">{{ t('nav.skip') }}</a>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
.app-header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}
.app-header nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2) var(--space-3);
  padding: 0 var(--space-3);
}
.app-header .tools,
.app-header .session,
.app-header .lang {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
}
.app-header .lang {
  gap: var(--space-2);
}
.app-header select {
  min-height: var(--control-min-height);
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.app-header ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}
.app-header a {
  display: inline-flex;
  align-items: center;
  min-height: var(--control-min-height);
  color: var(--color-brand);
  font-weight: 600;
}
main {
  padding: var(--space-4) var(--space-3);
  max-width: 64rem;
  margin: 0 auto;
}
@media (max-width: 40rem) { /* --bp-md; keep in sync with tokens/tokens.json */
  /* Compact header: links / signed-in text / [language][sign out] instead of four stacked rows. */
  .app-header .tools {
    width: 100%;
    justify-content: space-between;
  }
  .app-header .session {
    display: contents;
  }
  .app-header .session span {
    flex-basis: 100%;
    order: -1;
  }
  .app-header .lang__label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  main {
    padding: var(--space-3) var(--space-3);
  }
  h1 {
    font-size: 1.5rem;
  }
}
</style>
