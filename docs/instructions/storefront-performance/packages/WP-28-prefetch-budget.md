# WP-28 — Do not prefetch chunks the shop never runs

**Depends on:** WP-13 (route budgets), accepted WP-02; follows the fault-triage merge (PR #6).
**Execution status:** maintained in the designated progress log.
**Progress log:** `docs/progress/storefront-performance/progress_log.md`.

## Goal

`/shop/wallbox-home-7-4` passes its unchanged 128.045 KB route budget again, by no longer
prefetching chunks that a successful shop view never executes. No threshold, budget script
or measurement change.

## Context (measured 2026-10-26 on clean builds)

- `f0de55a` (accepted WP-02): product route 128.044 KB, passes. `2ffe207` (PR #6 merge):
  128.243 KB, fails; `main` CI has been red since. The locale growth is not the cause
  (old locale files: 128.241 KB) and dependency versions are identical.
- Cause: two triage routes add their route records and preload-map entries to the shared
  entry chunk (+172 B gz) and the triage nav link grows the portal layout (+19 B).
- `scripts/check-route-budget.mjs` counts every JS response until network idle. Nuxt writes
  `<link rel="prefetch">` hints for the entry chunk's lazy imports into every page, so the
  product route is charged for four files it never runs: error-404 (1,743 B), error-500
  (1,202 B), the portal `default` layout (723 B) and its CSRF helper (103 B), 3.68 KB in all.
  The shop layout has no portal link, so the layout prefetch is purely speculative.
- Scratch experiment with `prefetch = false` for those three manifest entries: product
  124.661 KB, listing 122.173 KB, cart 118.155 KB, all routes pass.

## Read

- `AGENTS.md` and `docs/instructions/work-package-workflow.md`.
- `nuxt.config.ts`, `scripts/lib/route-budget.mjs` and `tests/unit/route-budget.test.ts` (pattern).
- `tests/e2e/shop-compression.spec.ts` lines 50–60 (dev/production detection pattern).
- `tests/e2e/shop-product.spec.ts` 404 tests.

## Files you may change

- `scripts/lib/prefetch-policy.mjs` (new): pure manifest policy.
- `nuxt.config.ts`: register the `build:manifest` hook only.
- `tests/unit/prefetch-policy.test.ts` (new).
- `tests/e2e/shop-prefetch.spec.ts` (new).
- `README.md`: only the `npm run budget` sentence that says it currently exits 1.
- This package, its row in `packages/README.md`, and the progress log.

## Constraints and exclusions

- No change to `scripts/route-budgets.json`, `scripts/check-route-budget.mjs`, Lighthouse
  configs, Playwright config, dependencies or lockfile. No WP-25 optimization. WP-27 stays
  optional/deferred.
- Error pages and portal layout keep working: they load on demand instead of in advance.
  Modulepreload of chunks a route actually needs is untouched.

## Acceptance criteria

- [ ] The manifest entries for Nuxt's `error-404.vue`, `error-500.vue` and `layouts/default.vue`
      have `prefetch: false`; other entries are unchanged.
- [ ] Production product HTML has no prefetch hint for those chunks; an unknown product still
      renders the 404 page after client-side navigation.
- [ ] Unit and production E2E tests were observed failing before the implementation and pass after.
- [ ] `npm run budget` exits 0 with unchanged budgets; `npm run check` passes.
- [ ] `npm run lighthouse` and `npm run lighthouse:shop` results recorded before and after
      (local Windows shop LCP has failed before on unchanged code; PR CI on Linux is authoritative).
- [ ] Diff inspected and the progress-log handoff recorded; ready for human review.

## Verification commands

- `npx vitest run tests/unit/prefetch-policy.test.ts`
- `npm run build`, then the production server and
  `npx playwright test --project=shop --project=auth --workers=1` (production run)
- `npm run budget`, `npm run check`, `npm run lighthouse`, `npm run lighthouse:shop`

## Blockers and handoff

Follow the shared workflow. Human acceptance is required for Done.
