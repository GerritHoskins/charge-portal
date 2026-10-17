# Storefront Performance Progress

## Status
Current step: WP-07 + WP-08 parallel wave (Review)
Completed steps: WP-00, WP-01, WP-02, WP-03
Next step: human review/acceptance; after WP-05 is accepted, WP-06 and WP-16 are the next safe parallel wave

## Decisions
- Plan: `docs/instructions/storefront-performance/instructions.md`.
- Execution: one work package per fresh session, see `docs/instructions/storefront-performance/packages/README.md`.
- 2026-10-17: branch `feat/storefront-performance` cut from `feat/login-in-nuxt-ds-i18n-rollout` (Track A committed/pushed; base `e34d009`).
- 2026-10-17: installed per WP-00 — `@nuxt/image@2.1.0`, `web-vitals@6.2.3` (runtime `nuxt@4.6.1`); `@nuxt/image` is intentionally **not** registered in `nuxt.config.ts` yet (WP-20 does that, so the WP-15 baseline is measured without it).

## WP-00 — Preflight and portal baseline (2026-10-17)
- Branch `feat/storefront-performance` created (step 1, human); `@nuxt/image@2.1.0` + `web-vitals@6.2.3` installed (step 2, human).
- Step 3 — `npm run check`: **green** (exit 0): lint, typecheck, `tokens --check`, `migration:status --check`, unit suite + coverage, full Playwright suite, build. Bundle budget hold: client JS **115.8 KB gz of 120 KB**.
- Step 4 — `npm run lighthouse`: portal routes logged in, mobile emulation + simulated throttling (Lighthouse defaults, per `lighthouserc.cjs`), 3 runs, median-run aggregation. All 4 routes pass all assertions (perf ≥ 0.9, a11y = 1.0, best-practices ≥ 0.9, LCP ≤ 2500 ms, CLS ≤ 0.1, TBT ≤ 300 ms). Per-route category scores: perf 98 / a11y 100 / best-practices 100.
- Step 5 — this log updated; installed versions: `nuxt@4.6.1`, `@nuxt/image@2.1.0`, `web-vitals@6.2.3`.

## WP-01 — Inventory status `nuxt-native` (2026-10-17, on `main` @ `3d43055`)
- Tests first (TDD): added 4 cases to `tests/unit/migration-routes.test.ts` (summarize `native` count, nuxt-native accept, missing ADR/files, missing file) → RED 6 failed / 8 passed; then implemented → **GREEN 14/14**.
- `scripts/lib/migration-routes.mjs`: `nuxt-native` added to `STATUSES`; `summarize()` reports `native` and excludes those routes from `total`/`percent`; `validate()` runs the ADR/files/exists checks for both `migrated` and `nuxt-native`.
- Wording decision (delegated to a Codex subagent before answering): shared messages `migrated and nuxt-native routes must …`; existing migrated test expectations stay valid (they assert the fragments `ADR` / `files` / `does not exist`).
- `docs/migration-routes.json` `$comment` now documents `nuxt-native`; `scripts/migration-status.mjs` prints the native count when non-zero.
- Done-when verified: targeted vitest 14 passed, `npm run migration:status -- --check` passes (7/7 routes, 0 remaining, 1 stays-legacy), eslint clean.
- State: uncommitted diff awaiting human review (AGENTS.md: a human commits every diff).

