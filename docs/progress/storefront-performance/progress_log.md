# Storefront Performance Progress

## Status
Current step: WP-21 Done (human-accepted); WP-23 Review; WP-22 combined integration verification In progress
Completed steps: WP-00, WP-01, WP-02, WP-03, WP-04, WP-05, WP-06, WP-07, WP-08, WP-09, WP-10, WP-11, WP-12, WP-13, WP-14, WP-15, WP-16, WP-17, WP-18, WP-19, WP-20, WP-21, WP-26
Next step: combined WP-20/21/22/23 budget and full check; human review of WP-23

## Decisions
- 2026-10-18: Human accepted WP-21 at integrated and pushed commit `48b9714`.
- 2026-10-18: Human explicitly approved extending WP-22 to `scripts/rum-sample.mjs`: require the correct query and a successful API or Nuxt cached-payload response, with a failing-before/passing-after cache-on run. Existing telemetry-delivery verification must remain intact.
- 2026-10-18: Human explicitly approved WP-22 extending `tests/e2e/shop-listing.spec.ts`: accept the API or query-aware Nuxt payload transport while verifying the complete sorted result. A cache-on diagnostic showed all 12 prices correctly descending; the old API-only wait was incompatible with Nuxt's cached-route payload loading.
- 2026-10-18: Human explicitly approved extending WP-21's edit scope to `tests/e2e/shop-cart.spec.ts` for a permanent persisted-cart hydration regression. Product-page controls isolate the header-only shift (CLS 0.0007–0.0024); the initial larger cart-page values also included cart-content restoration.
- 2026-10-17: Human explicitly approved WP-22's additional `server/plugins/shop-cache-safety.ts` runtime hook, outside its original file list, to remove only the shop i18n response cookie before cache capture while preserving locale detection and portal/other cookies. Cache variant and no-cookie tests remain required.
- 2026-10-17: Human accepted WP-20 at integrated commit `32532be`; continue the authorized backlog with GPT-6 Luna high subagents. Measurement/build gates remain serialized between isolated worktrees.
- Plan: `docs/instructions/storefront-performance/instructions.md`.
- Execution: one work package per fresh session, see `docs/instructions/storefront-performance/packages/README.md`.
- 2026-10-17: branch `feat/storefront-performance` cut from `feat/login-in-nuxt-ds-i18n-rollout` (Track A committed/pushed; base `e34d009`).
- 2026-10-17: installed per WP-00 — `@nuxt/image@2.1.0`, `web-vitals@6.2.3` (runtime `nuxt@4.6.1`); `@nuxt/image` is intentionally **not** registered in `nuxt.config.ts` yet (WP-20 does that, so the WP-15 baseline is measured without it).
- 2026-10-18: human approved adding `server/plugins/shop-cache-safety.ts` to WP-22's file scope for a route-scoped Nitro `render:response` hook; it removes only the i18n locale cookie from public shop HTML and preserves other cookies.
- 2026-10-18: human approved the bounded `tests/e2e/shop-listing.spec.ts` sorting-test update. It accepts the exact API or query-aware category payload transport and verifies all 12 rendered slug/price pairs against the parsed BFF contract response.
- 2026-10-18: human approved the bounded `scripts/rum-sample.mjs` listing-transport compatibility update. Preserve accepted telemetry receipt-proof logic from `8c2bc38`; retain its API-only wait for a genuine cache-on RED, then accept exact API or category payload paths only for the requested connector/sort query and require HTTP 200.

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
- Status: Done (human-accepted 2026-10-17). WP-13 replaced the aggregate JS gate and the
  resulting full `npm run check` passed.
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
- Integrated with WP-11 on `codex/storefront-complete`. The combined `npm run check` passed lint,
  typecheck, token/inventory checks, **251/251 unit tests**, and Playwright **135/135**. Its final
  aggregate client-JS check reported **120.9 KB gz / 120 KB**. This is the structural all-route
  sum explicitly assigned to WP-13; no budget was raised and the deliberately naive baseline was
  not prematurely optimized. WP-12 may proceed because WP-11's functional prerequisite is met,
  while WP-10/WP-11 remain verification-deferred until WP-13 removes the dependency deadlock.

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

## WP-17 — Vitals endpoint and browser plugin (2026-10-17, detached from `254ce7d`)
- Status: Done (human-accepted 2026-10-17). Tests were written first; the focused shop E2E failed **3/3** before
  implementation (missing summary data and two 404 responses where 400 was required), then
  passed **3/3** after implementation. The complete shop project passed **26/26**.
- Added a public 2 KB-bounded `text/plain`/`application/json` beacon endpoint with schema
  validation, per-IP rate limiting that respects `runtimeConfig.trustProxy`, the WP-16
  module-level ring-buffer store, and a 204 response. The public summary route exposes only
  the aggregate store summary.
- The client-only plugin loads the installed `web-vitals@6.2.3` attribution build and registers
  LCP, INP, CLS, TTFB and FCP only for `/shop` routes. It sends no identity or cookies, truncates
  LCP/INP targets to 200 characters, uses `sendBeacon` first and a cookie-free keepalive fetch
  fallback. Headless Chromium did not report INP reliably, so the browser regression asserts
  real LCP/CLS beacons after a keyboard interaction and page hide, as the package permits.
- Verification: focused vitals unit **19/19**, coverage **279/279** (95.26% statements,
  89.95% branches, 98.78% functions, 95.62% lines), lint and typecheck passed. `npm run budget`
  passed all seven routes; the attribution build added **5.129–5.132 KB gz** per initial route
  versus the WP-13 baselines, with every route still below its hard budget. The full
  `npm run check` passed with both isolated legacy-port overrides: coverage **279/279**,
  Playwright **140/140**, build, token/inventory checks, and all route budgets green.
- Infrastructure prerequisite `12af1b2` was cherry-picked separately as local commit `1d6b0ee`
  to isolate the route-budget legacy port; the integration base already contains that fix and
  must integrate only the later WP-17 feature commit. The original package worktree changes were
  limited to the four authorized implementation/test files and this workflow log. No Codex advisor
  consultation was needed during that implementation.
- Integration correction: combining WP-17 with WP-26 changed Rollup's shared-chunk compression
  and failed the unchanged portal budgets at **122.149/124.930 KB gz**. The approved WP-17 scope
  amendment moved the browser registration from the global plugin into lazy client component
  `ShopVitals.client.vue`, rendered by the shop layout. A static layout import was rejected because
  Nuxt prefetches layout chunks on portal routes. The lazy boundary preserves real LCP/CLS delivery
  (**5/5** focused vitals + SEO E2E) while excluding attribution code from portal requests.
  The combined `npm run check` passed: **284/284** unit tests, **142/142** Playwright tests,
  build/token/inventory gates, and all seven unchanged route budgets. Final sizes were
  **118.085 KB** for stations/sessions, **120.862 KB** for invoices/dispute, **124.882 KB** for
  listing, **126.932 KB** for product, and **121.574 KB** for cart.

## WP-18 — Conversion funnel events (2026-10-17, `codex/wp18-funnel-events` @ `70ea536`)
- Status: Done (human-accepted 2026-10-17 at integration commit `6b5e6eb`). Tests were written first: the focused unit suite failed because the events
  contract did not exist, and the focused browser test timed out waiting for the absent
  `listing_view` request. After implementation the unit suite passed **5/5**, the focused browser
  funnel passed **1/1**, and the complete shop project passed **29/29**.
- The pure funnel counts raw events while conversion numerators count each distinct tab once only
  when the next step occurs later in array order. A cart-only event increments `addToCarts` but not
  the product-to-cart numerator; repeated events increase raw totals but not rate membership; zero
  denominators return `null`. Unit coverage includes all three decisions and schema boundaries.
- Added the public, in-memory event endpoint and aggregate route with the WP-17 2 KB body/content-
  type pattern, schema validation, a 120/min per-IP limiter respecting `trustProxy`, a 5,000-event
  cap, and 204 responses. The client composable keeps a random UUID in `sessionStorage`, sends no
  identity or cookie value, uses `sendBeacon` then a cookie-free keepalive fetch, and tracks the
  listing mount, valid product mount, and cart-add handler. The E2E observes all three POST 204s
  before asserting positive aggregate counts and conversion rates in one fresh tab.
- Verification: lint and typecheck passed; coverage **289/289** (95.78% statements, 90.63%
  branches, 98.87% functions, 96.14% lines). The full `npm run check` passed with both isolated
  legacy-port overrides on 18083: coverage **289/289**, Playwright **143/143**, build,
  token/inventory checks, and all seven route budgets. Final route sizes were **118.086 KB** for
  stations/sessions, **120.864 KB** for invoices/dispute, **125.202 KB** for listing,
  **127.299 KB** for product, and **121.575 KB** for cart.
- An immediate first full-shop run encountered a Playwright server-lifecycle race: existing routes
  returned 404 and then port 3000 refused connections. After confirming ports 3000/18083 were free,
  the unchanged suite passed **29/29**; the telemetry limiter did not throttle the complete shop
  volume. The package-named vitals plugin had moved in the accepted base, so its beacon pattern was
  read from `ShopVitals.client.vue`. Changes remain limited to the eight authorized files and this
  workflow log. No Codex advisor consultation was needed.
- Integration review found that parallel browser telemetry could make aggregate positive-rate
  assertions pass even if the per-tab UUID changed between steps. The E2E now also parses the
  three accepted request bodies and proves one non-empty, bounded `tabId` is reused across listing,
  product, and cart events. The strengthened focused E2E passed **1/1** and lint passed on the
  integration branch.

