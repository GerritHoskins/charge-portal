const LEGACY_ORIGIN = process.env.LEGACY_ORIGIN ?? 'http://localhost:8080'
const shopCacheVaries = ['cookie', 'accept-language', 'host', 'x-forwarded-proto']

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

  // Use Vite's installed Terser minifier for client assets with conservative compression.
  // Keep the override client-only so Nitro/SSR output is not affected.
  vite: {
    $client: {
      build: {
        minify: 'terser',
        terserOptions: { compress: { passes: 2 }, maxWorkers: 2 },
      },
    },
  },

  runtimeConfig: {
    legacyOrigin: LEGACY_ORIGIN,
    // Server-only Store API credential. Override with NUXT_STORE_API_ACCESS_KEY.
    storeApiAccessKey: 'demo-access-key',
    // Fault triage service (ADR 0009), server only: the browser never talks to it. Override with
    // NUXT_TRIAGE_ORIGIN / NUXT_TRIAGE_INTERNAL_TOKEN. The default token is the synthetic one from
    // docker-compose.yml; the service must not be reachable from outside the network.
    triageOrigin: 'http://127.0.0.1:4100',
    triageInternalToken: 'synthetic-dev-internal-token',
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
  // Public catalogue HTML is safe to share only across identical locale and origin inputs.
  // Listings use a 60 s TTL; product pages use 300 s. Price, stock, or content updates in a
  // real shop must purge these entries (or wait for the TTL). Varying on the full Cookie
  // header also partitions cache entries by session cookie; this is safe but may fragment reuse.
  routeRules: {
    // This page only redirects: it has no catalogue HTML or JSON payload to cache/prefetch.
    '/shop': { cache: false },
    '/shop/c/**': { cache: { swr: true, maxAge: 60, varies: shopCacheVaries } },
    '/shop/**': { cache: { swr: true, maxAge: 300, varies: shopCacheVaries } },
    '/shop/cart': { cache: false },
  },

  // Precompress JS/CSS (gzip + brotli) at build time. Lighthouse flagged ~600 ms of
  // "uses-text-compression" on throttled mobile before this; behind a real CDN/proxy
  // this is usually done there instead.
  nitro: { compressPublicAssets: true },

  typescript: { strict: true },
})