## WP-02 — Catalogue contract, zod (2026-10-17, on `main` @ `a11f2b8`)
- Reference consulted (per done-when): official Shopware Store API reference — Stoplight docs at `https://shopware.stoplight.io/docs/store-api` and the OpenAPI spec in `https://github.com/shopware/store-api-reference` (spec `6.7.9999999-dev`), 2026-10-17. Verified: `POST /store-api/product-listing/{categoryId}` → `ProductListingResult` (`elements`, `total`, `page`, `limit`, `availableSortings`, `currentFilters`, `aggregations`); `GET /store-api/product/{productId}` → `ProductDetailResponse` (Product fields `id` (32-hex uuid), `productNumber`, `name`, `available`, `availableStock`, `calculatedPrice.unitPrice`, `cover.media.url`, `seoUrls[].seoPathInfo`, `customFields`).
- Tests first (TDD): wrote `tests/unit/catalog-contract.test.ts` (15 cases: 11 store-api acceptance/rejection + 4 mapping) → RED (import error, no module); then implemented → **GREEN 15/15**.
- `shared/contracts/catalog.ts` (new; follows the `station.ts` pattern): `storeApiProductSchema` + `storeApiProductListingSchema` (Store API layer, all WP-listed fields required), `catalogProductSchema` (narrow portal entity: `id`, `name`, `price`, `imageUrl`, `inStock`, `stock`, `slug`, `customFields`), mapping `toCatalogProduct` (slug from first `seoUrls[].seoPathInfo`) and `mapProductListing` (`elements` + `total` → `items`). Rejection cases covered: non-uuid id, missing price/image/availability/stock/seo-urls/custom-fields (drift), non-array `elements`, missing `total`.
- Pitfalls found: zod 4 requires `z.record(keySchema, valueSchema)` (single-arg form removed — TS2554); `noUncheckedIndexedAccess` flags `seoUrls[0]` (guarded with explicit check instead of non-null assertion); repo lint forbids unused destructure without `_` prefix.
- Done-when verified: vitest 15 passed on the file; `npm run test:coverage` 195/195 (stmt 97.75 %, branch 94.39 %, fn 97.77 %, line 97.87 %); eslint clean; `nuxt typecheck` clean; stale orphan legacy server on :8080 (killed) was causing 9 invoices e2e failures before the final gate — with clean ports `npm run check` fully **green**: lint, typecheck, tokens, migration-status, coverage (16 files/195 tests), Playwright **112/112**, budget **115.8 KB gz of 120 KB**.
- Pushed to `main` (user-approved commit + push).

## WP-03 — Standin catalogue data (2026-10-17, committed as `3f43c13`)
- Status: Done (accepted when the user explicitly requested continuation with WP-04). Full `npm run check` green: 200/200 unit tests (incl. the new
  `tests/unit/legacy-catalog.test.ts`), Playwright e2e + axe, lint, typecheck, tokens,
  coverage, and the client-JS budget (115.8 KB of 120 KB).
- Test first: failing test (schema parse per product, 40 products ≥ 15 per category,
  unique IDs, unique `seoPathInfo` slugs, referenced image files existed on disk)
  before any implementation.
- Added `legacy/catalog.mjs`: deterministic stand-in catalogue — 40 products
  (20 wallboxes, 20 accessories) in 2 categories. Stable 32-char hex IDs derived
  by FNV-1a (no random numbers, identical across runs), umlaut-safe unique slugs,
  prices 24.90–1287.25 EUR. Every product parses through the WP-02
  `storeApiProductSchema`; `customFields` (powerKw/connectorType/kind) feed the
  WP-19 filter and 3 products per category are out of stock (available=false,
  availableStock=0) so stock states have real test data.
- Added `scripts/shop-images.mjs` + `public/shop/`: 240 placeholder images
  (40 products × 400/800/1600 px) — deterministic SVG art (name + shape, colour
  by name) plus raster JPEG renders via `sharp` (resolved at runtime here; the
  script degrades to SVG-only where sharp is unavailable). Total 1.9 MB, under
  the 2 MB budget. Raster images give WP-20 real material to optimize.
- Open question: images are generated, not hand-crafted — acceptable for a
  stand-in; `node scripts/shop-images.mjs` regenerates them any time
  (deterministic). WP-03 does not implement the product-detail route (WP-04).
- State: committed and pushed to `main` as `3f43c13`.

## WP-04 — Stand-in Store API endpoints (2026-10-17, on `main` @ `3f43c13`)
- Status: Review. Added public, access-key-protected listing and detail routes before the
  session guard in `legacy/server.mjs`; missing/wrong `sw-access-key` returns 401, bad JSON
  returns 400, unknown catalogue entities return 404, and `LEGACY_CATALOG_DELAY_MS` can add
  a synthetic response delay for WP-22.