## WP-19 — Synthetic RUM driver and baseline (2026-10-17, `codex/wp19-rum-sample`)
- Status: Done (human-accepted 2026-10-17 at integration commit `3a09284`). Added `scripts/rum-sample.mjs` and `npm run rum:sample`. Each run uses a new
  390×844 mobile context, CDP CPU slowdown 4, listing connector/sort changes, third product,
  add-to-cart, cart, then `about:blank`; telemetry status and minimum LCP/CLS sample coverage are
  checked. `RUM_LEGACY_PORT` defaults to 8080. Two final 30-run captures used the same production
  build from `a370cef`, each with a fresh server process on legacy port 18085.
- Baseline 1 and 2 funnel totals were each **30 listing / 30 product / 30 adds**, with both distinct-
  tab conversion rates at **100%**. All **476 vitals** and **180 funnel** POSTs across both runs
  returned 204, with zero rate limits or failed requests.
- LCP p75 run 1 → run 2: category **240 → 232 ms** (8 ms spread), product **148 → 156 ms**
  (8 ms), cart **228 → 232 ms** (4 ms). CLS was **0.000** in both runs with 30 samples per route.
  INP samples were sparse: category **16 ms (n=1)** in both runs; product **24 ms (n=3)** then
  **24 ms (n=2)**; cart **no sample**. First-input entries appeared in all 30 runs. The auxiliary
  `performance.getEntriesByType('event')` diagnostic returned zero, which does not establish that
  Event Timing entries or interaction IDs were unsupported. The INP samples do not establish an
  INP noise floor.
- Route labeling uses the path active when the Web Vitals callback fires. Product-card links and
  the cart URL perform full document navigations; connector and sort changes update the listing
  route in the same document. This is synthetic RUM, not real-user data.
- Flush diagnosis: awaiting `requestfinished` stalled on navigated sendBeacon requests even though
  the server returned 204. Following Codex advisor guidance, the driver now treats the observed
  HTTP response as completion, records failed tracked requests, and bounds the remaining wait.
  A final one-run trial passed with **8/8** vitals and **3/3** funnel POSTs accepted, with LCP/CLS
  coverage on all three routes. Full `npm run check` passed: lint, typecheck, token and migration
  checks; coverage **289/289**; Playwright **143/143**; production build; and all seven route budgets.
  Final budget sizes were **118.088 KB** stations/sessions, **120.866 KB** invoices/dispute,
  **125.205 KB** listing, **127.302 KB** product, and **121.577 KB** cart. Six-second deterministic
  pacing kept the synthetic run below the telemetry rate limit. Raw captures are preserved in the
  ignored `.lighthouseci-shop/rum-baseline-1.json` and `rum-baseline-2.json` files.
- Reliability follow-up during WP-20: two after-sample attempts failed on a missing browser
  beacon completion event (run 1, then run 19). The bounded WP-19 driver repair snapshots the
  owned server's per-route/per-metric counts before each journey and proves receipt of observed
  POSTs from count deltas after page hide. This reconciliation is disabled for shared
  `--no-start` servers. Unobserved responses are reported separately, never fabricated as 204s.
  Runtime failures now preserve incomplete JSON with current receipt counts and pending paths.
  Syntax/lint and independent review passed. A one-run trial and the complete 30-run WP-20 after
  sample passed; an in-memory missing-response-event regression passed with 8 server-confirmed
  beacons, and an in-memory intercepted-request regression failed as intended despite browser
  204s, preserving partial diagnostics. No product source changed for this repair. Combined
  integration `npm run check` passed: **289/289** unit tests, **144/144** browser tests,
  lint/typecheck, token/inventory checks, production build, and all seven unchanged route budgets.

## WP-11 — Product detail page `/shop/[slug]` (2026-10-17, detached from `5333120`)
- Status: Done (human-accepted 2026-10-17). WP-13 replaced the aggregate JS gate and the
  resulting full `npm run check` passed. Added the SSR product route with a
  real 404 response and accessible not-found state, breadcrumb, deliberately naive hero, localized
  description/price/stock/specs, cart-button stub, and eight eagerly rendered related products.
- Bounded interpretation: the narrow product contract exposes neither category nor description.
  For the synthetic two-category catalogue the page treats numeric `customFields.powerKw` as a
  wallbox signal and otherwise uses accessories; it reuses `shop.listing.caption` as descriptive
  copy. The same-category listing excludes the current slug and takes the first eight items.
- Tests first: the new six-case Playwright spec failed **6/6** because `/shop/[slug]` did not exist,
  then passed **6/6** after implementation. It covers detail/spec/related content, actual HTTP 404,
  breadcrumb semantics and navigation, textual out-of-stock disabling, and axe on product + 404.
- Verification: focused product spec **6/6 passed**; complete `shop` project **15/15 passed**;
  `npm run migration:status -- --check` passed with 3 Nuxt-native routes; lint and typecheck passed.
- Handoff: changes are limited to the page, migration inventory, product E2E spec, and this log.
  The combined integration gate passed lint, typecheck, token/inventory checks, **251/251 unit
  tests**, and Playwright **135/135**, then reported the planned aggregate-budget limitation at
  **120.9 KB gz / 120 KB**. WP-13 explicitly replaces that structurally invalid sum after WP-12 so
  all shop routes can be baselined together. No budget was weakened and no later optimization was
  pulled forward. Human acceptance is still required after the deferred full gate is green.

## WP-12 — Client-side cart (2026-10-17, detached from `8c5f4b9`)
- Status: Done (human-accepted 2026-10-17). WP-13 replaced the aggregate JS gate and the
  resulting full `npm run check` passed. Added
  immutable pure cart operations (duplicate merge, quantity clamp/removal, item count, integer-cent
  total), a shared Nuxt client cart with guarded localStorage persistence, a hydrated-only header
  count, product-page add/announcement behavior, and an accessible `/shop/cart` table with quantity,
  removal, total, change announcements, empty state, and the explicit no-checkout notice. SSR and
  the first client render deliberately omit the persisted count; it appears after `onMounted` loads
  storage so hydration remains stable.
- Tests first: the unit suite failed on the missing `#shared/cart` module after ignored Nuxt types
  were generated, and both cart E2E cases failed on the absent dynamic count and cart route. After
  implementation, focused cart unit tests passed **7/7** and focused keyboard/axe E2E passed **2/2**.
  The keyboard journey covers listing → product → add with retained focus → persisted reload → cart
  → quantity/total update → remove → empty state; axe is clean with and without items.
- Verification: complete `shop` project **23/23 passed**; `npm run test:coverage` **258/258 passed**
  (96.55% statements, 90.85% branches, 98.63% functions, 96.98% lines); lint, typecheck, and
  `npm run migration:status -- --check` passed with 4 Nuxt-native routes. The full `npm run check`
  passed lint, typecheck, token/inventory checks, coverage, Playwright **137/137**, and production
  build, then reached the planned aggregate-budget limitation at **122.9 KB gz / 120 KB**. The
  budget was not raised or weakened and no WP-13 work was pulled into this package.
- Package scope: `shared/cart.ts`, `app/composables/useCart.ts`, `app/pages/shop/cart.vue`,
  `app/pages/shop/[slug].vue`, `app/layouts/shop.vue`, `docs/migration-routes.json`, the two new
  cart test files, and this log. No locale change or Codex advisor consultation was needed.
- Review fixes: repeated keyboard activation now clears and resets the same persistent polite
  live-region node across `nextTick`, producing a fresh content mutation while button focus remains
  in place and the count reaches two. Non-finite quantities (`NaN`, positive/negative infinity)
  deterministically map to zero and remove the item instead of entering cart state. Tests first
  reproduced both defects; focused cart unit **10/10**, product/cart E2E **8/8**, lint, and
  typecheck all pass after the correction.

## WP-13 — Per-route JavaScript budget (2026-10-17, detached from `6bdc1fa`)
- Status: Done (human-accepted 2026-10-17). Replaced the hard aggregate client-JavaScript sum with a browser-measured hard
  budget for seven representative portal and shop routes. Each route uses a fresh browser context,
  portal routes use the demo session, emitted `/_nuxt/*.js` files are read from `.output/public`
  and gzipped locally, and hydration plus initial network idle define a deterministic first-visit
  boundary. Stale ports, redirects, missing client JavaScript, missing build assets, absent budgets,
  and over-budget measurements all fail hard; browser and child processes are closed in `finally`.
- Tests first: after `nuxt prepare`, the focused suite failed on the deliberately missing
  `scripts/lib/route-budget.mjs`. The implemented pure parser/evaluator then passed **8/8** cases,
  covering under/equal/over, a missing budget, JSON/object input, numeric shorthand, and invalid
  definitions. The first hydration-only calibration exposed a prefetch race on the dispute route;
  adding initial network idle produced two byte-identical zero-budget calibration runs.
- Budgets: portal thresholds are the measured baseline +5%, rounded upward to 0.1 KB; shop
  thresholds are the measured baseline +10%, rounded upward to 0.1 KB and marked provisional.
  The former aggregate total remains visible (**122.9 KB gz / 120 KB**) but is informational only.
- Verification: targeted unit **8/8**, full coverage **269/269** (94.96% statements, 89.32%
  branches, 98.71% functions, 95.36% lines), lint, and typecheck passed. A deliberate all-zero
  `npm run budget` failed all seven routes and printed their baselines; the calibrated fresh
  `npm run budget` passed. Full `npm run check` passed lint, typecheck, token and migration checks,
  coverage, Playwright **137/137**, production build, informational aggregate output, and all seven
  hard per-route gates. No Codex advisor consultation was needed.
