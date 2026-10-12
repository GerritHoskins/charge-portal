<script setup lang="ts">
const { tenant } = useTenant()
const { t, locale, locales, setLocale } = useI18n()

const { data: me } = await useFetch('/api/me')
const csrf = useCsrfToken()

// Which route prefixes this user is rolled back to legacy for (ADR 0005); read by middleware/rollout.global.ts.
useState<string[]>('rollout-legacy', () =>
  import.meta.server ? ((useRequestEvent()?.context as { rolloutLegacy?: string[] } | undefined)?.rolloutLegacy ?? []) : [],
)

// Lets E2E tests wait for hydration before interacting with SSR-rendered controls.
onMounted(() => document.documentElement.setAttribute('data-hydrated', ''))

const localeOptions = computed(() => locales.value.map((l) => ({ code: l.code, name: l.name ?? l.code })))
const onLocaleChange = (event: Event) => setLocale((event.target as HTMLSelectElement).value as 'de' | 'en')

useHead({
  htmlAttrs: { lang: locale, 'data-tenant': tenant },
  titleTemplate: (title) => (title ? `${title} – Charge Portal` : 'Charge Portal'),
})
</script>

<template>
  <a class="skip-link" href="#main">{{ t('nav.skip') }}</a>
  <header class="app-header">
    <nav :aria-label="t('nav.main')">
      <ul>
        <li><NuxtLink to="/portal/stations">{{ t('nav.stations') }}</NuxtLink></li>
        <li><NuxtLink to="/portal/sessions">{{ t('nav.sessions') }}</NuxtLink></li>
        <li><NuxtLink to="/portal/invoices">{{ t('nav.invoices') }}</NuxtLink></li>
      </ul>
      <div class="tools">
        <div class="lang">
          <label for="locale-select">{{ t('nav.language') }}</label>
          <select id="locale-select" :value="locale" @change="onLocaleChange">
            <option v-for="l in localeOptions" :key="l.code" :value="l.code">{{ l.name }}</option>
          </select>
        </div>
        <!-- Plain POST form (works before hydration); the CSRF token is checked by server/routes/logout.post.ts. -->
        <form v-if="me" class="session" method="post" action="/logout">
          <input type="hidden" name="_csrf" :value="csrf" />
          <span>{{ t('nav.signedInAs', { name: me.name }) }}</span>
          <DsButton type="submit" variant="secondary">{{ t('nav.logout') }}</DsButton>
        </form>
      </div>
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
.app-header .tools,
.app-header .session,
.app-header .lang {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.app-header .lang {
  gap: var(--space-2);
}
.app-header select {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
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
