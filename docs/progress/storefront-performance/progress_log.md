# Storefront Performance Progress

## Status
Current step: WP-10 — Listing filters and sorting (ready for integration verification; WP-11 runs in parallel)
Completed steps: WP-00, WP-01, WP-02, WP-03, WP-04, WP-05, WP-06, WP-07, WP-08, WP-09, WP-16
Next step: integrate WP-10 and WP-11, then run the combined `npm run check` gate before human review

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
- Status: Done (human-accepted 2026-10-17). Added public, access-key-protected listing and detail routes before the
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
- Status: Done (human-accepted 2026-10-17). Added framework-free `isPublicApi()` with exact matches for vitals/events
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

## WP-06 — BFF shop endpoints (2026-10-17, detached worktree based on `5343b48`)
- Status: Done (human-accepted 2026-10-17). Implementation and the neutral-path integration gate are complete.
- Tests first: the new contract/query/mapping tests initially failed 8 cases because the shop schemas and
  mappers did not exist; the public BFF E2E initially failed 3 cases with 404 routes. After the BFF was
  implemented, the listing correctly returned the accepted catalogue's 20 products, exposing the package's
  previously unresolved requirement for exactly 24 products and a non-empty CCS filter.
- Approved scope decision: the user allowed `legacy/catalog.mjs` and
  `tests/unit/legacy-catalog.test.ts` into WP-06. Four deterministic products were added per category,
  including two meaningful synthetic CCS fixtures per category. All eight new fixtures deliberately reuse
  existing valid placeholder image URLs; no generated assets or image scripts changed. The expanded catalogue
  has 48 products, exactly 24 per category, stable unique IDs/slugs, valid prices and stock states, and every
  product still parses through `storeApiProductSchema`. The expanded catalogue tests first failed 5 expected
  assertions (40/48 total, 20/24 per category, missing new fixtures, empty CCS subset, pagination total), then
  passed after the fixture change.
- Added logged-out Nuxt BFF routes for category listings and product detail. Query validation/coercion, sorting,
  pagination, minimum power and connector mapping are contract-backed; invalid queries return 400, unknown
  entities preserve 404, raw legacy responses are parsed before mapping, prices are rounded to integer cents,
  and Store API requests use a server-only access key without forwarding the portal cookie. The stand-in Store
  API now resolves category/product slugs as well as legacy IDs.
- Verification: `npx vitest run tests/unit/catalog-contract.test.ts tests/unit/legacy-catalog.test.ts`
  **37/37 passed**; isolated `npx playwright test tests/e2e/shop-public.spec.ts --project=shop` **4/4 passed**;
  isolated `npx playwright test --project=app` **36/36 passed**; `npm run lint` passed; `npm run typecheck`
  passed. In the attempted full `npm run check`, lint, typecheck, token/migration checks and coverage all passed
  (18 files / 232 tests; 96.50% statements, 93.16% branches, 97.95% functions, 96.25% lines).
- Full-gate environment note: Playwright selected 231 tests because the shop project's
  `/shop.*\\.spec\\.ts/` regex also matched the absolute worktree directory `wp06-bff-shop`; unrelated signed-in
  specs therefore ran a second time under the logged-out shop project. That invalid duplicate run ended with
  214 passed / 17 failed, all 17 from unrelated `invoices`, `mobile`, or `portal` specs under `[shop]`.
- Integrated verification: the neutral-path `npm run check` passed with **251/251 unit tests**,
  Playwright **118/118**, and client JS **116.6 KB gz of 120 KB**. The CCS E2E assertion was
  strengthened during review to require a non-empty result whose products all carry `connectorType: 'CCS'`.
- Package scope: `legacy/catalog.mjs`, `legacy/server.mjs`, `nuxt.config.ts`,
  `server/utils/legacy.ts`, `shared/contracts/catalog.ts`, the two new shop API handlers,
  `tests/unit/catalog-contract.test.ts`, `tests/unit/legacy-catalog.test.ts`,
  `tests/e2e/shop-public.spec.ts`, and this log. No Codex advisor consultation was needed.

## WP-07 — Portal and shop layouts (2026-10-17, detached worktree @ `9408eca`)
- Status: Done (human-accepted 2026-10-17). The WP-05 full check on this base supplied the pre-refactor baseline;
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
- Status: Done (human-accepted 2026-10-17). Implementation is integrated with WP-07 on `codex/storefront-complete`.
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

## WP-09 — Listing page `/shop` and `/shop/c/[category]` (2026-10-17, detached @ `0dfe80b`)
- Status: Done (human-accepted 2026-10-17). Added the permanent `/shop` → `/shop/c/wallboxes` redirect and an SSR category
  listing on the public shop layout. The category page requests 12 items so each accepted 24-product
  fixture has two real pages; it renders a semantic list, translated heading/count/error/stock text,
  locale-aware euro prices, accessible pagination, and no portal navigation.