- Review fix: the seven representative routes are now an exported immutable list independent of
  threshold configuration, and the production driver always measures that list before evaluation.
  A missing threshold remains in the deterministic report as `budget missing`; stale extra keys
  are rejected in sorted order before servers start. Tests first failed because the new route list
  and coverage validator were absent, then the focused suite passed **11/11**. A deliberate
  production run with `/portal/sessions` removed still measured all seven routes and failed only
  that route for its missing budget. After restoring the unchanged thresholds, lint, typecheck,
  `npm run budget`, and full `npm run check` passed: coverage **272/272** (95.12% statements,
  89.42% branches, 98.76% functions, 95.5% lines), Playwright **137/137**, build, aggregate
  information, and all seven per-route gates.
- Handoff: initial implementation commit `781c577`; its required-route review fix is contained in
  this follow-up commit. Both are based on `6bdc1fa` on the detached WP-13 worktree; package scope
  is limited to `scripts/lib/route-budget.mjs`, `scripts/check-route-budget.mjs`,
  `scripts/route-budgets.json`, `scripts/check-bundle-size.mjs`, `package.json`,
  `tests/unit/route-budget.test.ts`, and this log. Human acceptance is still required.
- Runner port-isolation follow-up (integrated base `eb43912`): `ROUTE_BUDGET_LEGACY_PORT`
  now parses as an optional integer from 1 to 65535 with default `8080`. The runner derives its
  legacy origin from that port, rejects occupied legacy/app ports with a direct TCP bind check,
  starts the legacy child with `LEGACY_PORT`, and starts built Nuxt with the matching
  `NUXT_LEGACY_ORIGIN`; app port `3000` and all thresholds remain unchanged.
- Follow-up tests first: the focused suite failed **7 new cases** because `parseLegacyPort` did
  not exist, then passed **18/18** after implementation. The default production runner refused
  the user-owned occupied `8080` before starting children. `npm run lint` and
  `npm run typecheck` passed. With both the existing E2E override and new runner override set to
  isolated `18081`, full `npm run check` passed: coverage **279/279** (95.26% statements,
  89.95% branches, 98.78% functions, 95.62% lines), Playwright **137/137**, build, aggregate
  information, and all seven unchanged per-route budgets. The user-owned `8080` server was not
  stopped or reused.

## WP-14 — ADR 0007: public shop area, inventory status, per-route budgets (2026-10-17, detached from `254ce7d`)
- Status: Done (human-accepted 2026-10-17). The combined integration gate passed; the ADR remains
  `proposed` until the WP-27 closeout step changes its document status.
  The proposed ADR documents the public SSR rationale, synthetic catalogue
  boundary, exact public API allowlist, separate cache-ready shop layout, `nuxt-native` inventory
  meaning, and the accepted WP-13 measurement model and baselines. It also records the added
  complexity and exclusions, including the client-only cart, absent CDN behavior, and unchanged
  `legacy-php/` twin, without treating the stand-in as a real Shopware integration.
- Package scope: new `docs/adr/0007-public-shop-and-budgets.md`, the single README decision-record
  line, and this workflow log only. No behavior changed, so no test-first step applies.
- Verification: `npm run lint` passed; the bounded diff was reviewed and committed locally before
  integration. The ADR remains `proposed` until the WP-27 closeout acceptance step.

## WP-15 — Public-shop Lighthouse baseline (2026-10-17, detached from `254ce7d`)
- Status: Done (human-accepted 2026-10-17). The serialized integration `npm run check` passed
  with isolated legacy port `18084`; the user-owned dev stack on `8080` was neither stopped nor
  reused.
- Tests first: `npm run lighthouse:shop` initially failed because the script did not exist. After
  adding the public configuration and driver options, an explicit default-port regression check
  exposed that the former HTTP stale-server probe could miss an IPv4-bound listener and reach an
  `EADDRINUSE` child failure. The probe now uses an exclusive TCP bind; with `8080` occupied,
  `node scripts/lighthouse.mjs` exits immediately with the intended stale-server refusal.
- Added `lighthouserc.shop.cjs` for the four required public routes, five runs, median-run output
  in `.lighthouseci-shop`, performance/accessibility/best-practices/SEO categories, warn-only
  performance/LCP/CLS/TBT assertions, and the hard accessibility `1.0` assertion. The public mode
  skips login and removes any inherited `LH_COOKIE`; the portal's default authenticated behavior
  remains unchanged.
- The runner now accepts `--config <file>` and `--public`. `LIGHTHOUSE_LEGACY_PORT` defaults to
  `8080`; the measurement used isolated port `18080`, which is forwarded to the legacy child and
  to Nuxt as `NUXT_LEGACY_ORIGIN`. Nuxt stayed on `3000`. This preserved the default stale-server
  refusal without touching the active user stack.
- Verification: `LIGHTHOUSE_LEGACY_PORT=18080 npm run lighthouse:shop` completed **20/20 audits**
  and wrote ignored reports; all four accessibility scores were **1.00**. The expected naive
  baseline warnings were performance/CLS/LCP on the two listing variants and product page.
  `LIGHTHOUSE_LEGACY_PORT=18080 npm run lighthouse` completed the existing authenticated portal
  sweep **12/12** with all assertions passing. `npm run lint` and `npm run typecheck` also passed
  after the recorded measurement run and final driver correction.
- Warning: every public audit requested `/robots.txt`, which currently has no Nuxt route and emits
  `VUE_ROUTER_R0004`; adding that route is outside WP-15's authorized files. Lighthouse reports
  remain local and ignored. Package scope is `lighthouserc.shop.cjs`, `scripts/lighthouse.mjs`,
  `package.json`, `.gitignore`, and this progress/measurement handoff.

## WP-26 — SEO basics for public pages (2026-10-17, detached from `254ce7d` + local WP-15 parent)
- Status: Done (human-accepted 2026-10-17). The required WP-15 verification
  dependency (`b6d901e`, applied locally as `75bbf83`) supplies `npm run lighthouse:shop`; the
  eventual WP-26 commit must be cherry-picked without treating that parent as WP-26 scope.
- Tests first: the focused unit suite failed on the missing `#shared/seo` module. Added exact
  Product/Offer and BreadcrumbList builder cases, cents-to-decimal EUR pricing, out-of-stock
  mapping, canonical rules, and safe script serialization proving every `<` becomes the literal
  `\\u003c` sequence while remaining parsable JSON. The SSR Playwright coverage verifies
  title, description, canonical URL, parsable Product JSON-LD/price, filtered page-one canonical,
  and page-two canonical.
- Implementation: product and category pages use typed `useSeoMeta`, absolute largest-image
  Open Graph metadata, canonical links, and safely serialized JSON-LD scripts. Product pages emit
  Product plus breadcrumb data; category pages emit breadcrumb data. Nuxt's typed Open Graph union
  does not include `product`, so the product page uses supported `website` Open Graph type while
  retaining schema.org `Product` semantics in JSON-LD.
- Canonical decision: every listing canonical strips filters. Page one points to the unfiltered
  category URL; page two and later retain only `?page=N`. This prevents filter combinations from
  fragmenting canonical identity while keeping pagination independently discoverable.
- Language-alternate limitation for ADR 0008: the accepted `no_prefix` strategy gives German and
  English the same URL, so there is no truthful alternate URL to publish and no `hreflang` is
  emitted. A prefix strategy such as `/de/...` and `/en/...` would create distinct targets and
  allow reciprocal alternates (plus an optional `x-default`).
- Verification: focused SEO unit **5/5 passed**; coverage **277/277 passed** (95.29%
  statements, 89.62% branches, 98.83% functions, 95.65% lines); lint and typecheck passed. The
  focused SSR SEO E2E passed **2/2** and the complete `shop` project passed **25/25**, both with
  `E2E_LEGACY_PORT=18083`. `LIGHTHOUSE_LEGACY_PORT=18083 npm run lighthouse:shop` completed
  **20/20 audits** (5 runs × 4 routes): SEO score **1.00** on the unfiltered listing, filtered
  listing, and product route; the unchanged cart route scored **0.90**. Accessibility remained
  **1.00** on all routes. The only route warning was WP-15's known missing `/robots.txt`; the
  listing/product performance and LCP/CLS baseline findings remained warn-only. Google's Rich
  Results Test was **not performed** because no public URL was supplied. The package worktree was
  not pushed independently.
- Integration verification: the combined `npm run check` passed with **284/284** unit tests,
  **142/142** Playwright tests, production build, and every unchanged per-route budget after the
  WP-17 lazy client-boundary correction. The SEO implementation itself required no integration
  changes.

## WP-20 — Responsive image optimization (2026-10-17, worktree branch `codex/wp20-images`)
- Status: Review. Before lab reports were freshly measured from the accepted integration
  source (`ac4c33e`) because WP-15 predates later storefront changes. The source diff from the
  available WP-19 RUM baseline (`a370cef`) contains no product-code changes, so the baseline
  RUM rows below remain applicable. After Lighthouse completed **20/20 audits** (five runs ×
  four routes); raw JSON/HTML are preserved locally in `.lighthouseci-shop-after/` in the WP-20 worktree.
