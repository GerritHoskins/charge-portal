const LEGACY_ORIGIN = process.env.LEGACY_ORIGIN ?? 'http://localhost:8080'

// https://nuxt.com/docs/api/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  css: ['~/assets/css/tokens.css', '~/assets/css/base.css'],

  runtimeConfig: {
    legacyOrigin: LEGACY_ORIGIN,
  },

  // Strangler-fig routing table (see docs/adr/0001-strangler-migration.md).
  // Migrated routes are served by Nuxt. Anything not yet migrated is
  // proxied to the legacy server-rendered monolith (currently only login/logout).
  // Migrating a route means
  // adding a page under app/pages/ and deleting its line here.
  routeRules: {
    // Login and logout stay with the legacy session owner for now (ADR 0002).
    // `redirect: 'manual'`: pass legacy's 302 (and its Set-Cookie) to the browser
    // instead of following it server-side, which would swallow the cookie.
    '/login': { proxy: { to: `${LEGACY_ORIGIN}/login`, fetchOptions: { redirect: 'manual' } } },
    '/logout': { proxy: { to: `${LEGACY_ORIGIN}/logout`, fetchOptions: { redirect: 'manual' } } },
  },

  typescript: { strict: true },
})
