# WP-16 — Field metrics: schema and aggregation logic

**Depends on:** WP-05.

## Goal

The pure, testable half of RUM: what a vitals beacon looks like and how p75 per route and metric
is computed. Core Web Vitals are assessed at the 75th percentile, so the summary reports p75.

## Read

- `server/utils/rate-limit.ts` (first 40 lines, for code style of a framework-free util)

## Design

`shared/contracts/vitals.ts`:
- `vitalsBeaconSchema`: `{ route: string (≤ 200 chars, must start with '/shop'), name: 'LCP'|'INP'|'CLS'|'TTFB'|'FCP',
  value: number ≥ 0 (CLS ≤ 10, others ≤ 120000), rating: 'good'|'needs-improvement'|'poor',
  id: string (≤ 64), navigationType?: string, attribution?: { target?: string (≤ 200) } }`.
  Restricting `route` to `/shop` keeps the demo honest: only public pages are measured.
- Route normalization: `/shop/wallbox-home-11` → `/shop/:slug`, `/shop/c/x?...` → `/shop/c/:category`
  (query dropped), `/shop/cart` stays `/shop/cart` (it must **not** become `/shop/:slug`; test it).
  Pure function `normalizeRoute(path)`.

`server/utils/vitals-store.ts` (framework-free):
- `createVitalsStore({ capacity = 5000 })` with `add(beacon)` (ring buffer; oldest dropped) and
  `summary()` → `{ [route]: { [metric]: { p75, count, good, needsImprovement, poor } } }`.
- `percentile(values, p)` using nearest-rank; document the method in a comment.

## Steps (tests first)

1. `tests/unit/vitals.test.ts`: schema valid/invalid (negative value, unknown metric, route
   outside `/shop`, oversized strings), `normalizeRoute`, `percentile` (known small arrays,
   empty array → null), ring buffer drops oldest, summary counts per rating.
2. Run → fail. Implement. Run → pass.
3. Add `server/utils/vitals-store.ts` to the coverage `include` list in `vitest.config.ts`.

## Files you may change

`shared/contracts/vitals.ts` (new), `server/utils/vitals-store.ts` (new), `vitest.config.ts`,
`tests/unit/vitals.test.ts` (new).

## Done when

Unit test, `npm run test:coverage`, lint, typecheck pass.
