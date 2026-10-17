const LEGACY_ORIGIN = process.env.LEGACY_ORIGIN ?? 'http://localhost:8080'

// https://nuxt.com/docs/api/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  modules: ['@nuxtjs/i18n', '@nuxt/image'],
  image: {
    provider: 'ipx',
    screens: { xs: 320, sm: 400, md: 448, lg: 640, xl: 800, xxl: 1200, xxxl: 1600 },
  },

  // German is the default (and what the tests pin); English follows the browser language
  // or the switcher. No URL prefix: /portal/... paths stay stable for the legacy hand-over.
  // Dispute validation messages still come from legacy in German (see ADR 0006).
  i18n: {
    defaultLocale: 'de',
    strategy: 'no_prefix',
    locales: [
      { code: 'de', language: 'de-DE', name: 'Deutsch', file: 'de.json' },
      { code: 'en', language: 'en-GB', name: 'English', file: 'en.json' },
    ],
    detectBrowserLanguage: { useCookie: true, cookieKey: 'i18n_locale', fallbackLocale: 'de' },
  },

  css: ['~/assets/css/tokens.css', '~/assets/css/base.css'],

  runtimeConfig: {
    legacyOrigin: LEGACY_ORIGIN,
    // Server-only Store API credential. Override with NUXT_STORE_API_ACCESS_KEY.
    storeApiAccessKey: 'demo-access-key',
    // Private (server only). Override with NUXT_CSRF_SECRET / NUXT_TRUST_PROXY.
    csrfSecret: '',
    // Rate limiting keys on the client ip; behind a reverse proxy set NUXT_TRUST_PROXY=true
    // so X-Forwarded-For is used (only if the proxy overwrites that header).
    trustProxy: false,
    // Per-route rollout/rollback, e.g. NUXT_ROLLOUT="/portal/invoices=0,/portal/sessions=50"
    // (share of users served by Nuxt; 0 = everybody back on legacy). Empty = all migrated routes on Nuxt.
    rollout: '',
    // Same switch the legacy server uses for its session cookie.
    cookieSecure: process.env.COOKIE_SECURE === '1',
  },

  // Strangler-fig routing table (see docs/adr/0001-strangler-migration.md).
  // Migrated routes are served by Nuxt. Anything not yet migrated would be proxied to the
  // legacy server-rendered monolith with a `routeRules` entry. Nothing is left: login and
  // logout moved to Nuxt (app/pages/login.vue, server/routes/login.post.ts, ADR 0004);
  // legacy still owns the session behind them.
  routeRules: {},

  // Precompress JS/CSS (gzip + brotli) at build time. Lighthouse flagged ~600 ms of
  // "uses-text-compression" on throttled mobile before this; behind a real CDN/proxy
  // this is usually done there instead.
  nitro: { compressPublicAssets: true },

  typescript: { strict: true },
})