- Tests first: six new `queryListing` cases failed because the function did not exist, then
  passed after implementing filtering (`min-power`, connector), all three sort modes,
  bounded pagination, unknown-category handling, and Store-API-only product output in
  `legacy/catalog.mjs`.
- Contract coverage: the real stand-in listing and detail responses parse through
  `storeApiProductListingSchema` / `storeApiProductSchema`; the public endpoint rejects a
  missing access key without a login cookie.
- Verification: `npx vitest run tests/unit/legacy-catalog.test.ts` **11/11 passed**;
  `npx playwright test --project=contract` **47/47 passed**; `npm run check` **green**
  (17 unit files / 206 tests, Playwright 114/114, bundle 115.8 KB gz of 120 KB).
- Environment note: initial Playwright startup checks failed with sandbox `connect EACCES`
  against localhost; rerunning the unchanged command with local-server permission passed.
- Handoff: package diff is limited to `legacy/catalog.mjs`, `legacy/server.mjs`, the two
  specified test files, and this log. Unrelated concurrent working-tree changes in
  `package.json` and `.claude/launch.json` were preserved and excluded.
- State: committed and pushed to `main` as `fb4d9e7`.

## WP-05 — Public API allowlist (2026-10-17, on `main` @ `fb4d9e7`)
- Status: Review. Added framework-free `isPublicApi()` with exact matches for vitals/events
  and a slash-delimited `/api/shop/` prefix. `/api/shop` deliberately stays private, and
  ambiguous names, case variants, deeper exact-route suffixes, malformed encodings, and dot
  segments do not cross the boundary.
- Tests first: the new unit suite failed on the missing module, then passed all 15 positive
  and negative boundary cases. The auth middleware now returns early only for that helper.
- Added the logged-out Playwright `shop` project and its first security regression: `/api/me`
  still returns 401 without a session.
- Verification: `npx vitest run tests/unit/public-api.test.ts` **15/15 passed**;
  `npx playwright test --project=shop` **1/1 passed**; `npm run test:coverage` **221/221**
  with 96.85% statements / 93.91% branches / 97.87% functions / 96.68% lines; lint and
  typecheck passed; `npm run check` **green** (Playwright 115/115, bundle 115.8 KB gz of
  120 KB).
- Handoff: package changes are limited to the six allowed implementation/test/config files
  and this log. The unrelated `package.json` and `.claude/launch.json` changes remain
  unstaged and untouched.

## WP-07 — Portal and shop layouts (2026-10-17, detached worktree @ `9408eca`)
- Status: Review. The WP-05 full check on this base supplied the pre-refactor baseline;
  root then ran the focused and full post-refactor gates in this worktree.
- Refactored `app/app.vue` to retain only the skip link, document metadata, hydration marker,
  and `<NuxtLayout><NuxtPage /></NuxtLayout>` shell. The default layout now owns the unchanged
  portal header, `/api/me` request, CSRF token, logout form, and rollout state initialization.
- Added a public shop layout with no session request, CSRF token, or rollout state. Both layouts
  keep the `#main` skip-link target and reuse the extracted `AppLocaleSwitcher`.
- Verification: lint and typecheck passed; `npx playwright test --project=app --project=auth
  --project=rollout` **61/61 passed**; `npm run check` **green** (221/221 unit tests,
  Playwright 115/115, bundle 116.6 KB gz of 120 KB). No package-specific unit test is required
  for this behavior-preserving refactor.
- Dirty files: `app/app.vue`, `app/components/AppLocaleSwitcher.vue`,
  `app/layouts/default.vue`, `app/layouts/shop.vue`, and this progress log only.
- Integrated with WP-08 on `codex/storefront-complete`; the combined `npm run check` is
  **green** (221/221 unit tests, Playwright 115/115, bundle 116.6 KB gz of 120 KB).
  No Codex advice was needed.

## WP-08 — Shop strings in both catalogues (2026-10-17, detached @ `9408eca`)
- Status: Review. Implementation is integrated with WP-07 on `codex/storefront-complete`.
  Package files are `i18n/locales/de.json`, `i18n/locales/en.json`, and this log.
