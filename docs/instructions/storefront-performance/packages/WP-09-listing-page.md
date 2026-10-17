# WP-09 — Listing page `/shop` and `/shop/c/[category]` (naive version)

**Depends on:** WP-01, WP-06, WP-07, WP-08.

## Goal

A server-rendered product grid, built the simple way on purpose (see "Naive on purpose").
Accessibility and design-system rules are **not** relaxed.

## Read

- `app/pages/portal/stations/index.vue` (pattern: i18n, `useFetch`, live region, alert)
- `app/components/ds/DsAlert.vue`, `DsButton.vue` (props only)
- `shared/contracts/catalog.ts` (types `ShopListing`, `ShopProduct`)
- `tests/e2e/portal.spec.ts` lines 1–30 (axe pattern)

## Pages

- `app/pages/shop/index.vue`: redirects (`navigateTo`, 301) to `/shop/c/wallboxes`.
- `app/pages/shop/c/[category].vue`: `definePageMeta({ layout: 'shop' })`;
  `useFetch('/api/shop/listing/' + category)`; `<h1>` with the category name; a list
  (`<ul>` of `<li>` cards, not a table) with image, name (link to `/shop/[slug]`), price
  (format cents with `Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' })`; reuse
  `useFormatters` if it already offers this), stock as text; pagination links
  (`?page=n`, `<nav aria-label>`); `role="status"` text with the count; `DsAlert` on error.
- A small presentational component `app/components/shop/ShopProductCard.vue` with a story
  `ShopProductCard.stories.ts` (the Storybook axe suite then covers it automatically).
  Storybook runs without Nuxt, so `<NuxtLink>` and auto-imports are not available there: check
  `.storybook/preview.ts` for an existing stub first (read ≤ 60 lines); if there is none, give the
  card a `href` prop and render a plain `<a>`, and note the trade-off (no client-side navigation
  from the card) in the progress log.

## Naive on purpose (do not optimize, WP-20 to WP-25 do that)

Plain `<img :src="product.image.url">` using the largest image, **without** `width`/`height`,
no lazy loading, all components eagerly hydrated, no `routeRules`, full `useFetch` payload.
Add a code comment `<!-- baseline (WP-09): unoptimized on purpose, see WP-20 -->` on the `<img>`.
`alt` text is still required (from `image.alt`).

## Inventory

Add to `docs/migration-routes.json`:
`{ "path": "/shop/c/:category", "status": "nuxt-native", "adr": "0007", "files": ["app/pages/shop/c/[category].vue"] }`
and the same for `/shop` with `app/pages/shop/index.vue`. ADR 0007 is written in WP-14; the
inventory only checks that the field is present.

## Tests first

`tests/e2e/shop-listing.spec.ts` (project `shop`, logged out):
- `/shop` redirects to `/shop/c/wallboxes`;
- heading visible, 24 product links, the status text says `24 Produkte angezeigt`
  (adapt to the real total/page size), each card shows a price with `€` and stock text;
- page 2 link works;
- axe clean (tags as in context.md), also with `?tenant=stadtwerke-demo`;
- no portal navigation present (`getByRole('link', { name: 'Stationen' })` count 0).

## Files you may change

`app/pages/shop/index.vue`, `app/pages/shop/c/[category].vue`, `app/components/shop/ShopProductCard.vue`,
`app/components/shop/ShopProductCard.stories.ts`, `docs/migration-routes.json`,
`tests/e2e/shop-listing.spec.ts` (all new except the JSON).

## Done when

`npx playwright test --project=shop`, `npm run migration:status -- --check`, lint, typecheck pass.
`npm run budget` may now fail on the 120 KB total: **do not raise it**; record the number and
note "budget handled in WP-13".
