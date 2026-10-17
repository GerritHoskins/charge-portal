# WP-13 — Per-route JS budget

**Depends on:** WP-12 (all shop routes exist).

## Goal

`scripts/check-bundle-size.mjs` sums **all** gzipped client JS against 120 KB. Every new route
chunk counts, even though no single page loads all of them, so the shop breaks the budget
without making any page slower. Replace the single hard total with a hard budget **per route**
(the JS a route actually loads on first visit) and keep the total as an informational line.
Thresholds are decided here and justified in ADR 0007 (WP-14), never raised silently.

## Read

- `scripts/check-bundle-size.mjs` (whole file, ~35 lines)
- `package.json` (`scripts` block)

## Approach

Measure what the browser loads, not what the build emits:
a script that starts the production build (same start/stop pattern as `scripts/lighthouse.mjs`;
read its lines 1–40 for the pattern), opens each route in Playwright Chromium, collects all
responses whose URL contains `/_nuxt/` and ends in `.js`, and sums their **gzipped** size
(fetch each file from `.output/public` on disk and gzip it, so the number does not depend on
server compression).

- Pure part in `scripts/lib/route-budget.mjs`: `evaluate(measurements, budgets)` returns
  `{ route, kb, budgetKb, ok }[]`; `parseBudgets(envOrJson)`. Unit-testable.
- Budgets in `scripts/route-budgets.json`, e.g.
  `{ "/portal/stations": 115, "/shop/c/wallboxes": 0, ... }`. For the shop routes, put the
  **measured baseline + 10%** for now and mark them `"provisional": true`; WP-20+ tighten them.
  For portal routes use the measured value + 5%.
- Public routes need no login; portal routes need the demo login (reuse the approach in
  `scripts/lighthouse.mjs`).
- `npm run budget` runs the build, the route measurement (hard fail per route) and prints the
  old total as information only.

## Tests first

`tests/unit/route-budget.test.ts` for `evaluate` and `parseBudgets` (over, under, equal,
missing budget for a measured route → reported as an error, not ignored).

## Files you may change

`scripts/lib/route-budget.mjs` (new), `scripts/check-route-budget.mjs` (new),
`scripts/route-budgets.json` (new), `scripts/check-bundle-size.mjs` (make the total
informational: exit 0, keep the printout), `package.json` (`budget` script),
`tests/unit/route-budget.test.ts` (new).

## Done when

`npm run budget` passes and prints per-route numbers; unit test, coverage, lint pass.
Record per-route initial JS for every route in the Measurements table (note "WP-13 baseline").
