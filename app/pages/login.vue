<script setup lang="ts">
import { safeNext } from '#shared/auth/safe-next'

const { t, te } = useI18n()
const route = useRoute()
const csrf = useCsrfToken()
const next = safeNext(route.query.next)

// Already signed in: skip the form (same behaviour the legacy page had).
const { data: me } = await useFetch('/api/me')
if (me.value) await navigateTo(next, { redirectCode: 302 })

// Only known codes map to a message; anything else in the query string is ignored.
const error = computed(() => {
  const key = `login.errors.${String(route.query.error)}`
  return te(key) ? t(key) : undefined
})

useHead({ title: () => t('login.title') })
</script>

<template>
  <section class="login">
    <h1>{{ t('login.title') }}</h1>
    <DsAlert v-if="error" tone="error"><p>{{ error }}</p></DsAlert>
    <form method="post" action="/login">
      <input type="hidden" name="_csrf" :value="csrf" />
      <input type="hidden" name="next" :value="next" />
      <DsTextField id="username" name="username" :label="t('login.username')" autocomplete="username" required maxlength="128" />
      <DsTextField id="password" name="password" type="password" :label="t('login.password')" autocomplete="current-password" required maxlength="256" />
      <DsButton type="submit">{{ t('login.submit') }}</DsButton>
    </form>
  </section>
</template>

<style scoped>
.login {
  max-width: 24rem;
}
</style>
