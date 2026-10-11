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
  // Migrated routes are served by Nuxt. Everything else under /portal is
  // proxied to the legacy server-rendered monolith. Migrating a route means
  // adding a page under app/pages/ and deleting its line here.
  routeRules: {
    '/portal/invoices/**': { proxy: `${LEGACY_ORIGIN}/portal/invoices/**` },
  },

  typescript: { strict: true },
})
