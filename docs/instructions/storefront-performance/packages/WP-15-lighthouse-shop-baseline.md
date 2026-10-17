# WP-15 — Lighthouse for the public shop routes + lab baseline

**Depends on:** WP-12. (WP-13/14 can be done before or after.)

## Goal

A second Lighthouse CI configuration for the public shop routes (no login), and the lab
baseline of the naive shop: the "before" column for every optimization.

## Read

- `lighthouserc.cjs` (whole file, ~35 lines)
- `scripts/lighthouse.mjs` (whole file, ~60 lines)
- `measure.md` in this folder

## Steps

1. `lighthouserc.shop.cjs`: routes `/shop/c/wallboxes`, `/shop/c/wallboxes?connector=ccs`,
   one product page (pick a slug with a large image), `/shop/cart`. `numberOfRuns: 5`,
   median-run aggregation, no cookie header, categories performance, accessibility,
   best-practices, seo. Output dir `.lighthouseci-shop`.
   Assertions: **warn**, not error, for performance/LCP/CLS/TBT for now (the naive baseline is
   expected to miss them; WP-25 switches them to error with the same thresholds as the portal).
   accessibility = 1 stays an **error** from the start.
2. `scripts/lighthouse.mjs`: accept `--config <file>` and skip the login when the config is the
   shop one (or add an option `--public`). Keep the stale-server check.
3. `package.json`: `"lighthouse:shop": "npm run build && node scripts/lighthouse.mjs --config lighthouserc.shop.cjs --public"`.
4. Add `.lighthouseci-shop/` to `.gitignore` if `.lighthouseci/` is ignored there.
5. Run `npm run lighthouse:shop` following `measure.md` and record one row per route with note
   "WP-15 naive baseline".

## Files you may change

`lighthouserc.shop.cjs` (new), `scripts/lighthouse.mjs`, `package.json`, `.gitignore`.

## Done when

`npm run lighthouse:shop` completes (warnings allowed, a11y errors not), `npm run lighthouse`
for the portal still works, baseline recorded.
