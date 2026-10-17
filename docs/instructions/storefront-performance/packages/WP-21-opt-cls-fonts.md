# WP-21 — Optimization: layout stability (CLS) and fonts

**Depends on:** WP-20.

## Goal

Nothing moves after first paint: reserved space for images, prices, stock badges and the cart
count, and no font swap shift.

## Read

- `measure.md`
- `app/assets/css/base.css` (search for `@font-face` and `font-family`; read ≤ 60 lines)
- the shop card, product page, `app/layouts/shop.vue`

## Steps

1. Find the shifts first: in Chrome DevTools (Performance panel, "Layout shifts" track) or with
   the Lighthouse `layout-shift-elements` audit from the last report in `.lighthouseci-shop/`.
   Write down which elements shift and by how much. Fix only what shows up.
2. Typical fixes (apply only the ones that match a measured shift):
   - `aspect-ratio` on image containers (from the image's width/height);
   - fixed min-height for price/stock rows so the "out of stock" text does not change the height;
   - the cart count in the shop header: reserve its width so the post-hydration count does not
     shift the header (see WP-12: SSR renders no count);
   - fonts: if a web font is loaded, `font-display: optional` or a metric-matched fallback
     (`size-adjust`), and preload only the one file used above the fold. If the app uses system
     fonts, note that there is nothing to do.
3. Use tokens for any spacing values (add tokens in `tokens/tokens.json` and run `npm run tokens`
   if needed; never hand-edit `tokens.css`).
4. Measure "after" (lab CLS + synthetic RUM CLS p75). Record with note "WP-21 CLS".

## Files you may change

The shop components/pages/layout, `app/assets/css/base.css`, `tokens/tokens.json` (+ regenerated
`tokens.css` via `npm run tokens`).

## Done when

`npx playwright test --project=shop --project=storybook`, `npm run tokens -- --check`, lint pass;
before/after recorded, including "no measurable shift found" if that is the result.
