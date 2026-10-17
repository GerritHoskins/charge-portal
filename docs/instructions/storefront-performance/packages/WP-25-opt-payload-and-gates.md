# WP-25 — Optimization: payload size, then turn the shop gates on

**Depends on:** WP-20 to WP-24.

## Goal

1. The SSR payload (`__NUXT_DATA__` in the HTML) carries only fields the page renders.
2. With all optimizations in, the shop Lighthouse assertions become **errors** with the same
   thresholds as the portal, so regressions fail CI.

## Read

- `measure.md`
- `app/pages/shop/c/[category].vue`, `app/pages/shop/[slug].vue` (`useFetch` calls only)
- `lighthouserc.shop.cjs`

## Steps

1. Measure the payload: fetch the HTML of the listing and a product page and record the byte size
   of the `__NUXT_DATA__` script (a few lines in a scratch script or the browser devtools).
2. Use `pick` (or `transform`) in `useFetch` so the listing keeps only what the card shows
   (slug, name, priceCents, image, inStock, maxPowerKw, connectorType); the product page keeps what
   it renders. Do not remove fields the BFF contract needs; this is a page-level choice.
3. Re-measure payload and HTML transfer size; record with note "WP-25 payload".
4. In `lighthouserc.shop.cjs` switch performance ≥ 0.9, LCP ≤ 2500, CLS ≤ 0.1, TBT ≤ 300 from
   `warn` to `error`. Run `npm run lighthouse:shop`. If a route fails, **do not loosen the
   threshold**: record which route and metric, and stop; that needs another optimization WP.
5. Wire it into CI: `.github/workflows/ci.yml` runs `npm run lighthouse:shop` after the portal
   Lighthouse step (read the workflow, ≤ 80 lines).

## Files you may change

The two shop pages, `lighthouserc.shop.cjs`, `.github/workflows/ci.yml`.

## Done when

`npm run lighthouse:shop` passes with error-level assertions, or the failing route/metric is
recorded as an open question.
