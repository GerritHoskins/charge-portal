# WP-23 — Optimization: lazy hydration and initial JS

**Depends on:** WP-20.

## Goal

Ship and execute less JavaScript up front: content below the fold is server-rendered but hydrates
only when visible or idle. Target metrics: TBT (lab), per-route initial JS (WP-13), INP p75.

## Read

- `measure.md`
- Nuxt docs on lazy components and delayed hydration (`Lazy` prefix, `hydrate-on-visible`,
  `hydrate-on-idle`, `hydrate-never`) for the installed version (≤ 120 lines). Note the version
  that introduced delayed hydration in the progress log.
- `app/pages/shop/[slug].vue`, `app/pages/shop/c/[category].vue`

## Steps

1. Measure "before" (lab TBT, per-route JS, RUM INP) if not current.
2. Extract below-the-fold parts into components if they are not already:
   `ShopRelatedProducts.vue` (product page), `ShopProductSpecs.vue` (if below the fold at 390 px),
   the listing pagination.
3. Use them as `<LazyShopRelatedProducts hydrate-on-visible />` etc. Keep the add-to-cart button
   and the filters eagerly hydrated (they must react immediately).
4. Check that the related-products data is still fetched once on the server (not again on the
   client): look for a duplicate request in the E2E network log.
5. Tests: existing shop E2E tests must pass unchanged. Add one assertion that the related
   products are present in the SSR HTML (server-rendered, not client-only).
6. Measure "after"; tighten the provisional per-route budgets in `scripts/route-budgets.json` to the
   new value + 10% and remove `"provisional"` for routes that are done. Record with note "WP-23".

## Files you may change

The two shop pages, new components under `app/components/shop/` (+ stories),
`scripts/route-budgets.json`, shop E2E specs.

## Done when

`npx playwright test --project=shop --project=storybook`, `npm run budget` pass; before/after recorded.
If a change does not move TBT/JS beyond noise, revert it and record that.