- Tests first: `node -e "...if (!data.shop) throw new Error(locale+'.shop is missing')"`
  failed as expected with `Error: de.shop is missing` (exit 1) before the catalogue edit.
- Added the package-specified top-level `shop` tree to both catalogues: navigation and cart
  labels, categories, listing/error/count copy, filters and connector types, sorting,
  pagination, product stock/actions/specifications, cart-page copy, and breadcrumbs. German
  is the source copy; English has the identical 42-key structure. Stock remains explicit text
  (`inStock` / `outOfStock`), not colour-only meaning.
- Local dependency-free verification: the prescribed 42 paths exist in both catalogues;
  `node -e "const fs=require('fs');const flat=o=>Object.values(o).flatMap(v=>typeof v==='string'?[v]:flat(v));for(const l of ['de','en']){const v=flat(JSON.parse(fs.readFileSync('i18n/locales/'+l+'.json','utf8')).shop);if(v.length!==42||v.some(x=>!x))throw Error(l+' invalid shop catalogue')}console.log('de/en shop catalogues: 42 non-empty messages each')"`
  passed.
- Verification: `npx vitest run tests/unit/i18n-catalogues.test.ts` **4/4 passed** after
  worktree-local Nuxt types were generated; lint and typecheck passed. A full `npm run check`
  was stopped because the existing `shop.*` Playwright project regex matched every spec when
  evaluated under the temporary `wp08-shop-i18n` directory, producing 228 duplicate tests.
  The unchanged full gate passed after integration from a path without `shop` in it:
  221/221 unit tests, Playwright 115/115, and bundle 116.6 KB gz of 120 KB.
- Environment note: `git rev-parse --show-toplevel` and `--is-inside-work-tree` report this
  checkout and `true`; Git diff/status required escalated worktree access from the root and
  the final diff was reviewed there. No Codex advisor consultation was needed and there is no
  implementation blocker.

## Completed Changes
- WP-00: setup + measurement only, no application code changes. `package.json` + `package-lock.json` modified by the two installs (uncommitted at time of writing; a human commits every diff).
- WP-02: `shared/contracts/catalog.ts` (zod contract + mapping, new), `tests/unit/catalog-contract.test.ts` (15 cases, new), progress log updated.

## Measurements

| Date | Commit | Route | Command | Runs | LCP | CLS | TBT | INP p75 (RUM) | Initial JS (gz) | TTFB cold/warm | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-17 | e34d009 | /portal/stations | `npm run lighthouse` | 3, median | 1957 ms | 0 | 39 ms | n/a (WP-19) | n/a (per-route tooling WP-13) | 20 ms (warm, local) | lab; portal baseline, WP-00 |
| 2026-10-17 | e34d009 | /portal/sessions | `npm run lighthouse` | 3, median | 1967 ms | 0 | 57 ms | n/a (WP-19) | n/a (per-route tooling WP-13) | 13 ms (warm, local) | lab; portal baseline, WP-00 |
| 2026-10-17 | e34d009 | /portal/invoices | `npm run lighthouse` | 3, median | 1956 ms | 0 | 34 ms | n/a (WP-19) | n/a (per-route tooling WP-13) | 12 ms (warm, local) | lab; portal baseline, WP-00 |
| 2026-10-17 | e34d009 | /portal/invoices/inv-0042/dispute | `npm run lighthouse` | 3, median | 2106 ms | 0 | 30 ms | n/a (WP-19) | n/a (per-route tooling WP-13) | 11 ms (warm, local) | lab; portal baseline, WP-00 |

Notes: medians from `.lighthouseci/` reports of the 2026-10-17 run; TTFB is the `server-response-time` audit on the local warm server (no cold/warm split yet); all numbers lab (mobile emulation, simulated throttling).

## Open questions
- WP-04: `legacy-php/` remains intentionally unchanged; it is the never-executed twin called
  out by the package and does not expose the new Store API routes.
