# WP-22 — Optimization: route caching for public pages (TTFB)

**Depends on:** WP-07 (shop layout without user data), WP-19.

## Goal

Listing and product HTML are the same for every visitor, so they can be cached on the server
(stale-while-revalidate). Measure TTFB cold vs warm. **Correctness first:** a cached page must
never contain anything user-specific.

## Read

- `nuxt.config.ts` (`routeRules`, `nitro` blocks)
- `server/middleware/csrf.ts` (whole file, ~10 lines)
- `app/layouts/shop.vue`
- Nuxt docs on `routeRules` (`swr`, `isr`, `cache`) for the installed Nuxt version (≤ 120 lines).
  Note which options work with the Node server preset (this repo runs `.output/server/index.mjs`).

## Safety checks before enabling the cache (tests first)

E2E `tests/e2e/shop-cache.spec.ts` (project `shop`):
1. Request `/shop/c/wallboxes` **with** a portal session cookie (log in through legacy as
   `contract.spec.ts` does) and **without**: the HTML must be identical apart from known
   per-request values. If anything differs, find it before caching.
2. The response for `/shop/**` sets **no** `set-cookie` header. `server/middleware/csrf.ts`
   currently issues a CSRF cookie on every HTML GET: exclude `/shop` there (the shop has no
   forms that need CSRF; the cart is client-side). Add this exclusion in this WP and assert it.
3. `/shop/cart` and `/api/shop/*` responses are not cached (`cache-control: no-store` or no
   cache rule; decide and assert).

## Enable

- `routeRules`: `'/shop/c/**': { swr: 60 }`, `'/shop/**'` product pages `{ swr: 300 }` (exact
  patterns per the docs; make sure `/shop/cart` is excluded or overridden).
- Document what would invalidate the cache in a real shop (price change, stock change, content
  update) and why the TTLs were chosen, in a comment next to the rules (the ADR in WP-27 repeats it).
- Optional: set `LEGACY_CATALOG_DELAY_MS=300` (WP-04) for the measurement, so the effect on TTFB is
  visible against a realistically slow backend. Record that it was set.

## Measure

TTFB cold/warm per `measure.md`, plus a Lighthouse run. Record with note "WP-22 caching".

## Files you may change

`nuxt.config.ts`, `server/middleware/csrf.ts`, `tests/e2e/shop-cache.spec.ts` (new).

## Done when

All safety tests pass, `npx playwright test --project=app --project=auth` still pass (portal CSRF
unchanged), before/after TTFB recorded.
