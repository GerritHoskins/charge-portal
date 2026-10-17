# WP-10 — Filters and sorting on the listing (naive version)

**Depends on:** WP-09.

## Goal

Filter by minimum power and connector type, sort by price/name. State lives in the URL query,
so filtered listings are shareable and server-rendered.

## Read

- `app/pages/shop/c/[category].vue`
- `shared/contracts/catalog.ts` (`shopListingQuerySchema`)

## Behaviour

- A filter form above the grid (`<form role="search">` is not right here; use a `<fieldset>`
  with `<legend>` from `shop.filter.heading`):
  - `minPower`: `<input type="range">` or number input with a visible label and unit (kW);
  - `connector`: radio group or `<select>` incl. "alle";
  - `order`: `<select>`.
- **Naive on purpose:** every `input` event immediately calls `navigateTo({ query })`
  (no debounce), which re-fetches and re-renders the whole grid. Comment it as baseline
  (`// baseline (WP-10): no debounce on purpose, see WP-24`).
- The status live region announces the new count.
- Without JavaScript the form still works: `method="get"` with real `name` attributes and a
  submit button (visible, or visually hidden only if it stays keyboard reachable).
- Reset to page 1 when a filter changes.

## Tests first

Extend `tests/e2e/shop-listing.spec.ts`:
- selecting connector `ccs` updates the URL query and only shows CCS products;
- `minPower` 22 hides products below 22 kW;
- `order=price-desc`: first price ≥ second price;
- direct load of `/shop/c/wallboxes?connector=ccs&order=price-asc` renders the filtered result
  server-side (check before `data-hydrated`, or with JS disabled in a separate test context);
- keyboard-only: Tab to the connector control, change it, the status text updates;
- axe clean with a filter applied.

## Files you may change

`app/pages/shop/c/[category].vue`, optionally a new `app/components/shop/ShopFilters.vue`
(+ `.stories.ts`), `tests/e2e/shop-listing.spec.ts`.

## Done when

`npx playwright test --project=shop`, lint and typecheck pass.
