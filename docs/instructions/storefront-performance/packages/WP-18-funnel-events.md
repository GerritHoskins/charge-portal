# WP-18 — Conversion funnel events

**Depends on:** WP-17 (reuses its patterns).

## Goal

Count the funnel listing view → product view → add to cart, so performance changes can be
discussed next to a conversion signal. Demo telemetry only: synthetic traffic, in memory.

## Read

- `server/api/vitals.post.ts` (pattern: body limit, schema, rate limit, 204)
- `app/plugins/vitals.client.ts` (pattern: sendBeacon)

## Design

- `shared/contracts/events.ts`: `shopEventSchema` `{ type: 'listing_view'|'product_view'|'add_to_cart', route, tabId (≤ 64) }`
  and a pure `funnel(events)` → `{ listingViews, productViews, addToCarts, viewToProductRate,
  productToCartRate }` where rates count **distinct tabIds** that reached a step after the previous
  one (document the definition in a comment; rates are `null` when the denominator is 0).
- `server/api/events.post.ts` (204, rate-limited) and `server/api/events/funnel.get.ts`.
- `app/composables/useShopEvents.ts`: `track(type)`; `tabId` = random id in `sessionStorage`
  (`crypto.randomUUID()`), no cookies. Call `listing_view` and `product_view` in `onMounted` of the
  pages, `add_to_cart` in the cart add handler.

## Tests first

1. `tests/unit/events.test.ts`: schema, `funnel` with distinct tabs, a tab that adds to cart
   without a product view (counted? decide and test), zero denominators.
2. `tests/e2e/shop-events.spec.ts` (project `shop`): one full funnel in a fresh context →
   `GET /api/events/funnel` shows each step ≥ 1 and both rates > 0.

## Files you may change

`shared/contracts/events.ts`, `server/api/events.post.ts`, `server/api/events/funnel.get.ts`,
`app/composables/useShopEvents.ts`, `app/pages/shop/c/[category].vue`, `app/pages/shop/[slug].vue`,
`tests/unit/events.test.ts`, `tests/e2e/shop-events.spec.ts` (new files except the two pages).

## Done when

Unit, coverage, `npx playwright test --project=shop`, lint, typecheck pass.
