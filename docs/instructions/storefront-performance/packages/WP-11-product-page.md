# WP-11 — Product detail page `/shop/[slug]` (naive version)

**Depends on:** WP-09.

## Goal

Product page with a large hero image, name, price, stock, specs, and an "add to cart" button
(the cart itself comes in WP-12; here the button only emits an event / calls a stub).

## Read

- `app/pages/shop/c/[category].vue` (for patterns already used in the shop)
- `shared/contracts/catalog.ts` (`ShopProduct`)

## Page

`app/pages/shop/[slug].vue` with `definePageMeta({ layout: 'shop' })`:
- `useFetch('/api/shop/products/' + slug)`; a 404 renders a proper not-found state with
  `<h1>` and sets the response status to 404 (`createError({ statusCode: 404, fatal: false })`
  or `setResponseStatus` on the server; pick one and note why);
- breadcrumb `<nav aria-label>` → shop → category → product (`aria-current="page"` on the last);
- hero `<img>` naive as in WP-09 (largest image, no dimensions) with the baseline comment;
- price, stock text, a specs `<dl>` (max power, connector type), description;
- `DsButton` "In den Warenkorb", disabled with explanatory text when out of stock.
- Below the fold: a "related products" list of 8 items from the same category
  (fetched from the listing endpoint; naive: fetched and hydrated eagerly).

## Inventory

Add `/shop/:slug` (`nuxt-native`, `adr: "0007"`, file `app/pages/shop/[slug].vue`).

## Tests first

`tests/e2e/shop-product.spec.ts` (project `shop`):
- a known slug shows `<h1>` with the product name, price with `€`, stock text, specs;
- unknown slug → response status 404 and a not-found heading;
- breadcrumb links work and the current item has `aria-current="page"`;
- out-of-stock product: button disabled and the reason is stated in text;
- axe clean, also for the 404 state.

## Files you may change

`app/pages/shop/[slug].vue` (new), `docs/migration-routes.json`,
`tests/e2e/shop-product.spec.ts` (new), and the stand-in data only if no product is out of stock.

## Done when

`npx playwright test --project=shop`, `npm run migration:status -- --check`, lint, typecheck pass.