- Implementation: registered the existing IPX provider and opted the listing/related product
  cards and product hero into responsive WebP `srcset`, `sizes`, intrinsic 1600×1600 geometry,
  SSR hero preload, and explicit loading priority. The active image contract exposes only
  `{url, alt}`; no schema field was invented. Intrinsic 1600×1600 values are bounded to the
  verified synthetic `*-1600.jpg` assets (whose JPEG metadata was checked). Card default remains
  a plain JPEG `<img>` so Storybook works without Nuxt. Three listing images are eager (the
  desktop first row; at 390px this overfetches two below-fold images), first only is high
  priority, and images from index 3 are lazy.
- Nuxt Image component candidate was rejected because it exceeded existing hard route budgets
  (listing 128.755/126 KB, product 130.994/128 KB). The native IPX `<img>` approach passed the
  unchanged budgets; final route weights: listing **125.574/126 KB**, product **127.938/128 KB**.
- Lab comparison uses Lighthouse CI's selected representative run, not independently selected
  per-metric medians. Baseline → after: unfiltered listing LCP **3840→2705 ms** (five-run
  spreads 3836–3847 vs 2690–2787 ms), CLS **0.1654→0**, byte weight **503,777→203,323 B**;
  filtered listing LCP **2562→2458 ms** (2559–2564 vs 2455–2560 ms, slight overlap so no
  improvement beyond noise established), CLS **0.1655→0**, weight **210,595→161,459 B**;
  product LCP **3613→2933 ms** (3462–3616 vs 2701–2936 ms), CLS **0.1835→0**, weight
  **429,636→201,913 B**; cart control LCP **2284→2283 ms** (2284–2304 vs 2256–2285 ms),
  CLS remained 0, weight **136,697→136,687 B**. Accessibility remained 1.00 on all after routes.
  The unfiltered/product LCP assertions remain warn-only; the filtered result is treated as
  inconclusive. `/robots.txt` router warnings are unchanged.
- Verification: red-first focused E2E initially failed on absent hero geometry/loading attrs;
  after implementation focused shop tests passed **18/18**. Full `npm run check` passed with
  explicit `E2E_LEGACY_PORT=18086`, `ROUTE_BUDGET_LEGACY_PORT=18086`,
  `LIGHTHOUSE_LEGACY_PORT=18086`, and `RUM_LEGACY_PORT=18086`: lint, typecheck, tokens,
  migration status, coverage (**289/289**, 95.78% statements), Playwright (**144/144**), build,
  and all route budgets. Storybook build passed; direct browser checks of in-stock/out-of-stock
  card stories each loaded the JPEG (`naturalWidth=1600`) with no console/page errors.
- Synthetic RUM after-sample completed **30/30** against this optimized production build using
  the isolated legacy port. Route p75 (LCP; INP; CLS) was category **220 ms (n=30); 16 ms
  (n=27); 0 (n=30)**, product **156 ms (n=30); 24 ms (n=5); 0 (n=30)**, and cart **204 ms
  (n=30); no INP sample; 0 (n=30)**. Funnel totals were **30/30/30** with both conversion
  rates 100%. The run observed 240 vitals POSTs and 90 event POSTs, all 204, with zero request
  failures or 429s. INP coverage is sparse and cart has no INP sample; the backend summary may
  include unload metrics beyond observed browser requests, so 240 is not claimed as the full
  stored-record count. Raw JSON: ignored `.lighthouseci-shop/rum-wp20-after.json`.
- Status: Review. The bounded RUM sampler repair is a separate WP-19 integration change and is
  not part of the WP-20 source diff. No package or lockfile changes; no push.

## WP-21 — CLS and font stability (2026-10-18, worktree branch `codex/wp21-cls-fonts`)
- Status: Done (human accepted integrated commit `48b9714`). Scope stayed in the shop layout, its approved persisted-cart E2E regression,
  and this progress log. No font files/loaders were added: the shop uses system fonts, the
  Lighthouse font audit reported no shift, and WP-20's lab and RUM CLS baselines were already 0.
- Finding and tests first: on the stable product route, pausing initial scripts isolated the
  persisted-cart header change from cart-page content restoration. Before the fix, restoring
  count 1/12 moved the desktop cart/tools group left by 69.34/78.23 px at desktop widths; the
  product main content did not move. The regression was first run against the baseline layout
  and failed on these real header bounds. The approved permanent test checks geometry, live
  localized count, and horizontal overflow for de/en, widths 320/390/650/1280, and counts
  0/1/12/480; the 999-item CSS reserve is a sizing hint for ordinary counts, not an enforced
  maximum. Its two hidden reserve strings intentionally mirror the supported de/en
  `shop.cartCount` messages. The cart-link selector is scoped under the current shop header.
- Implementation: the shop cart link reserves the localized three-digit count's intrinsic
  width before hydration and overlays the live count in that grid cell after persisted state is
  restored. The accessible live count remains omitted from SSR and appears only after mount.
  No clipping/truncation or count validation was introduced; larger values expand naturally.
- Focused verification: the final 32-case geometry matrix passed (32/32, exit 0) with the
  Playwright baseURL fixture used for locale cookies. Full `npm run check` passed (exit 0) with
  `E2E_LEGACY_PORT=18088` and `ROUTE_BUDGET_LEGACY_PORT=18088`: lint, typecheck, token and
  migration checks; 289/289 unit tests (95.78% statements); Playwright 176/176; build; and all
  seven route budgets. Product initial JS is 127.953/128.0 KB gz (about 48 bytes headroom).
- Lab after: 20 Lighthouse reports (five runs × four routes), Lighthouse 12.6.1, mobile
  simulation, CLS 0 on all 20, and accessibility 1.00 on every route. Use the manifest-selected
  representative values: listing LCP/TBT 2689.892/210.764 ms; filtered listing
  2646.200/206 ms; product 2839.858/201.096 ms; cart 2023.654/102.587 ms. No aggregate lab
  CLS improvement is claimed because the accepted WP-20 baseline was also 0. WP-21 raw
  manifest/reports: ignored `.lighthouseci-shop/` in this worktree; WP-20 comparison artifacts
  remain in `.lighthouseci-shop-after/` in the WP-20 worktree.
- TBT environment check: the full WP-20-to-WP-21 report ranges had non-overlapping TBT and
  benchmarkIndex distributions, so that cross-run change is not treated as noise or attributed
  to this layout-only CSS. A same-window five-run product control (same route, Lighthouse
  12.6.1 and throttling) then measured baseline TBT 118.500–226 ms (benchmarkIndex
  1463.5–1716.5) and WP-21 TBT 147.500–162.718 ms (benchmarkIndex 1568–1704); the ranges
  overlap. LCP ranges were 2622–2933 ms baseline and 2616–2857 ms WP-21. All 10 control reports
  had CLS 0 and accessibility 1.00. This matched single-route result does not exonerate the
  source across other routes; the earlier cross-run differences remain environment-sensitive
  and causality is unproven. Raw controls: `.lighthouseci-shop/wp21-tbt-control-before/` and
  `.lighthouseci-shop/wp21-tbt-control-after/`.
- Synthetic RUM after: the command's raw sampler label remains WP-19, but this 30-run sample
  used the WP-21 after build and isolated port 18088. Category p75 LCP/INP/CLS:
  464 ms / 32 ms (n=20) / 0 (n=30); product 296 ms / 32 ms (n=1) / 0 (n=30); cart
  452 ms / no INP sample / 0 (n=30). Funnel totals 30/30/30, with 100% observed conversion.
  It observed 198 browser-response vitals POSTs and 90 event POSTs; 8 separately recorded
  server-confirmed beacons (6 listing LCP, 2 cart FCP/TTFB) are confirmations, not additional
  browser-observed responses. No failed requests or 429s. INP coverage is sparse; no RUM CLS
  improvement is claimed versus WP-20's zero baseline. Raw JSON:
  `.lighthouseci-shop/rum-wp21-after.json`.
- Retained experiment history: the first hidden-wrapper reserve exceeded the product route
  budget (128.053/128 KB); a smaller anonymous-text candidate fit the budget but failed the
  header-height/locale geometry assertion and was discarded. One initial permanent-test
  harness attempt timed out at its 5-second hydration wait under harness contention; the
  bounded 15-second wait then passed. An earlier full check exited 1 with Storybook reporting
  `Axe is already running` (no axe violation); the isolated three-story check passed 3/3 and
  the final full check passed 176/176 E2E. These attempts are preserved here rather than
  presented as green runs.
- Runtime overrides for these WP-21 runs: `E2E_LEGACY_PORT=18088`,
  `ROUTE_BUDGET_LEGACY_PORT=18088`, `LIGHTHOUSE_LEGACY_PORT=18088`, and
  `RUM_LEGACY_PORT=18088`; app port 3000. User ports 8080/3001 were left untouched.
- Source committed locally as `4c3fb1b`, integrated and pushed as `48b9714`, then human-accepted.
  No package/lockfile changes.
