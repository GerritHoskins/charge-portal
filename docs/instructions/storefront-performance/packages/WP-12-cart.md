# WP-12 — Client-side cart

**Depends on:** WP-11.

## Goal

A mini cart in client state: add, change quantity, remove, total. No checkout, no server cart
(a Store API cart needs a context token; out of scope, say so on the page: `shop.cartPage.noCheckout`).

## Read

- `app/pages/shop/[slug].vue` (button handler)
- `app/layouts/shop.vue` (cart link with count placeholder)

## Design

- Pure logic in `shared/cart.ts`: `addItem`, `setQuantity` (0 removes; max 10), `removeItem`,
  `totalCents`, `itemCount`, operating on a plain `CartItem[]` (`{ slug, name, priceCents, quantity }`).
  Pure functions → unit-testable and covered by the `shared/**` coverage floor.
- `app/composables/useCart.ts`: `useState('cart')` plus persistence in `localStorage`
  (read in `onMounted` only, so SSR and first client render match; wrap storage access in
  try/catch). Count in the header updates after hydration; SSR shows no count (document this).
- `app/pages/shop/cart.vue` (layout `shop`): table of items (`DsDataTable` fits), quantity
  inputs with labels, remove buttons with accessible names ("Wallbox Home 11 entfernen"),
  total, `role="status"` announcement on change.
- Product page: "In den Warenkorb" adds the item and announces `shop.product.added` in a
  polite live region; focus stays on the button.

## Tests first

1. `tests/unit/cart.test.ts`: all pure functions incl. quantity bounds, duplicate add merges,
   integer cents total.
2. `tests/e2e/shop-cart.spec.ts` (project `shop`), **keyboard only**:
   listing → product (Enter on link) → add to cart (Space/Enter) → cart link → change quantity
   → remove → empty state. Assert the header count and the total. axe clean on `/shop/cart`
   with and without items.

## Inventory

Add `/shop/cart` (`nuxt-native`, `adr: "0007"`).

## Files you may change

`shared/cart.ts`, `app/composables/useCart.ts`, `app/pages/shop/cart.vue`,
`app/pages/shop/[slug].vue`, `app/layouts/shop.vue`, `docs/migration-routes.json`,
`tests/unit/cart.test.ts`, `tests/e2e/shop-cart.spec.ts`. Possibly `i18n/locales/*.json` for a
missing key (add to both).

## Done when

Unit + `npx playwright test --project=shop` + `npm run test:coverage` + lint + typecheck pass.