- Tests first: `tests/e2e/shop-listing.spec.ts` initially failed **5/5** because the routes and UI did
  not exist. After implementation, the focused suite passed **5/5** and the complete logged-out shop
  project passed **9/9**, covering the two-step Nuxt canonical `/shop` → `/shop/` → category redirect,
  12+12 pagination, prices and textual stock, absence of the portal navigation, and axe checks for the
  default and `stadtwerke-demo` themes.
- Added `ShopProductCard.vue` and two stories. The card deliberately uses a plain `<a>` because the
  current Storybook preview has no `NuxtLink` stub; this trades client-side card navigation for a story
  that renders without Nuxt. It uses tokens only and keeps the exact WP-09 baseline comment on a plain,
  eager largest-source `<img>` with alt text and no width/height/lazy-loading optimization. The page-level
  axe tests exercise the card; the existing Storybook E2E registry is hard-coded to design-system stories,
  so the new story is built but not auto-enumerated by that unchanged out-of-scope test.
- Inventory: `/shop` and `/shop/c/:category` are registered as `nuxt-native` with ADR `0007` and their
  implementing files. `npm run migration:status -- --check` passed with 7/7 migrated, 1 stays-legacy,
  and 2 Nuxt-native routes.
- Verification: lint and typecheck passed; `npm run budget` passed at **118.4 KB gz / 120 KB**.
  `npm run check` passed fully: tokens and inventory clean, **19 unit files / 251 tests**, coverage
  96.22% statements / 91.66% branches / 98.36% functions / 96.74% lines, Playwright **123/123**, and
  the repeated production budget **118.4 KB gz / 120 KB**. No budget increase, route rule, image
  optimization, dependency, or generated shop-asset change was made. No Codex advisor was needed.

## WP-10 — Listing filters and sorting (2026-10-17, detached @ `5333120`)
- Status: Ready for integration verification; human review and the combined full gate remain pending.
- Tests first: the expanded listing spec initially ran **6 passed / 5 failed**. The new connector,
  minimum-power, price-ordering, direct SSR, and keyboard cases failed against the unfiltered page,
  while the filtered axe case already passed. The first implementation exposed a test-timing issue:
  Playwright could change the server-rendered controls before Vue hydration attached the `input`
  listeners. The tests now follow the repository convention of waiting for `data-hydrated` before
  client interaction; direct no-JavaScript SSR remains a separate pre-hydration assertion.
- Added a semantic GET filter form with a translated fieldset/legend, visible labelled controls,
  real query names, and a keyboard-reachable submit button. `minPower`, `connector`, and `order`
  are validated from the URL, forwarded to the BFF, preserved across pagination, and immediately
  navigate on every hydrated input event while resetting pagination. The exact WP-10 no-debounce
  baseline comment is retained, and all new styling uses design tokens.
- Verification: focused hydrated-interaction grep **4/4 passed**; full
  `tests/e2e/shop-listing.spec.ts` **11/11 passed**; complete shop project **15/15 passed**;
  `npm run lint` passed; `npm run typecheck` passed. The full `npm run check` was deliberately
  deferred for the root integration branch after WP-11, as scheduled. Existing `/shop/cart`
  missing-route warnings were emitted by the shop shell but did not fail any gate.
- Package scope: `app/pages/shop/c/[category].vue`, `tests/e2e/shop-listing.spec.ts`, and this log.
  No dependency, route-rule, locale, generated-asset, or budget change was made. No Codex advisor
  consultation was needed.

## WP-16 — Field metrics schema and aggregation logic (2026-10-17, detached from `5343b48`)
- Status: Done (human-accepted 2026-10-17). Added the shop-only vitals beacon
  contract, route normalization, nearest-rank percentile calculation, and a fixed-capacity in-memory
  ring buffer that reports p75 and rating counts per normalized route and metric.
- Tests first: after generating the ignored Nuxt type scaffolding, the new targeted suite failed on
  the missing `server/utils/vitals-store` module, then passed **19/19** after implementation. Cases
  cover valid/invalid schema boundaries, metric-specific ceilings, normalization (including cart),
  percentile behavior, capacity validation, oldest-entry eviction, p75, and rating counts.
- Verification: `npx vitest run tests/unit/vitals.test.ts` **19/19 passed**;
  `npm run test:coverage` **240/240 passed** with 96.48% statements / 92.2% branches /
  98.3% functions / 97.08% lines; `npm run lint` and `npm run typecheck` passed.
- Handoff: changes are limited to the four WP-16 implementation/test/config files and this log.
  The integrated `npm run check` passed: **240/240 unit tests**, Playwright **115/115**, and
  client JS **116.6 KB gz of 120 KB**. Human acceptance was recorded on 2026-10-17.

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