- GitHub Actions CI for `48b9714` completed successfully:
  [run 39080329593](https://github.com/GerritHoskins/charge-portal/actions/runs/39080329593).

## Completed Changes
- WP-00: setup + measurement only, no application code changes. `package.json` + `package-lock.json` modified by the two installs (uncommitted at time of writing; a human commits every diff).
- WP-02: `shared/contracts/catalog.ts` (zod contract + mapping, new), `tests/unit/catalog-contract.test.ts` (15 cases, new), progress log updated.

## WP-22 — Shop SWR caching (2026-10-18, `codex/wp22-caching` from `ac4c33e`)
- Tests first: the expanded cache E2E passed its cache-off safety cases while the positive cache-header assertion failed as expected; after the route rules were enabled, the dev project passed **7/7**. Production node-server verification also passed **7/7** with exit 0.
- `nuxt.config.ts`: listing routes (`/shop`, `/shop/c/**`) use Nitro SWR with `maxAge: 60`; products (`/shop/**`) use `maxAge: 300`; `/shop/cart` explicitly disables caching. Nitro key varies on full Cookie, Accept-Language, Host, and X-Forwarded-Proto; route query is part of the cache key. Full Cookie variation is correct but fragments cache reuse by session. Real catalogue mutations must purge cached entries or wait for their TTL.
- `server/plugins/shop-cache-safety.ts` (human-approved scope expansion): on shop HTML only, removes `i18n_locale` before Nitro's response capture while preserving other cookies; emits HTTP `Vary` for Cookie, Accept-Language, Host, and X-Forwarded-Proto in addition to Nitro's internal key variation. No other response cookies were observed in first/warm production requests. Future personalized cookies/content require revisiting the shared-cache contract.
- `server/middleware/csrf.ts` excludes shop HTML paths so logged-out cacheable responses do not create CSRF cookies; cart and API remain uncached. Category/product tests cover logged-out vs session HTML, no Set-Cookie on first/warm responses, cookie and Accept-Language locale precedence/alternation, query variants, host/protocol SEO origin separation, exact TTL headers, HTTP Vary, and cart/API cache exclusion.
- The render hook was exercised independently against real H3 events and Node `ServerResponse` objects: **7 in-memory cases passed** for locale-only removal, preserving multiple other cookies (including Expires commas) across mixed live/rendered headers, Vary deduplication while preserving Accept-Encoding, and leaving `/portal`/`/shopping` untouched. The probe also emulated Nitro's later application of `RenderResponse.headers` to catch overwrite behavior; it wrote no files and started no servers.
- Production cache headers were observed: listing `s-maxage=60` + SWR, product `s-maxage=300` + SWR, correct HTTP Vary and no Set-Cookie; cart/API have no shared cache policy. TTFB used no synthetic legacy delay, isolated legacy port 18087, fresh app process per route, listener/PID readiness only, first curl cold then four warm curls; all curl statuses were 0 and final wrapper exit was 0:

  | Cache state | Route | HTTP | Cold TTFB | Warm TTFB samples | Warm median |
  |---|---|---:|---:|---|---:|
  | off | `/shop` redirect | 301 | 63.5 ms | 4.13, 4.09, 2.84, 2.99 ms | 3.54 ms |
  | on | `/shop` redirect | 301 | 63.3 ms | 1.65, 1.29, 1.33, 1.58 ms | 1.46 ms |
  | off | `/shop/c/wallboxes` | 200 | 173.1 ms | 13.03, 12.76, 15.19, 14.10 ms | 13.57 ms |
  | on | `/shop/c/wallboxes` | 200 | 168.3 ms | 2.21, 1.39, 1.48, 1.54 ms | 1.51 ms |
  | off | `/shop/wallbox-home-7-4` | 200 | 187.9 ms | 23.12, 14.06, 20.20, 20.41 ms | 20.31 ms |
  | on | `/shop/wallbox-home-7-4` | 200 | 150.8 ms | 2.25, 1.40, 1.38, 2.02 ms | 1.71 ms |

- Lighthouse: `LIGHTHOUSE_LEGACY_PORT=18087 npm run lighthouse:shop`, five runs each across four routes (20/20 audits, exit 0), no synthetic delay. Cache-off and cache-on artifacts/manifests are preserved separately in `.lighthouseci-shop-wp22-before/` and `.lighthouseci-shop-wp22-after/`; each manifest references 20 existing JSON/HTML reports. Median LCP/CLS/TBT/performance score (lab, mobile emulation):

  | Route | Cache off representative: LCP / CLS / TBT / perf; five-run LCP range | Cache on representative: LCP / CLS / TBT / perf; five-run LCP range |
  |---|---|---|
  | `/shop/c/wallboxes` | 3845 ms / 0.16545 / 0 ms / 0.79; 3840–3848 ms | 3918 ms / 0.16545 / 1 ms / 0.78; 3846–3931 ms |
  | `/shop/c/wallboxes?connector=ccs` | 2558 ms / 0.16551 / 16 ms / 0.88; 2558–2565 ms | 2618 ms / 0.16551 / 5 ms / 0.88; 2615–2716 ms |
  | `/shop/ladekabel-typ-1-10-m` | 3467 ms / 0.18352 / 20 ms / 0.80; 3465–3616 ms | 3463 ms / 0.18352 / 29 ms / 0.81; 3459–3542 ms |
  | `/shop/cart` | 2284 ms / 0 / 48 ms / 0.96; 2255–2301 ms | 2283 ms / 0 / 29 ms / 0.96; 2256–2292 ms |

  These values use the representative run selected by each Lighthouse manifest and include the five-run LCP range. Accessibility was 1.00 on all 40 runs. The filtered listing's LCP ranges do not overlap (cache-on is about 60 ms slower); other route ranges overlap. This is a lab signal with uncertain causality, not evidence of a browser-speed gain from server caching. The known category/product performance, LCP, and CLS warnings persist; measured warm server TTFB is the demonstrated benefit.
- An independent representative-run network audit (exit 0) observed Nuxt initial-payload requests only in cache-on runs: listing 3,936 B, filtered listing 1,084 B, product 7,690 B, plus `/shop` redirect payload 369 B and accessories prefetch 3,862 B. Total transfer bytes were listing 503,584 → 504,999, filtered 210,402 → 211,853, product 429,442 → 451,371, and cart 136,521 → 137,229 (cache-off → cache-on). This is an observed payload/prefetch tradeoff and a plausible, unproven contributor to the filtered-route LCP regression; it does not establish causality or a browser-speed gain. Do not change global payload extraction as part of WP-22; assess it separately under WP-25.
- Source/config was held at the pre-WP-20 `ac4c33e` base plus WP-22 changes for both measurement states; no `LEGACY_CATALOG_DELAY_MS` was set. A cache-off production build and a cache-on production build both exited 0. The full check then had **147 passed / 3 failed** (actual exit 1): lint, typecheck, tokens, migration status, and unit coverage passed; the three failures were the session, locale, and SEO byte-equality checks. Their preserved error contexts all diverged first at byte 251: the exact `/assets/css/tokens.css` and `/assets/css/base.css` stylesheet tags appeared in reverse order. They had equal lengths, identical complete two-tag multisets, and identical remainder after removing these two tags and the exact empty `[[]]` dev log marker. A review of `tokens.css` and `base.css` confirmed the former defines only custom properties and the latter consumes them without redefining competing properties. The dev-only comparator now asserts exactly one of each full global stylesheet tag, compares the tag multisets, and removes only those exact paths before byte-comparing the remainder. It retains component-style multiset equality and rejects nonempty log markers; production HTML remains raw. No payload, body, or arbitrary script normalization was added.
- Sort-test diagnosis: cache-off, the original `sorts prices descending` test passes 1/1; cache-on it timed out waiting for `/api/shop/listing/wallboxes?...order=price-desc`. A browser diagnostic proves the cache-on UI has URL `/shop/c/wallboxes?order=price-desc`, requests `GET /shop/c/wallboxes/_payload.json?_b=dev`, then `GET /shop/c/wallboxes/_payload.json?order=price-desc&_b=1792276960083` (200), and makes no API listing request. All 12 visible cards are correctly descending: 1,287.25; 1,240.50; 1,193.75; 1,147.00; 1,100.25; 1,099.00; 1,053.50; 1,006.75; 999.00; 960.00; 913.25; 899.00 EUR. Following explicit human approval on 2026-10-18, the test now accepts either exact transport with status 200 and compares all 12 rendered slugs/prices against `shopListingSchema`-parsed BFF output.
- RUM sampler scope: the approved `scripts/rum-sample.mjs` extension is implemented only after a cache-on RED. Its telemetry receipt-proof, per-run partial diagnostics, incomplete-report preservation, and related safeguards were first ported unchanged from accepted integration commit `8c2bc38`; a diff against that commit now contains only the listing transport/query/status helper and two call sites.
- Cache-on RUM RED evidence: an earlier exit-0 sample at `.lighthouseci-shop-wp22-after/rum-cache-on-red.json` used stale `.output` built 2026-10-17 22:29:55Z, before `shop-cache-safety.ts` (22:37:16Z) and `nuxt.config.ts` (22:42:05Z); it is retained but is not evidence for current cache-on source. Rebuilt current source with `npm run build` (exit 0; `.output/nitro.json` dated 2026-10-18 00:03:50Z). Generated Nitro rules confirm listing SWR 60 seconds, product SWR 300 seconds, Cookie/Accept-Language/Host/X-Forwarded-Proto variations, and `/shop/cart` cache disabled. The unchanged API-only sampler then ran with `RUM_LEGACY_PORT=18087 node scripts/rum-sample.mjs --runs 1 --json .lighthouseci-shop-wp22-after/rum-cache-on-fresh-build-apiwait.json` and failed as intended with actual exit 1 after `waitForResponse` timed out at 30 seconds. The incomplete JSON is preserved (`completedRuns: 0`, category LCP/CLS partial telemetry present). The helper now matches exact origin, GET method, API or category payload pathname, and expected connector/sort query, then explicitly requires HTTP 200. Stale and valid RED artifacts remain separate.
- Cache-on RUM GREEN: `RUM_LEGACY_PORT=18087 node scripts/rum-sample.mjs --runs 3 --json .lighthouseci-shop-wp22-after/rum-cache-on-green.json` exited 0 against the fresh build. All three runs completed; 19 Vitals POSTs and 9 funnel POSTs were accepted, with 3/3 LCP and CLS coverage for category, product, and cart, no telemetry errors/rate limits, and 100% listing-to-product and product-to-cart conversions.
- Final production safety after the current build: 7/7 `shop-cache.spec.ts` tests passed (exit 0) against `.output/server/index.mjs`. This included the strengthened cold `Last-Modified` presence/validity check and stable warm value. The dev-focused rerun after the exact global stylesheet-order correction passed 7/7 (exit 0).
- Final full `npm run check` with both `E2E_LEGACY_PORT=18087` and `ROUTE_BUDGET_LEGACY_PORT=18087` exited 0: lint, typecheck, tokens, migration status, 289/289 unit tests (coverage statements 95.78%, branches 90.63%, functions 98.87%, lines 96.14%), 150/150 E2E, production build, bundle check, and route budget. Route JS results: `/portal/stations` 118.783/119.5 KB; `/portal/sessions` 118.783/119.5 KB; `/portal/invoices` 121.561/122.4 KB; dispute 121.561/122.4 KB; shop listing 125.901/126.0 KB; product 127.998/128.0 KB; cart 122.271/123.0 KB (all gzipped; each passed). The product route has only about 2 B of displayed headroom, so preserve the budget unchanged. The earlier 147/150 E2E failure receipt and its three original error contexts are retained under `.lighthouseci-shop-wp22-after/e2e-full-147-150/`. The full check's app and legacy listeners were stopped by their harness; final listener check confirmed no process on 3000 or 18087.

## Measurements

| Date | Commit | Route | Command | Runs | LCP | CLS | TBT | INP p75 (RUM) | Initial JS (gz) | TTFB cold/warm | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-18 | 352625e + WP-21 dirty | /shop/c/wallboxes | `npm run lighthouse:shop` | 5 | 2689.892 ms (rep; range 2671.572–2944.248 ms) | 0 | 210.764 ms (rep; range 117.572–259.913 ms) | n/a | n/a | n/a | WP-21 after; raw manifest/reports `.lighthouseci-shop/` |
| 2026-10-18 | 352625e + WP-21 dirty | /shop/c/wallboxes?connector=ccs | `npm run lighthouse:shop` | 5 | 2646.200 ms (rep; range 2611.092–2688.008 ms) | 0 | 206 ms (rep; range 144.636–230.611 ms) | n/a | n/a | n/a | WP-21 after; raw manifest/reports `.lighthouseci-shop/` |
| 2026-10-18 | 352625e + WP-21 dirty | /shop/ladekabel-typ-1-10-m | `npm run lighthouse:shop` | 5 | 2839.858 ms (rep; range 2839.858–3130.030 ms) | 0 | 201.096 ms (rep; range 61–301.493 ms) | n/a | n/a | n/a | WP-21 after; raw manifest/reports `.lighthouseci-shop/` |
| 2026-10-18 | 352625e + WP-21 dirty | /shop/cart | `npm run lighthouse:shop` | 5 | 2023.654 ms (rep; range 1887.322–2137.521 ms) | 0 | 102.587 ms (rep; range 81.246–162 ms) | n/a | n/a | n/a | WP-21 after; raw manifest/reports `.lighthouseci-shop/` |
| 2026-10-18 | 352625e + WP-21 dirty | /shop/c/:category | `node scripts/rum-sample.mjs --runs 30 --json .lighthouseci-shop/rum-wp21-after.json` | 30 | 464 ms p75 (n=30) | 0 (n=30) | n/a | 32 ms p75 (n=20) | n/a | n/a | WP-21 after build; aggregate route label; 30/30/30 funnel |
| 2026-10-18 | 352625e + WP-21 dirty | /shop/:slug | `node scripts/rum-sample.mjs --runs 30 --json .lighthouseci-shop/rum-wp21-after.json` | 30 | 296 ms p75 (n=30) | 0 (n=30) | n/a | 32 ms p75 (n=1) | n/a | n/a | WP-21 after build; dynamically selected product; sparse INP |
| 2026-10-18 | 352625e + WP-21 dirty | /shop/cart | `node scripts/rum-sample.mjs --runs 30 --json .lighthouseci-shop/rum-wp21-after.json` | 30 | 452 ms p75 (n=30) | 0 (n=30) | n/a | no sample | n/a | n/a | WP-21 after build; no cart INP sample |
| 2026-10-18 | 352625e + WP-21 dirty | /shop/wallbox-home-7-4 | `npm run budget` (also final `npm run check`) | 2, identical | n/a | n/a | n/a | n/a | 127.953 KB (budget 128.0 KB) | n/a | WP-21 final source; all seven route budgets pass; approximately 48 B headroom |
| 2026-10-18 | 352625e (accepted baseline layout) | /shop/ladekabel-typ-1-10-m | `node scripts/lighthouse.mjs --config .lighthouseci-shop/wp21-tbt-config.cjs --public` | 5 | 2858.300 ms (rep; range 2622.145–2932.800 ms) | 0 | 145 ms (rep; range 118.5–226 ms) | n/a | n/a | n/a | Same-window WP-21 control; raw `.lighthouseci-shop/wp21-tbt-control-before/`; benchmarkIndex 1463.5–1716.5 |
| 2026-10-18 | 352625e + WP-21 dirty | /shop/ladekabel-typ-1-10-m | `node scripts/lighthouse.mjs --config .lighthouseci-shop/wp21-tbt-config.cjs --public` | 5 | 2856.512 ms (rep; range 2615.950–2856.512 ms) | 0 | 147.5 ms (rep; range 147.5–162.718 ms) | n/a | n/a | n/a | Same-window WP-21 control; raw `.lighthouseci-shop/wp21-tbt-control-after/`; benchmarkIndex 1568–1704 |
| 2026-10-18 | ac4c33e + WP-22, cache off | /shop/c/wallboxes | `LIGHTHOUSE_LEGACY_PORT=18087 npm run lighthouse:shop` | 5 | 3845.380 ms (manifest representative) | 0.16545 | 0 ms | n/a | n/a | n/a (separate TTFB run) | five-run LCP 3840.020–3847.910 ms; perf 0.79; a11y 1.00; raw reports `.lighthouseci-shop-wp22-before/` |
| 2026-10-18 | ac4c33e + WP-22, cache on | /shop/c/wallboxes | `LIGHTHOUSE_LEGACY_PORT=18087 npm run lighthouse:shop` | 5 | 3918.480 ms (manifest representative) | 0.16545 | 1 ms | n/a | n/a | n/a (separate TTFB run) | five-run LCP 3845.880–3930.780 ms; perf 0.78; a11y 1.00; raw reports `.lighthouseci-shop-wp22-after/` |
| 2026-10-18 | ac4c33e + WP-22, cache off | /shop/c/wallboxes?connector=ccs | `LIGHTHOUSE_LEGACY_PORT=18087 npm run lighthouse:shop` | 5 | 2558.290 ms (manifest representative) | 0.16551 | 16 ms | n/a | n/a | n/a (separate TTFB run) | five-run LCP 2557.812–2565.030 ms; perf 0.88; a11y 1.00; raw reports `.lighthouseci-shop-wp22-before/` |
| 2026-10-18 | ac4c33e + WP-22, cache on | /shop/c/wallboxes?connector=ccs | `LIGHTHOUSE_LEGACY_PORT=18087 npm run lighthouse:shop` | 5 | 2618.350 ms (manifest representative) | 0.16551 | 5 ms | n/a | n/a | n/a (separate TTFB run) | five-run LCP 2614.870–2716.272 ms; perf 0.88; a11y 1.00; raw reports `.lighthouseci-shop-wp22-after/` |
| 2026-10-18 | ac4c33e + WP-22, cache off | /shop/ladekabel-typ-1-10-m | `LIGHTHOUSE_LEGACY_PORT=18087 npm run lighthouse:shop` | 5 | 3467.330 ms (manifest representative) | 0.18352 | 20 ms | n/a | n/a | n/a (separate TTFB run) | five-run LCP 3464.540–3615.920 ms; perf 0.80; a11y 1.00; raw reports `.lighthouseci-shop-wp22-before/` |
| 2026-10-18 | ac4c33e + WP-22, cache on | /shop/ladekabel-typ-1-10-m | `LIGHTHOUSE_LEGACY_PORT=18087 npm run lighthouse:shop` | 5 | 3462.960 ms (manifest representative) | 0.18352 | 29 ms | n/a | n/a | n/a (separate TTFB run) | five-run LCP 3458.770–3542.270 ms; perf 0.81; a11y 1.00; raw reports `.lighthouseci-shop-wp22-after/` |
| 2026-10-18 | ac4c33e + WP-22, cache off | /shop/cart | `LIGHTHOUSE_LEGACY_PORT=18087 npm run lighthouse:shop` | 5 | 2283.670 ms (manifest representative) | 0 | 48.272 ms | n/a | n/a | n/a (separate TTFB run) | five-run LCP 2254.520–2301.370 ms; perf 0.96; a11y 1.00; raw reports `.lighthouseci-shop-wp22-before/` |
| 2026-10-18 | ac4c33e + WP-22, cache on | /shop/cart | `LIGHTHOUSE_LEGACY_PORT=18087 npm run lighthouse:shop` | 5 | 2283.420 ms (manifest representative) | 0 | 28.980 ms | n/a | n/a | n/a (separate TTFB run) | five-run LCP 2255.580–2291.810 ms; perf 0.96; a11y 1.00; raw reports `.lighthouseci-shop-wp22-after/` |
| 2026-10-18 | ac4c33e + WP-22, cache off | /shop (redirect) | PowerShell owned-process production launch; 5 direct `curl.exe -sS -o NUL -w "%{time_starttransfer}\n"` requests to localhost:3000 | cold 1 + warm 4 | n/a | n/a | n/a | n/a | n/a | 63.5 / 3.54 ms median | HTTP 301; warm samples 4.13, 4.09, 2.84, 2.99 ms; no HTTP warmup; no synthetic delay; all statuses and wrapper exit 0 |
| 2026-10-18 | ac4c33e + WP-22, cache on | /shop (redirect) | PowerShell owned-process production launch; 5 direct `curl.exe -sS -o NUL -w "%{time_starttransfer}\n"` requests to localhost:3000 | cold 1 + warm 4 | n/a | n/a | n/a | n/a | n/a | 63.3 / 1.46 ms median | HTTP 301; warm samples 1.65, 1.29, 1.33, 1.58 ms; no HTTP warmup; no synthetic delay; all statuses and wrapper exit 0 |
| 2026-10-18 | ac4c33e + WP-22, cache off | /shop/c/wallboxes | PowerShell owned-process production launch; 5 direct `curl.exe -sS -o NUL -w "%{time_starttransfer}\n"` requests to localhost:3000 | cold 1 + warm 4 | n/a | n/a | n/a | n/a | n/a | 173.1 / 13.57 ms median | HTTP 200; warm samples 13.03, 12.76, 15.19, 14.10 ms; no HTTP warmup; no synthetic delay; all statuses and wrapper exit 0 |
| 2026-10-18 | ac4c33e + WP-22, cache on | /shop/c/wallboxes | PowerShell owned-process production launch; 5 direct `curl.exe -sS -o NUL -w "%{time_starttransfer}\n"` requests to localhost:3000 | cold 1 + warm 4 | n/a | n/a | n/a | n/a | n/a | 168.3 / 1.51 ms median | HTTP 200; warm samples 2.21, 1.39, 1.48, 1.54 ms; no HTTP warmup; no synthetic delay; all statuses and wrapper exit 0 |
| 2026-10-18 | ac4c33e + WP-22, cache off | /shop/wallbox-home-7-4 | PowerShell owned-process production launch; 5 direct `curl.exe -sS -o NUL -w "%{time_starttransfer}\n"` requests to localhost:3000 | cold 1 + warm 4 | n/a | n/a | n/a | n/a | n/a | 187.9 / 20.31 ms median | HTTP 200; warm samples 23.12, 14.06, 20.20, 20.41 ms; no HTTP warmup; no synthetic delay; all statuses and wrapper exit 0 |
| 2026-10-18 | ac4c33e + WP-22, cache on | /shop/wallbox-home-7-4 | PowerShell owned-process production launch; 5 direct `curl.exe -sS -o NUL -w "%{time_starttransfer}\n"` requests to localhost:3000 | cold 1 + warm 4 | n/a | n/a | n/a | n/a | n/a | 150.8 / 1.71 ms median | HTTP 200; warm samples 2.25, 1.40, 1.38, 2.02 ms; no HTTP warmup; no synthetic delay; all statuses and wrapper exit 0 |
| 2026-10-17 | e34d009 | /portal/stations | `npm run lighthouse` | 3, median | 1957 ms | 0 | 39 ms | n/a (WP-19) | n/a (per-route tooling WP-13) | 20 ms (warm, local) | lab; portal baseline, WP-00 |
| 2026-10-17 | e34d009 | /portal/sessions | `npm run lighthouse` | 3, median | 1967 ms | 0 | 57 ms | n/a (WP-19) | n/a (per-route tooling WP-13) | 13 ms (warm, local) | lab; portal baseline, WP-00 |
| 2026-10-17 | e34d009 | /portal/invoices | `npm run lighthouse` | 3, median | 1956 ms | 0 | 34 ms | n/a (WP-19) | n/a (per-route tooling WP-13) | 12 ms (warm, local) | lab; portal baseline, WP-00 |
| 2026-10-17 | e34d009 | /portal/invoices/inv-0042/dispute | `npm run lighthouse` | 3, median | 2106 ms | 0 | 30 ms | n/a (WP-19) | n/a (per-route tooling WP-13) | 11 ms (warm, local) | lab; portal baseline, WP-00 |
| 2026-10-17 | 6bdc1fa + WP-13 | /portal/stations | `npm run budget` | 2, identical | n/a | n/a | n/a | n/a (WP-19) | 113.795 KB (budget 119.5 KB) | n/a | local first visit; WP-13 baseline, +5% hard budget |
| 2026-10-17 | 6bdc1fa + WP-13 | /portal/sessions | `npm run budget` | 2, identical | n/a | n/a | n/a | n/a (WP-19) | 113.795 KB (budget 119.5 KB) | n/a | local first visit; WP-13 baseline, +5% hard budget |
| 2026-10-17 | 6bdc1fa + WP-13 | /portal/invoices | `npm run budget` | 2, identical | n/a | n/a | n/a | n/a (WP-19) | 116.556 KB (budget 122.4 KB) | n/a | local first visit; WP-13 baseline, +5% hard budget |
| 2026-10-17 | 6bdc1fa + WP-13 | /portal/invoices/inv-0042/dispute | `npm run budget` | 2, identical | n/a | n/a | n/a | n/a (WP-19) | 116.556 KB (budget 122.4 KB) | n/a | local first visit; WP-13 baseline, +5% hard budget |
| 2026-10-17 | 6bdc1fa + WP-13 | /shop/c/wallboxes | `npm run budget` | 2, identical | n/a | n/a | n/a | n/a (WP-19) | 114.527 KB (budget 126.0 KB) | n/a | local first visit; WP-13 baseline, provisional +10% hard budget |
| 2026-10-17 | 6bdc1fa + WP-13 | /shop/wallbox-home-7-4 | `npm run budget` | 2, identical | n/a | n/a | n/a | n/a (WP-19) | 116.307 KB (budget 128.0 KB) | n/a | local first visit; WP-13 baseline, provisional +10% hard budget |
| 2026-10-17 | 6bdc1fa + WP-13 | /shop/cart | `npm run budget` | 2, identical | n/a | n/a | n/a | n/a (WP-19) | 111.800 KB (budget 123.0 KB) | n/a | local first visit; WP-13 baseline, provisional +10% hard budget |
| 2026-10-17 | 254ce7d + WP-15 dirty | /shop/c/wallboxes | `LIGHTHOUSE_LEGACY_PORT=18080 npm run lighthouse:shop` | 5, median | 3612 ms | 0.165449 | 85 ms | n/a (WP-19) | 114.527 KB (WP-13) | n/a (WP-22) | lab; WP-15 naive baseline; Speed Index 2180 ms; total byte weight 491,217 B (479.7 KiB) |
| 2026-10-17 | 254ce7d + WP-15 dirty | /shop/c/wallboxes?connector=ccs | `LIGHTHOUSE_LEGACY_PORT=18080 npm run lighthouse:shop` | 5, median | 2633 ms | 0.165509 | 24 ms | n/a (WP-19) | 114.527 KB (equivalent listing route, WP-13) | n/a (WP-22) | lab; WP-15 naive baseline; Speed Index 2027 ms; total byte weight 198,039 B (193.4 KiB) |
| 2026-10-17 | 254ce7d + WP-15 dirty | /shop/ladekabel-typ-1-10-m | `LIGHTHOUSE_LEGACY_PORT=18080 npm run lighthouse:shop` | 5, median | 3383 ms | 0.183524 | 127 ms | n/a (WP-19) | 116.307 KB (equivalent product route, WP-13) | n/a (WP-22) | lab; WP-15 naive baseline; Speed Index 2178 ms; total byte weight 416,160 B (406.4 KiB) |
| 2026-10-17 | 254ce7d + WP-15 dirty | /shop/cart | `LIGHTHOUSE_LEGACY_PORT=18080 npm run lighthouse:shop` | 5, median | 2102 ms | 0 | 53.5 ms | n/a (WP-19) | 111.800 KB (WP-13) | n/a (WP-22) | lab; WP-15 naive baseline; Speed Index 1952 ms; total byte weight 125,485 B (122.5 KiB) |
| 2026-10-17 | 254ce7d + WP-17 | /portal/stations | `npm run budget` | 1 | n/a | n/a | n/a | n/a (WP-19) | 118.927 KB (budget 119.5 KB) | n/a | web-vitals attribution build; +5.132 KB vs WP-13 baseline |
| 2026-10-17 | 254ce7d + WP-17 | /portal/sessions | `npm run budget` | 1 | n/a | n/a | n/a | n/a (WP-19) | 118.927 KB (budget 119.5 KB) | n/a | web-vitals attribution build; +5.132 KB vs WP-13 baseline |
| 2026-10-17 | 254ce7d + WP-17 | /portal/invoices | `npm run budget` | 1 | n/a | n/a | n/a | n/a (WP-19) | 121.688 KB (budget 122.4 KB) | n/a | web-vitals attribution build; +5.132 KB vs WP-13 baseline |
| 2026-10-17 | 254ce7d + WP-17 | /portal/invoices/inv-0042/dispute | `npm run budget` | 1 | n/a | n/a | n/a | n/a (WP-19) | 121.688 KB (budget 122.4 KB) | n/a | web-vitals attribution build; +5.132 KB vs WP-13 baseline |
| 2026-10-17 | 254ce7d + WP-17 | /shop/c/wallboxes | `npm run budget` | 1 | n/a | n/a | n/a | n/a (WP-19) | 119.656 KB (budget 126.0 KB) | n/a | web-vitals attribution build; +5.129 KB vs WP-13 baseline |
| 2026-10-17 | 254ce7d + WP-17 | /shop/wallbox-home-7-4 | `npm run budget` | 1 | n/a | n/a | n/a | n/a (WP-19) | 121.438 KB (budget 128.0 KB) | n/a | web-vitals attribution build; +5.131 KB vs WP-13 baseline |
| 2026-10-17 | 254ce7d + WP-17 | /shop/cart | `npm run budget` | 1 | n/a | n/a | n/a | n/a (WP-19) | 116.930 KB (budget 123.0 KB) | n/a | web-vitals attribution build; +5.130 KB vs WP-13 baseline |
| 2026-10-17 | a370cef + WP-19 dirty | /shop/c/:category | `RUM_LEGACY_PORT=18085 npm run rum:sample -- --runs 30` | 30 | 240 ms | 0.000 (n=30) | n/a | 16 ms (n=1) | n/a | n/a | synthetic RUM baseline 1/2; CPU 4; callback route; INP sample too small |
| 2026-10-17 | a370cef + WP-19 dirty | /shop/:slug | `RUM_LEGACY_PORT=18085 npm run rum:sample -- --runs 30` | 30 | 148 ms | 0.000 (n=30) | n/a | 24 ms (n=3) | n/a | n/a | synthetic RUM baseline 1/2; CPU 4; product is a document navigation |
| 2026-10-17 | a370cef + WP-19 dirty | /shop/cart | `RUM_LEGACY_PORT=18085 npm run rum:sample -- --runs 30` | 30 | 228 ms | 0.000 (n=30) | n/a | n/a (n=0) | n/a | n/a | synthetic RUM baseline 1/2; CPU 4; cart is a document navigation |
| 2026-10-17 | a370cef + WP-19 dirty | /shop/c/:category | `RUM_LEGACY_PORT=18085 npm run rum:sample -- --runs 30` | 30 | 232 ms | 0.000 (n=30) | n/a | 16 ms (n=1) | n/a | n/a | synthetic RUM baseline 2/2; LCP spread 8 ms; INP sample too small |
| 2026-10-17 | a370cef + WP-19 dirty | /shop/:slug | `RUM_LEGACY_PORT=18085 npm run rum:sample -- --runs 30` | 30 | 156 ms | 0.000 (n=30) | n/a | 24 ms (n=2) | n/a | n/a | synthetic RUM baseline 2/2; LCP spread 8 ms; INP sample too small |
| 2026-10-17 | a370cef + WP-19 dirty | /shop/cart | `RUM_LEGACY_PORT=18085 npm run rum:sample -- --runs 30` | 30 | 232 ms | 0.000 (n=30) | n/a | n/a (n=0) | n/a | n/a | synthetic RUM baseline 2/2; LCP spread 4 ms; no INP sample |
| 2026-10-18 | 352625e (WP-20 accepted source) | /shop/c/wallboxes | `ROUTE_BUDGET_LEGACY_PORT=18089 npm run budget` | 1 | n/a | n/a | n/a | n/a | 125.583 KB (budget 126 KB) | n/a | WP-23 before candidate; exit 0 |
| 2026-10-18 | 352625e (WP-20 accepted source) | /shop/wallbox-home-7-4 | `ROUTE_BUDGET_LEGACY_PORT=18089 npm run budget` | 1 | n/a | n/a | n/a | n/a | 127.947 KB (budget 128 KB) | n/a | WP-23 before candidate; exit 0 |
| 2026-10-18 | 352625e (WP-20 accepted source) | /shop/cart | `ROUTE_BUDGET_LEGACY_PORT=18089 npm run budget` | 1 | n/a | n/a | n/a | n/a | 121.579 KB (budget 123 KB) | n/a | WP-23 before candidate; exit 0 |
| 2026-10-18 | 352625e + WP-23 candidate | /shop/c/wallboxes | `ROUTE_BUDGET_LEGACY_PORT=18089 npm run budget` | 1 | n/a | n/a | not measured | not measured | 126.574 KB (budget 126 KB) | n/a | candidate rejected; command exit 1; no Lighthouse/RUM |
| 2026-10-18 | 352625e + WP-23 candidate | /shop/wallbox-home-7-4 | `ROUTE_BUDGET_LEGACY_PORT=18089 npm run budget` | 1 | n/a | n/a | not measured | not measured | 129.842 KB (budget 128 KB) | n/a | candidate rejected; command exit 1; no Lighthouse/RUM |
| 2026-10-18 | 352625e + WP-23 candidate | /shop/cart | `ROUTE_BUDGET_LEGACY_PORT=18089 npm run budget` | 1 | n/a | n/a | not measured | not measured | 122.448 KB (budget 123 KB) | n/a | within cap; candidate still rejected on listing/product failures |
| 2026-10-18 | 352625e + WP-23 reverted | /shop/c/wallboxes | `E2E_LEGACY_PORT=18089 ROUTE_BUDGET_LEGACY_PORT=18089 npm run check` | 1 | n/a | n/a | n/a | n/a | 125.583 KB (budget 126 KB) | n/a | final retained eager source; check exit 0; route budget passed |
| 2026-10-18 | 352625e + WP-23 reverted | /shop/wallbox-home-7-4 | `E2E_LEGACY_PORT=18089 ROUTE_BUDGET_LEGACY_PORT=18089 npm run check` | 1 | n/a | n/a | n/a | n/a | 127.947 KB (budget 128 KB) | n/a | final retained eager source; check exit 0; route budget passed |
| 2026-10-18 | 352625e + WP-23 reverted | /shop/cart | `E2E_LEGACY_PORT=18089 ROUTE_BUDGET_LEGACY_PORT=18089 npm run check` | 1 | n/a | n/a | n/a | n/a | 121.579 KB (budget 123 KB) | n/a | final retained eager source; check exit 0; route budget passed |

Notes: medians from `.lighthouseci/` (portal) and `.lighthouseci-shop/` (shop) reports of the 2026-10-17 runs; TTFB is the `server-response-time` audit on the local warm server (no cold/warm split yet); all numbers lab (mobile emulation, simulated throttling).

## Open questions
- WP-04: `legacy-php/` remains intentionally unchanged; it is the never-executed twin called
  out by the package and does not expose the new Store API routes.

## WP-23 — Lazy hydration (Review; 2026-10-18)
- Worktree: `codex/wp23-lazy-hydration` at `352625e`. Installed Nuxt is `4.6.1`; delayed
  hydration is supported since Nuxt `3.16` via lazy components and `hydrate-on-visible`.
- Baseline route-budget check passed before implementation (`ROUTE_BUDGET_LEGACY_PORT=18089
  npm run budget`): listing **125.583/126 KB**, product **127.947/128 KB**, cart
  **121.579/123 KB**. Budgets are already tight and remain unchanged pending after evidence;
  do not increase them.
- Candidate tests first: a focused shop E2E failed at the expected post-scroll hydration
  marker (14 polls / 5s; SSR link markup, initial visibility, and href checks passed). The
  candidate was a related-grid extraction using `hydrate-on-visible`; product/list data stayed
  on the eager page. Installed Vue/Nuxt source loads the async component before observing
  visibility, so transfer savings were uncertain.
- Candidate build succeeded, but `ROUTE_BUDGET_LEGACY_PORT=18089 npm run budget` exited **1**:
  listing **126.574/126 KB** (+0.991 KB over baseline), product **129.842/128 KB** (+1.895 KB),
  cart **122.448/123 KB** (within budget); all four portal routes passed. The hard listing and
  product caps disqualified the candidate. The extraction, story, hydration marker, and
  hydration-only test assertions were reverted. Candidate TBT/INP were **not measured**;
  Lighthouse and RUM were skipped because the JS regression already failed hard budgets.
- Retained tests cover related-product SSR markup/native href/no browser data refetch and
  English heading, currency and stock-label updates using the existing eager rendering. The
  browser request listener observed no client product/listing API requests; this does not
  establish the exact number of server-side fetches.
- Route-budget values and provisional flags remain unchanged because no optimization was
  retained. An initial shop + Storybook run exited 1 (73/74) because the locale test's price
  locator did not select the nested card. After targeting the list item by product name, the
  isolated locale test passed 1/1 and `E2E_LEGACY_PORT=18089 npx playwright test --project=shop
  --project=storybook` passed **74/74**. `E2E_LEGACY_PORT=18089 ROUTE_BUDGET_LEGACY_PORT=18089
  npm run check` passed (exit 0): lint, typecheck, tokens, migration inventory, coverage
  **289/289** (95.78% statements), Playwright **146/146**, build, and all route budgets,
  including final listing **125.583/126 KB**, product **127.947/128 KB**, cart **121.579/123 KB**.
  Budgets remain provisional because no performance optimization was retained. No dependencies
  or lockfiles changed; no push.
- Integration: local source commit `fa5420d` was integrated and pushed as `8c2bc38`.
  [GitHub Actions run 39081123755](https://github.com/GerritHoskins/charge-portal/actions/runs/39081123755)
  passed on the combined WP-21/WP-23 state. Human acceptance of WP-23 remains pending.
