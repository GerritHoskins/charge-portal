# WP-24 — Optimization: filter responsiveness (INP)

**Depends on:** WP-19, WP-23.

## Goal

The naive filter (WP-10) navigates and re-renders the whole grid on every input event. Make the
interaction respond within one frame and do the expensive work afterwards. Target: INP p75 from
the synthetic RUM sample.

## Read

- `measure.md`
- `app/pages/shop/c/[category].vue` (and `ShopFilters.vue` if it exists)

## Steps

1. Measure "before" INP p75 for `/shop/c/:category` (RUM, 30 runs), and look at the reported
   `attribution.target` to confirm the filter controls are the slow interactions.
2. Changes, one at a time with a measurement after each:
   a. Debounce the range input (e.g. 250 ms) and commit on `change` for selects/radios;
      the control itself updates immediately (local state), the query update follows.
   b. Replace `navigateTo` per input with `router.replace({ query })` and a `useFetch` that
      watches the query (`watch: [query]`), keeping the old grid visible with a non-blocking
      pending state (`aria-busy` on the list, no layout jump).
   c. Avoid re-rendering unchanged cards: stable `:key` (product id) and, if the measurement
      still shows long tasks, `v-memo` on the card.
3. The no-JS form and the SSR of filtered URLs (WP-10 tests) must keep working.
4. Tests: existing listing E2E pass; add one that types quickly into the range input and asserts
   only **one** listing request is made after the debounce (count requests to `/api/shop/listing`).
5. Record INP p75 before/after per change with note "WP-24 a/b/c".

## Files you may change

The listing page, `ShopFilters.vue`, `tests/e2e/shop-listing.spec.ts`.

## Done when

`npx playwright test --project=shop` passes; INP measurements recorded, including changes that did
not help (reverted).
