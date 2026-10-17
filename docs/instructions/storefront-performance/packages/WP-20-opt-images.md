# WP-20 — Optimization: images and LCP

**Depends on:** WP-15, WP-19 (baselines exist). `@nuxt/image` installed in WP-00.

## Goal

The LCP element on listing and product pages is an image. Serve the right size and format,
discover it early, and lazy-load everything below the fold. Measure the effect.

## Read

- `measure.md`
- `node_modules/@nuxt/image/README.md` or its docs folder: only the parts on `<NuxtImg>` props
  (`sizes`, `densities`, `format`, `preload`, `loading`, `fetchpriority`) and the default `ipx`
  provider (≤ 150 lines). Use the installed version's documented props, not memory.
- `app/components/shop/ShopProductCard.vue`, the hero `<img>` in `app/pages/shop/[slug].vue`

## Steps

1. Measure "before" per `measure.md` if the code changed since the last recorded row.
2. Register `@nuxt/image` in `nuxt.config.ts` (`modules`), configure the `ipx` provider for
   `/shop/` images and the screen sizes you use. If WP-03 produced SVG only, image optimization
   has little to show: stop and record this in Open questions instead of continuing.
3. Product hero: `<NuxtImg>` with `width`/`height` from `image.width/height`, `sizes` matching
   the layout, modern format, `preload`, `fetchpriority="high"`, `loading="eager"`.
4. Listing: the first row of cards (decide how many are above the fold at 390 px and at 1280 px
   and write it down) eager with `fetchpriority="high"` only for the first image; all others
   `loading="lazy"`. Related products on the product page: lazy.
5. Remove the `baseline (WP-09)` comments you replaced.
6. E2E: extend `tests/e2e/shop-product.spec.ts` to assert the hero image has `width`, `height`,
   a `srcset`, and that a `<link rel="preload" as="image">` exists in the SSR HTML
   (`page.request.get(url)` and check the body). Extend the listing spec: images after the first
   row have `loading="lazy"`.
7. Measure "after" (lab + synthetic RUM). Record both with note "WP-20 images".
8. Tighten the provisional shop budgets in `scripts/route-budgets.json` only if JS changed;
   images are not JS.

## Files you may change

`nuxt.config.ts`, `app/components/shop/ShopProductCard.vue`, `app/pages/shop/[slug].vue`,
`app/pages/shop/c/[category].vue`, `tests/e2e/shop-product.spec.ts`, `tests/e2e/shop-listing.spec.ts`.

## Done when

E2E `shop` and `storybook` projects pass (the card story must still render without Nuxt: if
`<NuxtImg>` breaks Storybook, pass the image element in via a slot or keep a plain `<img>` with
`srcset` built by a small helper, and record the decision), before/after recorded.
