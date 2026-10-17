<script setup lang="ts">
const { t } = useI18n()
const { data: me } = await useFetch('/api/me')
const csrf = useCsrfToken()

// Which route prefixes this user is rolled back to legacy for (ADR 0005); read by middleware/rollout.global.ts.
useState<string[]>('rollout-legacy', () =>
  import.meta.server ? ((useRequestEvent()?.context as { rolloutLegacy?: string[] } | undefined)?.rolloutLegacy ?? []) : [],
)
</script>

<template>
  <header class="app-header">
    <nav :aria-label="t('nav.main')">
      <ul>
        <li><NuxtLink to="/portal/stations">{{ t('nav.stations') }}</NuxtLink></li>
        <li><NuxtLink to="/portal/sessions">{{ t('nav.sessions') }}</NuxtLink></li>
        <li><NuxtLink to="/portal/invoices">{{ t('nav.invoices') }}</NuxtLink></li>
      </ul>
      <div class="tools">
        <AppLocaleSwitcher />
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
    <slot />
  </main>
</template>
