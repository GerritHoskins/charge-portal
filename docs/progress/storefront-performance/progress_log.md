# Storefront Performance Progress

## Status
Current step: WP-25 Blocked on the hard LCP gate; WP-25c Done, further optimization not authorized
Completed steps: WP-00, WP-01, WP-02, WP-03, WP-04, WP-05, WP-06, WP-07, WP-08, WP-09, WP-10, WP-11, WP-12, WP-13, WP-14, WP-15, WP-16, WP-17, WP-18, WP-19, WP-20, WP-21, WP-22, WP-23, WP-24, WP-25a, WP-25b, WP-25c, WP-26
Next step: Keep the accepted diagnosis only, as requested; do not start WP-25d. WP-25 CI wiring and WP-27 remain pending the unresolved hard gate and any future explicitly authorized scope

## Decisions
- 2026-10-18: Human accepted WP-25c at pushed `5d3d024` and selected "Keep diagnosis only for now" for proposed WP-25d. Mark WP-25c Done; do not create/start WP-25d or implement compression/telemetry changes. The original hard LCP gate, WP-25 CI wiring and WP-27 remain incomplete. This is acceptance of the diagnosis, not acceptance of the proposed optimization or a gate waiver.
- 2026-10-18: WP-25c checkpoint `5d3d024` GitHub Actions run `39131215753` completed successfully (full check and portal Lighthouse), reverified after human acceptance. The shop hard gate remains unwired and unresolved.
- 2026-10-18: WP-25c captured ten unchanged-runtime traces/network logs and independently replayed all ten simulated LCP values exactly offline. Terminal modeled nodes are early telemetry pings, after the navigation document/main entry bundle; this is not proof the pings block observed pixels. Significant HTML compression opportunity is also confirmed. No product change or model/gate override was made. Proposed next aggregate experiment is public-shop HTML-only gzip plus safe initial telemetry transport deferral; neither is authorized yet and their estimated savings are not an additive pass guarantee.
- 2026-10-18: Accepted WP-25b checkpoint `304c87b` GitHub Actions run `39129539025` completed successfully (full check and portal Lighthouse). The shop hard gate is still deliberately unwired and unresolved; this CI success is not evidence of its passing.
- 2026-10-18: Human accepted WP-25b at pushed `304c87b` as measured-and-reverted and permitted the next bounded LCP investigation. WP-25c is diagnostic only: saved report/source inspection and at most ten controlled current-runtime trace/network captures (five unfiltered listing, five product), temporary capture instrumentation removed before handoff. No product/config/test/dependency/gate/CI changes or reintroduced candidates. A subsequent optimization needs its own scope decision.
- 2026-10-18: WP-25b completed all 20 unchanged hard Lighthouse audits and exited 1 on three LCP selections (3010.556/2709.352/2781.176 ms); cart passed at 2405.685 ms. Primary independently parsed 20 JSON reports and the 41-file backup `.lighthouseci-shop-wp25b-final/`. Locale transfer grew 4317 to 9095 B and total transfer grew 812 B on every representative despite smaller JS. Per approval the failed candidate was fully reverted. Retained full check and production cart regression passed; no new optimization, threshold change or CI wiring. Await human acceptance.
- 2026-10-18: Accepted WP-25a checkpoint `2f0c200` GitHub Actions run `39126688049` completed successfully (full check and portal Lighthouse). This does not include the still-unwired shop hard gate.
- 2026-10-18: Human accepted WP-25a at pushed `2f0c200` as measured-and-reverted and separately approved WP-25b: installed production-mode JSON/JIT generator, compact ASTs, versioned internal message URLs to avoid old raw-response cache reuse, same config/verifier/existing auth-product-cart tests/package-index-progress scope. No dependency, contract or threshold changes; production correctness and all hard gates must be measured and failed optimization reverted. This supersedes WP-25a's pending review/new-attempt questions, not WP-25's unresolved LCP gate.
- 2026-10-18: WP-25a final candidate passed correctness checks and reduced initial JS, but `lighthouse:shop` exited 1 after all 20 audits: all four median-run LCP selections failed (3167.556/3009.684/3082.353/2856.573 ms). Per explicit approval, configuration and experimental verifier were reverted; only valid locale E2E regressions remain. Primary review verified 20 reports/41 files in `.lighthouseci-shop-wp25a-final/`. Actual DE locale transfer grew from 4317 B to 56003 B and total route transfer grew 47662 B on every representative; smaller JS did not establish a faster page. No thresholds were relaxed and no further optimization was implemented.
- 2026-10-18: Human explicitly approved one final WP-25a integration attempt after the two registration failures: use Nitro's supported final Rollup hook to replace only its generic JSON plugin with the already installed equivalent excluding exactly `de.json`/`en.json`. Same approved config/verifier/tests/docs; no dependency/threshold changes. Record build-plugin-name/API and transitive dependency coupling; revert if production checks or measurements fail. No further variant is authorized by this decision.
- 2026-10-18: WP-25a registration corrections failed with actual exits 1: the exposed i18n `.rollup()` adapter rejects frameworks other than Vite/Webpack; the `.vite()` adapter precompiles JSON but Nitro's later generic JSON parser then rejects the generated `const resource...` JavaScript. Both were stopped, configuration/checker removed, and retained-source verification started before requesting the separate final-attempt decision.
- 2026-10-18: WP-25a first candidate (three i18n options only) built but production `/login` returned 500 (`unhandled node type: 0`) and locale delivery remained raw strings. Installed `@nuxtjs/i18n/dist/module.d.mts` documents that disabling `optimizeMessageBundling` requires a custom Nitro Rollup locale transform; its implementation registers the precompiler for Nuxt app builds, not Nitro. Bound the correction to an exact-DE/EN registration of the installed precompiler in the already approved `nuxt.config.ts`; no new dependencies or runtime routes. Do not measure a broken candidate as a performance improvement.
- 2026-10-18: WP-25 checkpoint `abad194` GitHub Actions run `39123220900` completed successfully (full check and portal Lighthouse). The shop Lighthouse hard gate is not wired into that workflow yet and its separately measured LCP failures remain unresolved.
- 2026-10-18: Human approved bounded WP-25a: `nuxt.config.ts` i18n precompilation/client compiler removal, production regressions in existing auth/shop-product/shop-cart tests, a build-artifact verification script, and package/index/progress documentation. Preserve all thresholds, dependencies, SSR, locale switching, SEO and cart behavior; revert ineffective or broken changes. WP-25 checkpoint `abad194` is committed/pushed; no new optimization was made before this approval.
- 2026-10-18: Human approved WP-25 extending to `app/components/shop/ShopProductCard.vue`, `shared/seo.ts`, `tests/unit/seo.test.ts`, `tests/e2e/shop-listing.spec.ts`, and `tests/e2e/shop-product.spec.ts`. Narrow only consumer input types, add payload-omission regressions, and preserve rendering, SEO, cart behavior, full API contracts, and unchanged budgets. Resume from `83c3f76`; the existing before measurement has identical runtime source.
- 2026-10-18: WP-25 payload projection and regressions are implemented. Production payload tests (including external `data-src`, 404, and stable-ID routes) passed 5/5. Before → after bytes (HTML raw / locally computed gzip; inline bootstrap; external payload raw / locally computed gzip): listing 23,530/4,469; 405; 3,568/1,152 → 23,530/4,461; 405; 2,736/943. Product `/shop/ladekabel-typ-1-10-m`: 20,100/4,223; 431; 7,322/2,301 → 20,130/4,218; 461; 2,038/852. HTML and payload bodies were uncompressed (identity); gzip values are computed, not wire-compressed measurements.
- 2026-10-18: Final `npm run check` exited 0: 289/289 unit tests, 190/190 E2E, production build, and all route budgets passed (listing/product/cart 125.136/127.640/121.080 KB gzip). `npm run lighthouse:shop` built fresh and completed 20 runs, then exited 1 on the unchanged hard LCP limit of 2500 ms. LHCI median-run representatives: `/shop/c/wallboxes` 2785.992 ms, `/shop/c/wallboxes?connector=ccs` 2559.544 ms, and `/shop/ladekabel-typ-1-10-m` 2939.4175 ms. Reports are retained in `.lighthouseci-shop/` and separately backed up in `.lighthouseci-shop-wp25-after/`. Stop per WP-25 step 4; do not loosen thresholds, improvise another optimization, or wire the failing gate into CI. CI step 5 remains unstarted pending a follow-on optimization WP decision.
- 2026-10-18: Human accepted WP-24 at pushed commit `85f7c73` as a measured-and-reverted experiment. CI run `39117912233` passed, including the full check and portal Lighthouse. WP-25 may start. The optional out-of-scope sampler-counter correction was not approved by this acceptance and remains unchanged.
- 2026-10-18: Human accepted WP-22 at pushed commit `60fd260`. GitHub Actions run `39114992632` subsequently completed successfully. Resume WP-24 from this accepted cache-enabled, smaller-bundle base; preserve the earlier isolated draft and take fresh before measurements.
- 2026-10-18: Human approved extending WP-22 to `tests/e2e/auth.spec.ts` for portable browser-login URL canonicalization. Preserve exact origin/path/query value and reject extra parameters/hash; the strict server 302 and encoded Location-header assertion remains unchanged. Production and pre-cache controls both normalize browser query slashes and successfully return to the requested page after login.
- 2026-10-18: Human approved extending WP-22 to the two shop pages, `ShopProductCard.vue`, and their regression tests for a measured bundle-size fix. Preserve image behavior, caching, hydration, accessibility, and unchanged JS caps. WP-24 remains independent in its own worktree; overlapping edits are integrated by the primary agent and all runtime/build/measurement gates remain serialized.
- 2026-10-18: Human accepted WP-23 at pushed commit `8c2bc38` as a measured-and-reverted experiment, with no candidate TBT/INP gain claimed. WP-24 may start independently from that accepted cache-off baseline; the unaccepted WP-22 integration is excluded so its known JS-budget blocker does not contaminate the WP-24 experiment. This acceptance does not authorize the separately requested WP-22 source-scope expansion.
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
- Combined integration at local commit `b772786` includes accepted WP-20/WP-21 and the retained WP-23 tests. `E2E_LEGACY_PORT=18090 ROUTE_BUDGET_LEGACY_PORT=18090 npm run budget` built successfully but exited **1**: listing **126.289/126 KB** and product `/shop/wallbox-home-7-4` **128.654/128 KB** fail; cart **122.287/123 KB**, stations/sessions **118.798/119.5 KB**, and invoices/dispute **121.575/122.4 KB** pass. The isolated WP-22 gate above is not proof that the combined feature passes. No budgets were changed and this integration has not been pushed.
- Read-only integration diagnosis: the common emitted runtime is 53,125 B gzipped versus 52,407 B in the accepted WP-21 build (+718 B). Installed Nuxt's generated client configuration enables payload extraction when any cached route exists (`nuxt/dist/index.mjs`), retaining its payload-loading machinery. `experimental.prefetchPreloadTags` already defaults to false, so disabling it cannot recover this increase. The server renderer separately enables runtime extraction for cached routes (`@nuxt/nitro-server/dist/index.mjs`, `nuxt/dist/runtime/server/renderer/index.js`); changing the global client extraction setting alone is not a proven hydration-safe fix. Targeted dependency-source and page reads were for this failed integration diagnosis, not authorization to change out-of-scope files. Full combined verification remains outstanding.
- A read-only GPT-6 Luna high second opinion confirmed the cache/payload coupling and found no supported per-route extraction-off setting in the installed schema/runtime. No speculative payload toggle was applied. On 2026-10-18, the human approved extending WP-22 to the listing/product pages, `ShopProductCard.vue`, and their existing tests for a measured client-byte fix; existing image, hydration, cache, accessibility, and unchanged JS-cap contracts remain mandatory.
- Candidate provenance: a temporary `shopImageAttributes` dedup in the already-loaded card SFC reduced product route JS only 0.109 KB and did not clear the budgets (listing 126.310/126 KB, product 128.545/128 KB, cart 122.291/123 KB); it was reverted. That diagnostic command accidentally omitted the assigned legacy-port variables and launched the budget harness stand-in on 8080; it was interrupted (exit 1), only the three shop route values above were emitted, and a subsequent listener check confirmed 3000, 8080, 18090, and 3001 free. Do not treat it as a valid gate.
- Retained candidate: use the installed Vite Terser minifier on the client only via `vite.$client.build` (`minify: 'terser'`, `terserOptions.compress.passes: 2`, `maxWorkers: 2`). Installed Nuxt's Vite builder applies `$client` only in `buildClient()` and merges `$server` separately for SSR; Vite 8.3.4 types support Terser, and Terser 5.51.2 is already transitively present. This is conservative build compression, not a runtime/payload toggle; no dependency or lockfile change was made.
- Corrected fresh `$env:ROUTE_BUDGET_LEGACY_PORT='18090'; $env:E2E_LEGACY_PORT='18090'; npm run budget` exited 0: listing **125.074/126 KB**, product **127.448/128 KB**, cart **121.078/123 KB**, stations/sessions **117.624/119.5 KB**, and invoices/dispute **120.393/122.4 KB**. The installed build reported **134.1 KB** aggregate client gzip. This is a budget pass only; full `npm run check` and production cache/image/hydration plus portal/auth functional regression remain required before Review. The budget harness stopped its servers; listener check confirmed 3000, 18090, 8080, and 3001 free. No commit or push.
- The subsequent combined `E2E_LEGACY_PORT=18090 ROUTE_BUDGET_LEGACY_PORT=18090 npm run check` exited **0**: 289 unit tests with unchanged coverage, browser suite, build, and all seven budgets. Fresh source after restoring the card declaration order measured listing **125.072/126 KB**, product **127.445/128 KB**, cart **121.077/123 KB**, stations/sessions **117.623/119.5 KB**, invoices/dispute **120.392/122.4 KB**. Repeated dev `NUXT_E7002` warnings for `/shop/_payload.json` prompted further investigation before Review.
- An owned production probe reproduced a needless redirect-payload fetch: `/shop/_payload.json` returns a 301 to category HTML. The product browser prefetched that URL and category payload; the production build emitted no console warning. The preserved pre-cache WP-21 production artifact on isolated port 3002 also redirects both `/shop` and `/shop/` directly to the category, unlike Vite dev's intermediate slash hop. This control distinguishes an existing environment difference from a WP-22 regression. Only the owned control process was stopped after probing.
- Tests first for the redirect exclusion: two production regressions exited **1** as intended, observing root `s-maxage=60` and two `/shop/_payload.json` requests. Error contexts are preserved under `.lighthouseci-shop/wp22-integration-runtime/redirect-red/`. The exact root cache rule is now `cache:false`, overriding the zero-segment `/shop/**` match; category/product SWR remains 60/300 seconds. This excludes the redirect from Nitro caching and Nuxt's cache-derived payload matcher without suppressing diagnostics or changing global extraction. The listing redirect test uses the independently detected Vite marker to retain strict environment-specific 301/location assertions; both environments must still land on the category. Focused dev checks passed **3/3** (exit 0). A fresh full gate and production functional checks remain required for this final source.
- After the redirect exclusion, full `E2E_LEGACY_PORT=18090 ROUTE_BUDGET_LEGACY_PORT=18090 npm run check` exited **0**: **289/289 unit**, **186/186 browser tests**, build, and all seven budgets. Listing/product/cart were **125.070/127.443/121.075 KB**, stations/sessions **117.621 KB**, invoices/dispute **120.390 KB**. A later auth-test-only portability change requires another full gate before Review.
- Supplementary production `npx playwright test --project=app --project=auth --project=shop` initially exited **1**, **128 passed / 1 failed**: a browser URL comparison expected encoded query slashes while production hydration displayed decoded slashes. A separate real-browser probe on both the current production build and preserved pre-cache WP-21 control exited **0**, checking exact server 302/encoded Location, exact parsed browser origin/path/single `next` parameter/no hash, and successful login return to the requested sessions heading. The baseline has the same encoding behavior. The error context is preserved under `wp22-integration-runtime/production-failure/`. Following explicit human scope approval, only the browser comparison now canonicalizes query encoding; the strict server header assertion is untouched. Production and full-suite validation of that test change remain outstanding.
- Final-runtime telemetry compatibility: `RUM_LEGACY_PORT=18090 node scripts/rum-sample.mjs --runs 3 --json .lighthouseci-shop-wp22-final/rum-compatibility.json` exited **0** with harness-owned servers. All three funnels completed, 21 vitals and 9 events were accepted, zero failed/rate-limited requests, and category/product/cart each had 3 LCP and CLS samples. This is a compatibility smoke check, not a new performance benchmark; INP coverage was sparse (one category sample, none on product/cart).
- Final-runtime `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` exited **0**, **20/20 audits** (five per route), no synthetic catalogue delay. All 20 accessibility scores were **1.00** and CLS **0**. Representative LCP/TBT/performance score: listing **2784.056 ms / 20 ms / 0.93**; filtered listing **2560.492 ms / 25 ms / 0.95**; product **2784.742 ms / 0 ms / 0.93**; cart **2284.214 ms / 8.183 ms / 0.96**. LCP remains above the later 2500 ms error threshold on the first three routes; these are current warn-level assertions, not a WP-25 hard-gate pass. Five-run LCP ranges: **2783.016–2788.216**, **2555.180–2560.492**, **2782.274–2935.542**, **2253.450–2286.739 ms**, respectively. Benchmark indices span **2032–3016.5**, substantially faster than the earlier WP-21 environment; no cross-run TBT gain or browser-speed gain from caching/minification is established. Original reports/manifest remain in `.lighthouseci-shop/`; all 20 JSON and 20 HTML reports plus manifest are mirrored in `.lighthouseci-shop-wp22-final/lighthouse/`. Redirect TTFB rows above describe the earlier cached-redirect experiment, not the final uncached root rule.
- A separate GPT-6 Luna high read-only review found no actionable correctness/security regression in the package diff. It ran no runtime checks and does not replace human acceptance. Terser availability was verified in the unchanged lockfile: Nitro requires `@rollup/plugin-terser`, which requires Terser; the locked installed version is 5.51.2. No dependency installation, lockfile change, global payload setting, browser-target change, or budget increase was used.
- Final source including the approved auth assertion: `E2E_LEGACY_PORT=18090 ROUTE_BUDGET_LEGACY_PORT=18090 npm run check` exited **0**, with **289/289 unit tests**, **186/186 browser tests**, unchanged coverage floors, and all seven budgets: stations/sessions **117.621/119.5 KB**, invoices/dispute **120.390/122.4 KB**, listing **125.070/126 KB**, product **127.443/128 KB**, cart **121.075/123 KB**. A separately launched fresh production stack then passed `E2E_LEGACY_PORT=18090 npx playwright test --project=app --project=auth --project=shop`: **129/129**, exit **0**, 31.3 seconds. This supersedes the documented 128/129 portability failure without removing its evidence.
- Owned production processes were stopped after verification; assigned app/legacy/control ports were checked free. `git diff --check` passed. The primary checkout's existing `package.json` and `.claude/` changes remain untouched; raw measurement artifacts stay local and uncommitted. WP-22 moves to **Review**, not Done. Human acceptance is required before WP-24 rebases onto this smaller, cache-enabled runtime and repeats its before measurement. Source pages/card remain unchanged from the accepted base; the additional approved image-source scope was not needed after reverting the experiment.

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

| 2026-10-18 | 93aff8d + WP-22 client minifier | /shop/c/wallboxes | `E2E_LEGACY_PORT=18090 ROUTE_BUDGET_LEGACY_PORT=18090 npm run check` | 1 | n/a | n/a | n/a | n/a | 125.072 KB (budget 126 KB) | n/a | Combined full check exit 0; before redirect-cache exclusion |
| 2026-10-18 | 93aff8d + WP-22 client minifier | /shop/wallbox-home-7-4 | `E2E_LEGACY_PORT=18090 ROUTE_BUDGET_LEGACY_PORT=18090 npm run check` | 1 | n/a | n/a | n/a | n/a | 127.445 KB (budget 128 KB) | n/a | Combined full check exit 0; before redirect-cache exclusion |
| 2026-10-18 | 93aff8d + WP-22 client minifier | /shop/cart | `E2E_LEGACY_PORT=18090 ROUTE_BUDGET_LEGACY_PORT=18090 npm run check` | 1 | n/a | n/a | n/a | n/a | 121.077 KB (budget 123 KB) | n/a | Combined full check exit 0; before redirect-cache exclusion |
| 2026-10-18 | 8c2bc38 + WP-24 before | /shop/c/:category | `RUM_LEGACY_PORT=18091 node scripts/rum-sample.mjs --runs 30 --json .lighthouseci-shop/rum-wp24-before-clean.json` | 30 | 228 ms p75 (n=30) | 0 (n=30) | n/a | 16 ms p75 (n=27) | n/a | n/a | Cache-off synthetic RUM; filter target not established; 30/30/30 funnel; exit 0 |
| 2026-10-18 | 8c2bc38 + WP-24 candidate | /shop/c/wallboxes | `ROUTE_BUDGET_LEGACY_PORT=18091 npm run budget` | 1 | n/a | n/a | n/a | n/a | 125.712 KB (budget 126 KB) | n/a | Simplified draft; exit 1 on product cap; no candidate RUM |
| 2026-10-18 | 8c2bc38 + WP-24 candidate | /shop/wallbox-home-7-4 | `ROUTE_BUDGET_LEGACY_PORT=18091 npm run budget` | 1 | n/a | n/a | n/a | n/a | 128.078 KB (budget 128 KB) | n/a | Simplified draft; unchanged product cap failed; no candidate RUM |
| 2026-10-18 | 8c2bc38 + WP-24 candidate | /shop/cart | `ROUTE_BUDGET_LEGACY_PORT=18091 npm run budget` | 1 | n/a | n/a | n/a | n/a | 121.599 KB (budget 123 KB) | n/a | Simplified draft; exit 1 on product cap; no candidate RUM |
| 2026-10-18 | 60fd260 (accepted WP-22) | /shop/c/:category | `RUM_LEGACY_PORT=18090 node scripts/rum-sample.mjs --runs 30 --json .lighthouseci-shop/rum-wp24-before-accepted22.json` | 30 | 204 ms p75 (n=30) | 0 (n=30) | n/a | 8 ms p75 (n=1) | 125.070 KB | n/a | Synthetic RUM before; category INP sparse and not filter-attributed; 30/30/30 funnel; exit 0 |
| 2026-10-18 | 60fd260 + WP-24-a dirty candidate | /shop/c/:category | `RUM_LEGACY_PORT=18090 node scripts/rum-sample.mjs --runs 30 --json .lighthouseci-shop/rum-wp24-after-a.json` | 30 | 212 ms p75 (n=30) | 0 (n=30) | n/a | 16 ms p75 (n=1) | 125.202 KB | n/a | Synthetic RUM; sparse/unattributed; no INP gain established; candidate reverted; process exit not captured |
| 2026-10-18 | 60fd260 + WP-24-b dirty candidate | /shop/c/:category | `RUM_LEGACY_PORT=18090 node scripts/rum-sample.mjs --runs 30 --json .lighthouseci-shop/rum-wp24-after-b.json` | 30 | 220 ms p75 (n=30) | 0 (n=30) | n/a | 16 ms p75 (n=1) | 125.139 KB | n/a | Synthetic RUM; sparse/unattributed; no INP gain established; candidate reverted; exit 0 |

| 2026-10-18 | 93aff8d + WP-22 final runtime | /shop/c/wallboxes | `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` | 5, representative | 2784.056 ms | 0 | 20 ms | n/a | n/a | n/a | a11y 1.00 all five; perf 0.93; LCP range 2783.016–2788.216 ms; Speed Index 2180.660 ms; transfer 204491 B; LCP warning |
| 2026-10-18 | 93aff8d + WP-22 final runtime | /shop/c/wallboxes?connector=ccs | `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` | 5, representative | 2560.492 ms | 0 | 25 ms | n/a | n/a | n/a | a11y 1.00 all five; perf 0.95; LCP range 2555.180–2560.492 ms; Speed Index 2031.558 ms; transfer 162665 B; LCP warning |
| 2026-10-18 | 93aff8d + WP-22 final runtime | /shop/ladekabel-typ-1-10-m | `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` | 5, representative | 2784.742 ms | 0 | 0 ms | n/a | n/a | n/a | a11y 1.00 all five; perf 0.93; LCP range 2782.274–2935.542 ms; Speed Index 2181.089 ms; transfer 206929 B; LCP warning |
| 2026-10-18 | 93aff8d + WP-22 final runtime | /shop/cart | `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` | 5, representative | 2284.214 ms | 0 | 8.183 ms | n/a | n/a | n/a | a11y 1.00 all five; perf 0.96; LCP range 2253.450–2286.739 ms; Speed Index 2029.087 ms; transfer 137173 B |

| 2026-10-18 | 85f7c73 (WP-25 before, unchanged runtime) | /shop/c/wallboxes | `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` | 5, representative | 2785.472 ms | 0 | 17 ms | n/a | n/a | n/a | Warn-level baseline only; perf 0.93; a11y 1.00; transfer 204491 B; process exit not captured |
| 2026-10-18 | 85f7c73 (WP-25 before, unchanged runtime) | /shop/c/wallboxes?connector=ccs | `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` | 5, representative | 2558.704 ms | 0 | 0 ms | n/a | n/a | n/a | Warn-level baseline only; perf 0.95; a11y 1.00; transfer 162665 B; process exit not captured |
| 2026-10-18 | 85f7c73 (WP-25 before, unchanged runtime) | /shop/ladekabel-typ-1-10-m | `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` | 5, representative | 2786.302 ms | 0 | 0 ms | n/a | n/a | n/a | Warn-level baseline only; perf 0.93; a11y 1.00; transfer 206929 B; process exit not captured |
| 2026-10-18 | 85f7c73 (WP-25 before, unchanged runtime) | /shop/cart | `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` | 5, representative | 2285.354 ms | 0 | 17.993 ms | n/a | n/a | n/a | Warn-level baseline only; perf 0.96; a11y 1.00; transfer 137173 B; process exit not captured |
| 2026-10-18 | 85f7c73 (WP-25 payload before) | /shop/c/wallboxes | Owned production Node fetch/body-byte/gzip capture | 1 | n/a | n/a | n/a | n/a | n/a | n/a | Capture exit 0; HTML 23530 B, inline bootstrap 405 B, external payload 3568 B; local gzip HTML/payload 4469/1152 B; identity HTTP responses |
| 2026-10-18 | 85f7c73 (WP-25 payload before) | /shop/ladekabel-typ-1-10-m | Owned production Node fetch/body-byte/gzip capture | 1 | n/a | n/a | n/a | n/a | n/a | n/a | Capture exit 0; HTML 20100 B, inline bootstrap 431 B, external payload 7322 B; local gzip HTML/payload 4223/2301 B; identity HTTP responses |

| 2026-10-18 | 83c3f76 + WP-25 dirty | /shop/c/wallboxes | `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` | 5, representative | 2785.992 ms | 0 | 0 ms | n/a | 125.136 KB | n/a | Hard gate exit 1; LCP fails; range 2782.595–2935.125 ms; perf 0.93; a11y 1.00; transfer 203669 B |
| 2026-10-18 | 83c3f76 + WP-25 dirty | /shop/c/wallboxes?connector=ccs | `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` | 5, representative | 2559.544 ms | 0 | 0 ms | n/a | n/a | n/a | Hard gate exit 1; LCP fails; range 2555.652–2707.510 ms; perf 0.95; a11y 1.00; transfer 162531 B |
| 2026-10-18 | 83c3f76 + WP-25 dirty | /shop/ladekabel-typ-1-10-m | `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` | 5, representative | 2939.418 ms | 0 | 0 ms | n/a | n/a | n/a | Hard gate exit 1; LCP fails; range 2783.140–2939.418 ms; perf 0.92; a11y 1.00; transfer 201055 B |
| 2026-10-18 | 83c3f76 + WP-25 dirty | /shop/cart | `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` | 5, representative | 2283.778 ms | 0 | 35.089 ms | n/a | 121.080 KB | n/a | Cart assertions pass; whole command exit 1; range 2254.659–2290.838 ms; perf 0.96; a11y 1.00; transfer 137110 B |
| 2026-10-18 | 83c3f76 + WP-25 dirty | /shop/c/wallboxes | Owned production Node fetch/body-byte/gzip capture | 1 | n/a | n/a | n/a | n/a | n/a | n/a | WP-25 payload after; HTML 23530 B, bootstrap 405 B, external 2736 B; local gzip HTML/payload 4461/943 B; identity bodies; 5/5 production regressions passed |
| 2026-10-18 | 83c3f76 + WP-25 dirty | /shop/ladekabel-typ-1-10-m | Owned production Node fetch/body-byte/gzip capture | 1 | n/a | n/a | n/a | n/a | n/a | n/a | WP-25 payload after; HTML 20130 B, bootstrap 461 B, external 2038 B; local gzip HTML/payload 4218/852 B; identity bodies; no LCP improvement claimed |

| Date | Commit | Route | Command | Runs | LCP | CLS | TBT | INP p75 (RUM) | Initial JS (gz) | TTFB cold/warm | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-18 | abad194 + WP-25a candidate dirty (REVERTED) | /shop/c/wallboxes | `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` | 5, representative | 3167.556 ms | 0 | 18 ms | n/a | 120.487 KB | n/a | Exit 1; LCP fails; range 3162.621–3173.481 ms; perf 0.91; a11y 1.00; transfer 251331 B; candidate reverted |
| 2026-10-18 | abad194 + WP-25a candidate dirty (REVERTED) | /shop/c/wallboxes?connector=ccs | `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` | 5, representative | 3009.684 ms | 0 | 50 ms | n/a | n/a | n/a | Exit 1; LCP fails; range 2900.600–3160.356 ms; perf 0.93; a11y 1.00; transfer 210193 B; candidate reverted |
| 2026-10-18 | abad194 + WP-25a candidate dirty (REVERTED) | /shop/ladekabel-typ-1-10-m | `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` | 5, representative | 3082.353 ms | 0 | 21 ms | n/a | n/a | n/a | Exit 1; LCP fails; range 3081.639–3310.148 ms; perf 0.92; a11y 1.00; transfer 248717 B; candidate reverted |
| 2026-10-18 | abad194 + WP-25a candidate dirty (REVERTED) | /shop/cart | `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` | 5, representative | 2856.573 ms | 0 | 37.905 ms | n/a | 116.432 KB | n/a | Exit 1; LCP fails; range 2705.532–2856.753 ms; perf 0.94; a11y 1.00; transfer 184772 B; candidate reverted |
| 2026-10-18 | abad194 + WP-25a candidate dirty (REVERTED) | /shop/wallbox-home-7-4 | `npm run check` / route budget | 1 build | n/a | n/a | n/a | n/a | 122.991 KB | n/a | Candidate correctness/build/all caps passed; baseline product JS 127.640 KB; reverted after lab LCP regression, not retained gain |

| 2026-10-18 | 2f0c200 + WP-25b candidate dirty (REVERTED) | /shop/c/wallboxes | `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` | 5, representative | 3010.556 ms | 0 | 0 ms | n/a | 120.506 KB | n/a | Exit 1; LCP fails; range 2710.199–3013.752 ms; perf 0.92; a11y 1.00; transfer 204481 B; not retained benefit |
| 2026-10-18 | 2f0c200 + WP-25b candidate dirty (REVERTED) | /shop/c/wallboxes?connector=ccs | `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` | 5, representative | 2709.352 ms | 0 | 30 ms | n/a | n/a | n/a | Exit 1; LCP fails; range 2705.472–2859.476 ms; perf 0.94; a11y 1.00; transfer 163343 B |
| 2026-10-18 | 2f0c200 + WP-25b candidate dirty (REVERTED) | /shop/ladekabel-typ-1-10-m | `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` | 5, representative | 2781.176 ms | 0 | 0 ms | n/a | n/a | n/a | Exit 1; LCP fails; range 2779.685–2933.548 ms; perf 0.93; a11y 1.00; transfer 201867 B; ranges overlap baseline |
| 2026-10-18 | 2f0c200 + WP-25b candidate dirty (REVERTED) | /shop/cart | `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` | 5, representative | 2405.685 ms | 0 | 12.053 ms | n/a | 116.450 KB | n/a | Cart assertions pass; whole command exit 1; range 2255.301–2410.854 ms; perf 0.96; a11y 1.00; transfer 137922 B |
| 2026-10-18 | 2f0c200 + WP-25b candidate dirty (REVERTED) | /shop/wallbox-home-7-4 | `npm run check` / route budget | 1 build | n/a | n/a | n/a | n/a | 123.010 KB | n/a | Candidate full check/build/all caps passed; baseline product JS 127.640 KB; hard LCP gate still failed |

Notes: medians from `.lighthouseci/` (portal) and `.lighthouseci-shop/` (shop) reports of the 2026-10-17 runs; TTFB is the `server-response-time` audit on the local warm server (no cold/warm split yet); all numbers lab (mobile emulation, simulated throttling). Later rows explicitly marked representative use LHCI's selected median run, not independent per-metric medians.

## Open questions
- WP-25a: Done; human accepted `2f0c200` as a measured-and-reverted experiment. Retained
  auth/product regressions passed the final full check and two production regressions.
  The failed candidate's compiler removal/JS reduction is not a retained benefit.
- WP-25b: Done; human accepted `304c87b`, fully reverted after the measured hard LCP failure. Compact AST production
  delivery, client compiler removal, versioned URL isolation and correctness checks passed,
  but three route selections still exceed 2500 ms. No warm-browser cache-upgrade test was
  performed; browser URL isolation was verified. The internal-annotated generator/plugin
  coupling and format-versioned endpoint candidate will not be retained after failure.
  Final retained-source verification passed. No further optimization scope is approved by
  that acceptance. WP-25c is the separately bounded diagnostic next step, not a gate waiver.
- WP-25c: Done; human accepted `5d3d024`. Ten captures and exact offline replays identify
  terminal modeled pings and actual uncompressed HTML. Full check and remote CI passed
  with no product edits. Human selected diagnosis only; proposed WP-25d is not authorized
  and must not start without a new explicit scope decision.
- WP-22: Done; human accepted `60fd260` on 2026-10-18 and its GitHub Actions run passed.
- WP-24: Done; human accepted `85f7c73` on 2026-10-18. Test-first request coalescing and router/busy
  candidates were measured then reverted because synthetic RUM did not establish a filter-INP
  improvement (category INP n=1 in each 30-run sample; no trusted filter-target attribution).
  The sampler's `performance.getEntriesByType('event')` diagnostic is invalid absence evidence
  and is outside this package's source scope; the actual-observer scratch probe is narrowly
  described in the handoff below. The optional tooling correction remains unapproved.
  WP-25 is Blocked on the hard LCP gate after the scope approval below; WP-27 remains pending its prerequisites.
- WP-25 constraint: the retained post-projection baseline has three LCP selections above
  2500 ms. Assertions are now hard errors, unchanged by WP-25a; its four-route LCP failure
  was reverted. Shop CI wiring remains unstarted until the hard gate passes.
- WP-25's former scope blocker was resolved by explicit human approval for `app/components/shop/ShopProductCard.vue`,
  `shared/seo.ts`, `tests/unit/seo.test.ts`, `tests/e2e/shop-listing.spec.ts`, and
  `tests/e2e/shop-product.spec.ts`. Listing cards consume full `ShopProduct` contract objects
  although they render only a subset, and product SEO also accepts a full product type while
  consuming fewer fields. A safe projection needs narrowed consumer types and regression tests;
  do not fabricate discarded fields or assert the projected value as a full product.
  On 2026-10-18, fresh `npm run lighthouse:shop` built successfully and completed 20 reports,
  but its process exit code was not captured; the observations are baseline only, not a passing
  command or the post-projection error-level gate. Warn-level LCP medians: wallboxes
  2785.472 ms, wallboxes `?connector=ccs` 2558.704 ms, product
  `/shop/ladekabel-typ-1-10-m` 2786.302 ms; cart had no LCP warning. Reports are preserved in
  `.lighthouseci-shop/`.
  Fresh production HTML and external payload captures (manual exact owned server PIDs, capture
  command exit 0; server PIDs stopped and ports verified free): listing `/shop/c/wallboxes`
  HTML 23530 B raw / 4469 B locally gzip-compressed; inline `__NUXT_DATA__` bootstrap 405 B;
  external `_payload.json` 3568 B raw / 1152 B locally gzip-compressed. Product
  `/shop/ladekabel-typ-1-10-m` HTML 20100 B / 4223 B; inline bootstrap 431 B; external payload
  7322 B / 2301 B. Both HTML and external JSON returned 200 without `Content-Encoding`; gzip
  sizes above are computed locally and are not wire-transfer measurements. No source files
  were changed; the new 20-report baseline is retained alongside prior evidence.
- WP-04: `legacy-php/` remains intentionally unchanged; it is the never-executed twin called
  out by the package and does not expose the new Store API routes.

## WP-23 — Lazy hydration (Done; human-accepted 2026-10-18)
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
  passed on the combined WP-21/WP-23 state. Human accepted WP-23 at `8c2bc38` on 2026-10-18.

## WP-24 — Filter responsiveness (Blocked; 2026-10-18)
- Isolated branch `codex/wp24-filter-inp`, HEAD `8c2bc386a4812a674254ff0c0c806892975d4234`;
  draft files: listing page, `tests/e2e/shop-listing.spec.ts`, and its progress log. This
  cache-off baseline excludes unaccepted WP-22. No WP-24 draft code was integrated or committed.
- Fresh build passed. Initial manually launched app lacked `NUXT_LEGACY_ORIGIN`, returning
  listing 502 and completing 0/30 runs; artifact `rum-wp24-before-runtime-failure.json`.
  A corrected `--no-start` run completed 30/30 (LCP 220 ms, INP 16 ms n=27, CLS 0;
  237 accepted vitals and 90 events) but exited `-1073740791` during Windows teardown.
  Both attempts exited abnormally with `UV_HANDLE_CLOSING`; their artifacts are diagnostics,
  not passing commands. Corrected no-start artifact: `rum-wp24-before.json`.
- Clean harness-owned `RUM_LEGACY_PORT=18091 node scripts/rum-sample.mjs --runs 30 --json
  .lighthouseci-shop/rum-wp24-before-clean.json` exited **0**. Category synthetic RUM p75:
  LCP **228 ms (n=30)**, INP **16 ms (n=27)**, CLS **0 (n=30)**; 235 browser-observed accepted
  vitals plus 2 server-confirmed receipts, 90 accepted events, no failures/rate limits,
  30/30/30 funnel. Artifacts above are in the WP-24 worktree's `.lighthouseci-shop/`.
- The sampler's `selectOption()` interactions and aggregated summary do not establish filter
  INP attribution. Two trusted-keyboard probes captured beacon bodies after typing `22`;
  neither emitted listing INP, including a 1.8-second quiet interval. This is not zero-INP
  evidence, and the route's 16 ms p75 is not claimed as filter-control INP.
- Tests first: rapid `22` typing on the base failed the one-request regression with requests
  for `minPower=2` and `minPower=22`. A local-input, 250 ms debounce/cleanup candidate with
  select `change` handlers passed **1/1**, including after one handler simplification.
- Both budget runs exited **1**: initial listing/product/cart **125.723/128.089/121.601 KB**;
  simplified **125.712/128.078/121.599 KB** versus **126/128/123 KB**. The product cap blocks
  this draft. No candidate after-RUM or full check ran; no INP improvement is claimed.
  Processes were stopped and ports verified free. Resume only after WP-22 acceptance,
  retaining the draft and taking a fresh before sample on the new base before further work.

## WP-24 resumption on accepted WP-22 (Review; 2026-10-18)
- Resumed in `codex/storefront-complete` at accepted base `60fd260`. Existing WP-22 acceptance
  status/evidence above was preserved. Implementation experiments touched only the category
  listing page and `tests/e2e/shop-listing.spec.ts`; all runtime and test edits were reverted.
- Fresh accepted-base build succeeded before measurement. Synthetic 30-run category RUM
  completed exit 0: LCP 204 ms p75 (n=30), CLS 0 (n=30), INP 8 ms (n=1). The route-level
  INP sample is sparse and does not identify the filter interaction.
- Step (a), request coalescing: tests first showed two payload requests for rapid `2` then `22`
  typing on base; a local-input trailing 250 ms debounce candidate passed the fast-typing and
  range-plus-connector overlap regressions with one query-aware successful transport and
  matching final state. Candidate route budgets displayed PASS (listing/product/cart
  125.202/127.575/121.075 KB); that run's process exit was not retained. Candidate synthetic
  RUM completed 30 runs (LCP 212 ms p75, INP 16 ms n=1, CLS 0); it provides no attributable
  filter-INP gain. Reverted under the measurement rule; no request-coalescing-only runtime
  change is retained as WP-24 optimization.
- Step (b), route replacement and pending state: a delayed API/payload E2E was RED on base
  because the old grid had no `aria-busy`; candidate using `router.replace` and pending state
  passed the regression, preserving old cards while loading and clearing busy after the final
  successful response without adding history. Candidate budget exited 0 (listing/product/cart
  125.139/127.512/121.077 KB). Candidate synthetic RUM exited 0 (LCP 220 ms p75, INP 16 ms
  n=1, CLS 0); no filter-attributed improvement was established, so this runtime candidate
  was also reverted. Existing computed `useFetch` query behavior was left unchanged; no
  redundant watcher was added.
- Step (c): existing listing cards already use stable product IDs as keys. A scratch trusted
  keyboard probe installed actual `PerformanceObserver` observers for Event Timing and
  `longtask` before typing, then waited and navigated to flush vitals. That narrow probe
  captured no Event Timing entries, long tasks, or listing INP beacon; it does not establish
  broad absence of long tasks or zero filter INP. There is no measured basis for `v-memo`, so
  no memoization was added. Separately, the sampler's `performance.getEntriesByType('event')`
  counter is not valid Event Timing absence evidence (and is collected on product after
  add-to-cart, not on listing); it was not edited because that tooling file is out of scope.
- Final retained source gates: `E2E_LEGACY_PORT=18090 npx playwright test --project=shop`
  exited 0 (72/72). Full `E2E_LEGACY_PORT=18090 ROUTE_BUDGET_LEGACY_PORT=18090 npm run check`
  exited 0: lint, typecheck, token and migration checks, 289/289 unit tests,
  186/186 E2E tests, production build, and all route budgets passed. Final route JS values:
  stations/sessions 117.621/117.621 KB, invoices/dispute 120.390/120.390 KB, listing
  125.070 KB, product 127.443 KB, cart 121.075 KB. `git diff --check` passed before this
  handoff edit. No dependency, cap, or retained product-source changes; no commit or push.
- Synthetic RUM artifacts are local under `.lighthouseci-shop/` as
  `rum-wp24-before-accepted22.json`, `rum-wp24-after-a.json`, and `rum-wp24-after-b.json`.
  Human review/acceptance is pending; the optional sampler diagnostic correction is an
  out-of-scope tooling question and is not a blocker for this package handoff.

## WP-25 — Payload and hard gates (Blocked; 2026-10-18)
- Accepted prerequisite: WP-24 at `85f7c73`; its CI run `39117912233` passed. Baseline
  measurements and the exact five-file scope request are recorded above. No payload
  transform, consumer-type change, hard-gate promotion, or CI-wiring change was made.
- The package's sample field names differ from the actual narrow contract: product specs
  use `customFields.powerKw` and `customFields.connectorType`; listing/related cards also
  need stable `id` keys. Projection must follow actual rendered fields, not introduce aliases
  or weaken the full BFF contract. The card and JSON-LD input types currently prevent a
  sound page-only projection, as confirmed by the read-only Luna review.
- Fresh production build completed; HTML/payload capture exited 0. The 20 warn-level lab
  reports are observations only because the runner exit was not retained. The primary agent
  verified their manifest-selected representative values and copied all 20 JSON/HTML reports
  and the manifest to `.lighthouseci-shop-wp25-before/` (41 files). The copied manifest retains
  original absolute paths; resolve report basenames in that backup if default output changes.
- Source/config/tests remain byte-identical to `85f7c73`; only this progress log changed.
  Assigned ports 3000/18090 are free. Resume after actual human approval of the named files,
  with failing payload regressions before projection, then all unchanged error-level gates.
  A failing post-projection Lighthouse gate requires stopping for a further optimization WP,
  not relaxing the thresholds. WP-27 remains pending.

## WP-25 resumption — Projection retained, hard gate blocked (2026-10-18)
- Worktree `codex/storefront-complete`, measured from `83c3f76` plus approved dirty files.
  Page transforms now serialize only the listing envelope/card fields, product presentation
  fields/two valid specs, and eight related card records. Full BFF contracts are unchanged.
  Card and JSON-LD input types were narrowed without dummy values or full-product casts.
- Tests first: stock-only and then exact-shape payload regressions failed on the base.
  Tests decode actual Nuxt data with the installed Vue revivers, require external `data-src`
  in production, and retain the inline dev path. A 404 regression found eight unrendered
  accessory records; guarding the related fetch made it pass. A stable-ID URL regression
  found the current product in related cards; restoring the canonical product-slug exclusion
  made fresh-query and cached-revisit assertions pass.
- One intermediate full check failed 187/188 browser tests on a single hydration refetch.
  Cold focused checks and later full suites passed without removing the slug-specific key.
  Persisted Nitro dev SWR with an older SSR key is a plausible, not proven, explanation for
  that failure. Separately, an old ID-route cached variant retained its self-link while a
  fresh inert-query variant used the corrected projection. Tests preserve warm-cache coverage.
- Final `E2E_LEGACY_PORT=18090 ROUTE_BUDGET_LEGACY_PORT=18090 npm run check` exited 0:
  289 unit tests, 190 browser tests, build and seven JS caps. Final production payload/404/
  stable-ID/no-refetch checks passed 5/5. Listing/product/cart JS: 125.136/127.640/121.080 KB;
  portal stations/sessions 117.626 KB and invoices/dispute 120.395 KB, all under unchanged caps.
- `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` exited 1 after all 20 reports.
  Only LCP fails. All 20 audits have accessibility 1.00 and CLS 0; maximum TBT is 49 ms.
  Representative values and ranges are in Measurements; representatives are not independent
  per-metric medians. No LCP gain or cause of the product timing change is claimed.
- Primary read-only review verified the reports and preserved 41 after files at
  `.lighthouseci-shop-wp25-after/`; as with the before backup, resolve report basenames there
  if the copied manifest's original absolute paths are later replaced. Owned ports are free.
  Stop per step 4: no further optimization was implemented, no thresholds were loosened,
  and `.github/workflows/ci.yml` is unchanged. WP-25 is not Review/Done; WP-27 is pending.

## WP-25a — Precompiled translation experiment (Done; measured and reverted; 2026-10-18)
- Human accepted the pushed `2f0c200` handoff and separately approved WP-25b. The original
  WP-25 hard gate is not accepted as passing by this experimental acceptance.
- Base `abad194`, branch `codex/storefront-complete`. Actual human approved the experiment
  and later one final Nitro-integration attempt; decisions above record both boundaries.
- Tests first: a fresh baseline build exited 0; the initial artifact checker exited 1 on
  actual raw DE/EN `shop.cartCount` messages and eight scanner/tokenizer properties in
  minified client chunk `DQFPaqzK.js`. These are installed message-compiler object properties,
  not guessed function names. The final checker additionally follows exact locale loader
  keys (including `$` identifiers), requires distinct resources, validates every catalogue
  string leaf's AST and source when present, verifies named interpolation, and rejects an
  empty client chunk directory. Catalogues contain no plural-choice messages.
- Options alone built but `/login` returned 500 (`unhandled node type: 0`); message endpoints
  still delivered raw strings. The exposed `.rollup()` precompiler adapter rejects non-Vite/
  Webpack frameworks; the `.vite()` adapter initially conflicted with Nitro's generic JSON
  parser. These attempts were stopped and reverted before the final human-approved method.
- The final method uses Nitro's typed `rollup:before` hook, requires one top-level JSON
  plugin, and substitutes an exact-DE/EN precompiler plus generic JSON exclusion. Installed
  Vite/Rolldown and Rollup declaration differences require a narrow adapter-boundary assertion;
  no `any`, ignored type error, dependency change, or installed-module edit is used. This
  deliberately couples to the installed transitive build APIs/plugin name and fails closed
  on a missing/ambiguous integration point. Emitted ASTs retain source-location metadata;
  no production-minification or performance benefit is inferred from their existence.
- Guarded candidate build exited 0. The final strict artifact checker and targeted typecheck
  both exited 0: exact unique locale keys, distinct `$`-safe resources, every message AST with
  matching `loc.source`, named interpolation, and 33 nonempty client chunks without the
  observed compiler markers. Production server
  must use `NUXT_LEGACY_ORIGIN=http://localhost:18090`, not build-time `LEGACY_ORIGIN`:
  an initially misconfigured broad production run yielded 39 passes/27 failures from 502s;
  after correction login/listing returned 200, SSR/locale roundtrip passed 1/1, and focused
  product/cart checks passed 45/45 (including 404, no-refetch and count interpolation).
- Verification also caught an over-strict HTML-language whitespace assertion; it now permits
  serialization whitespace while requiring the exact language. English axe coverage is
  retained before switching back to German, where axe is checked again.
- An intermediate full check passed lint/types and 289 unit tests but failed three existing
  cache HTML-identity cases (187/190 browser tests). Their only mismatch was serialized old
  `optimizeMessageBundling:true` versus current `false`, not locale/business content. With
  owned servers stopped and paths verified, only `.nuxt/cache/nitro` was moved to recoverable
  sibling `.nuxt/cache/nitro-wp25a-preserved-20261018`; all eight unchanged cache tests then
  passed (exit 0). No cache test, route rule or runtime cache implementation was modified.
- Current-source cold-cache `E2E_LEGACY_PORT=18090 ROUTE_BUDGET_LEGACY_PORT=18090 npm run
  check` exited 0: 289 unit tests, 190 browser tests, fresh build and all seven unchanged route
  budgets. Candidate listing/product/cart initial JS is 120.487/122.991/116.432 KB gzip
  versus WP-25's 125.136/127.640/121.080 KB. No LCP improvement is inferred from the JS change.
- Final fresh production checks repeated the strict artifact check (exit 0), login SSR DE/EN
  and focused browser checks (1/1 auth, 45/45 product/cart). Both actual locale-message HTTP
  endpoints returned 200 and AST type 0 with matching source and `{name}`/`{n}` nodes.
  Identity response bodies are DE 55,750 B and EN 54,849 B (no Content-Encoding): compiled
  source-location metadata creates a transfer trade-off that must be measured, not ignored.
- All 20 hard Lighthouse audits completed; command exited 1 on LCP only. The primary agent
  independently verified all four selected reports and five-run spreads in the 41-file backup
  `.lighthouseci-shop-wp25a-final/` (resolve report basenames if its copied absolute manifest
  paths no longer exist). All 20 have accessibility 1.00 and CLS 0; max TBT 73 ms, minimum
  performance 0.90. Every candidate LCP range lies above the corresponding observed WP-25
  range. These are lab observations, not synthetic RUM or a statistical causal estimate.
- Network reports show DE locale response resource/transfer 4065/4317 B before versus
  55750/56003 B in the candidate. Total representative transfer rose exactly 47662 B on each
  route despite smaller initial JS. The unsupported Vite lifecycle leaves production ASTs
  with development source-location metadata; no further variant was attempted after failure.
- Per approval the config and experimental verifier were reverted; valid auth/product
  language regressions remain. The candidate dev cache and uploaded duplicate are preserved
  separately in recoverable local backups, not deleted. Final retained-source full check
  exited 0 from a fresh cache generation: lint/types/tokens/inventory, 289 unit tests, 190
  browser tests, build and all seven unchanged caps. Listing/product/cart returned to
  125.136/127.640/121.080 KB gzip. Primary Git review confirms no diff in `nuxt.config.ts`,
  dependencies/lockfile, hard gates, cache implementation or CI. Final production checks
  against the reverted build passed 2/2, exit 0: SSR DE/EN roundtrip and product EN→DE
  formatting/no-refetch. Both owned app/legacy processes were stopped and assigned ports
  are clear; no WP-25 CI wiring or WP-27 work started. Human subsequently accepted `2f0c200`.
- Exact retained-production command: with `E2E_APP_PORT=3000`, `E2E_LEGACY_PORT=18090` and
  `NUXT_LEGACY_ORIGIN=http://localhost:18090`, run `npx playwright test
  --config=.wp25a-locale-production.config.ts tests/e2e/auth.spec.ts
  tests/e2e/shop-product.spec.ts --project=auth --project=shop
  --grep 'SSR serves both locales|related product labels and formatting follow the selected English locale'`.
  The temporary config pointed at the already-running production server, set `de-DE`, selected
  auth/shop projects and `webServer: []`; it was removed afterward. Earlier candidate focused
  1/1 and 45/45 results were observed, but their exact CLI/config/filter text was not retained.
- After the hard assertion prevented autorun upload, `node node_modules/@lhci/cli/src/cli.js
  upload --config lighthouserc.shop.cjs` exited 0 using the configured local filesystem target;
  no remote upload occurred. Primary review independently parsed all 20 backed-up reports.
- Final diff retains only auth/product locale tests, this progress evidence and approved
  package/index documentation. Candidate JS reductions and AST compiler removal are not
  retained benefits; the three original WP-25 LCP misses remain. Acceptance is for the reverted
  experiment and regressions, not acceptance of a passing performance optimization.

## WP-25b — Compact production locale experiment (Done; measured and reverted; 2026-10-18)
- Actual human accepted WP-25a at pushed `2f0c200` and approved this separate bounded
  experiment. Branch `codex/storefront-complete`, base `2f0c200`; WP-25/27 remain incomplete.
- Implementation and independent read-only review are delegated to fresh GPT-6 Luna high
  subagents. One implementation agent holds the exclusive runtime/build lease; primary owns
  documentation, integration, final evidence review and any authorized commit/push.
- Tests first: fresh baseline `npm run build` exited 0. The artifact verifier on that untouched
  output exited 1 on raw DE/EN `common.required` messages, absent versioned Nitro message route,
  and eight source-proven scanner properties together in client chunk `DQFPaqzK.js`.
  Production browser regression also failed as intended: actual request
  `/_i18n/f744aa05/en/messages.json` did not match `/_i18n/compiled-v1/<hash>/en/messages.json`.
- First candidate build failed because the generic JSON plugin normalizes Windows IDs to
  forward slashes but the exact-file exclusion used native backslashes. Slash-normalizing
  those two exact resolved paths corrected it: candidate `npm run build` exited 0.
- Candidate verifier exited 0: 120 DE and 120 EN compact AST messages preserve exact values
  and interpolation without `loc.source`; loaders/resources are distinct, Nitro uses the
  versioned route, and all 33 nonempty client chunks lack the complete source-derived
  compiler scanner property set. Self-tests reject missing/duplicate loaders, raw/malformed
  ASTs, changed interpolation, empty chunks and an empty chunk list. This proves artifact
  shape, not production behavior or speed. Retained baseline reports remain
  `.lighthouseci-shop-wp25-after/`.
- Focused production checks passed 3/3 (exit 0): SSR and DE/EN roundtrip with HTTP 200 compact
  AST endpoints, product formatting/no-refetch, and cart count through both locales.
  Actual endpoint envelopes are locale-keyed; assertions inspect the corresponding key.
  UTF-8 response bodies are DE 8843 B and EN 8486 B (body bytes, not transfer bytes).
  Independent read-only source review found no remaining config/verifier/E2E blocker.
  Full check and hard Lighthouse measurements remain outstanding; no speed gain is claimed.
- Strict typecheck caught an unnecessary generator source-map return type mismatch; the
  transform now returns generated code only (maps are not propagated). Typecheck exited 0.
  A default-sandbox EPERM writing this worktree's `.nuxt/schema` was resolved by approved
  worktree execution, not by changing types, permissions or installed dependencies.
- First full-check attempt passed lint/types/tokens/inventory and all 289 unit tests, then
  exposed a dev-only locale transform conflict: `de.json?import` reached jsonc-eslint-parser
  as generated `const` JavaScript, causing missing translations and browser timeouts.
  The known-broken browser phase was interrupted (exit 1); it is not a completed browser
  suite or full-check pass. Performance testing is paused while independent source review
  checks ordering and the smallest in-scope integration correction.
- Reviewer traced the conflict to installed Nuxt i18n already registering its own Vite
  precompiler when `optimizeMessageBundling:false`. The targeted correction removes only
  our duplicate Vite registration; the production-mode exact-file generator remains in
  Nitro's final Rollup hook. Client compilation stays with the installed i18n integration.
  Focused dev, production artifacts and full checks must prove this correction before
  performance measurement; no additional optimization, dependency or threshold change is
  authorized by it.
- Focused development retry no longer had the duplicate JSON parser error but failed 3/3
  on production-only HTTP URL waits. Development uses Vite locale modules; only the new
  transport/AST assertions will be explicitly production-gated, not SSR/UI/axe assertions.
  Raw-key hydration warnings were also observed and are not dismissed as assertion issues.
- Cache audit found earlier WP-25b snapshots were copies, leaving active cached HTML behind.
  After verifying owned ports stopped and the resolved path within `.nuxt/cache`, the exact
  active `nitro` directory (105 files) was moved to unique recoverable sibling
  `nitro-wp25b-postfocused-active-preserved-20261018`; no files were deleted.
- Source review found i18n gates its runtime-only alias on production but applies the
  compiler-drop option unconditionally. The bounded correction makes compiler removal
  production-only too; the approved compact server build transform is unchanged. Fresh
  dev and production checks must validate this hypothesis; no pass is inferred from it.
- Corrected fresh-cache focused dev checks passed 3/3, exit 0 (25.3 s), without the previous
  parser/raw-key/hydration failures. `dropMessageCompiler` now checks `NODE_ENV === 'production'`;
  only transport/AST assertions require `E2E_ASSERT_COMPILED_I18N=1`. All existing SSR/UI/axe/
  cart/no-refetch assertions remain unconditional. A fresh full check is starting, followed
  by refreshed production verification and the unchanged hard performance gate if correct.
- Corrected full `E2E_LEGACY_PORT=18090 ROUTE_BUDGET_LEGACY_PORT=18090 npm run check`
  exited 0: lint/types/tokens/inventory, 289 unit tests, 190 browser tests, production build
  and all seven unchanged route budgets. Initial gzip JS: stations/sessions 112.996 KB
  (cap 119.5 each), invoices/dispute 115.765 KB (122.4 each), category 120.506 KB (126),
  budget product `/shop/wallbox-home-7-4` 123.010 KB (128), cart 116.450 KB (123).
  Aggregate JS is informational only; the seven per-route caps are the actual hard gates.
  Non-fatal source-map/dependency warnings remain. Refreshed production verification and
  all 20 hard Lighthouse audits are next; smaller JS alone is not an LCP improvement.
- Refreshed production artifact verifier exited 0 again (120 messages per locale, 33 client
  chunks). With `E2E_ASSERT_COMPILED_I18N=1`, focused production auth/product/cart passed 3/3,
  exit 0, including actual versioned HTTP endpoints and compact locale-keyed ASTs.
  Production browser-language detection and unchanged cache tests are being checked too.
  Their first ad-hoc run passed detection plus 7/8 cache cases; the session case contacted
  default `localhost:8080` because its test helper lacked `E2E_LEGACY_PORT=18090` and failed
  ECONNREFUSED. No 8080 process was started/changed; the harness env is being corrected.
- Corrected production command with `E2E_LEGACY_PORT=18090` passed 9/9, exit 0: English
  browser detection and all eight unchanged `shop-cache.spec.ts` invariants. This includes
  production cache isolation/session behavior, not just dev coverage. All correctness
  prerequisites now pass; the exact production commands/config and measurements will be
  recorded at handoff. The unchanged 20-audit hard Lighthouse measurement is next.
- `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` completed all 20 audits and exited 1
  on LCP only: LHCI-selected representatives listing 3010.556 ms, filtered 2709.352 ms,
  product 2781.176 ms; cart passed at 2405.685 ms. All 20 have accessibility 1.00 and CLS 0;
  maximum TBT 53 ms, minimum performance 0.92. Measurements records all four five-run ranges.
  Representative product LCP is lower than baseline, but its five-run range overlaps the
  baseline and remains above the hard limit; no reliable target-metric improvement is claimed.
- Primary independently parsed the preserved 41 files in `.lighthouseci-shop-wp25b-final/`
  (20 JSON, 20 HTML, manifest). Resolve report basenames inside the backup because the copied
  manifest retains original absolute paths. Each report fetched the versioned DE message URL
  with HTTP 200, 8843 B resource / 9095 B transfer, versus baseline 4065/4317 B. Total-byte-weight
  grew exactly 812 B on each representative despite smaller JS. The two listing URLs differ
  by connector query, not by a demonstrated cold/warm cache state.
- Actual document resource/transfer bytes in Lighthouse network records (baseline → candidate):
  listing 23530/23891 → 23531/23892; filtered 12829/13190 → 12830/13191;
  product 20130/20492 → 20131/20493; cart 6744/6984 → 6745/6985. All returned HTTP 200.
  These are recorded resource/transfer bytes, not locally gzipped estimates.
- Per approved failure rule, candidate config and verifier were removed; auth/product files
  are byte-identical to HEAD and temporary production config is removed. Only seven new cart
  test lines remain, requiring EN→DE count 3 before the original axe/remove/persistence steps.
  No inert candidate-only guards, endpoint assertions, build hook or compiler flags remain.
  Active `.nuxt/cache/nitro` was moved to recoverable sibling
  `nitro-wp25b-retainedcheck-preserved-20261018` (89 files) with owned ports confirmed free;
  final retained-source full check is running. No new optimization or WP-25 CI wiring started.
- Final retained-source full `E2E_LEGACY_PORT=18090 ROUTE_BUDGET_LEGACY_PORT=18090 npm run check`
  exited 0: 289 unit tests, 190 browser tests, production build and all seven unchanged caps.
  Runtime JS returns to baseline: stations/sessions 117.626 KB; invoices/dispute 120.395 KB;
  category 125.136 KB, budget product 127.640 KB and cart 121.080 KB. Candidate JS reductions
  are not retained gains. Final production cart regression is next; retained runtime is
  unchanged, so the already-recorded baseline Lighthouse failures are not claimed fixed.
- Retained production cart check passed 1/1, exit 0. Exact owned legacy/app processes were
  stopped and assigned ports 3000/3100/6006/18090 were confirmed free. Temporary production
  config and candidate verifier are absent; primary and independent review confirm only the
  seven-line cart regression plus approved package/index/progress docs remain. Both reviews'
  `git diff --check` exited 0. User checkout's existing `package.json`/`.claude/` changes are
  untouched. No candidate runtime, build dependency, lockfile, route rule, cap or CI change remains.
- Exact focused dev command: `E2E_LEGACY_PORT=18090 NUXT_IGNORE_LOCK=1 npx playwright test
  --project=auth --project=shop tests/e2e/auth.spec.ts tests/e2e/shop-product.spec.ts
  tests/e2e/shop-cart.spec.ts --grep 'SSR serves both locales|related product labels and formatting follow|supports the complete cart journey'`.
  Initial production-URL-only failure exited 1 (3 failed); corrected fresh-cache run exited 0
  (3 passed). The known-broken earlier full browser run was interrupted, not counted as complete.
- Temporary production config `playwright.wp25b.production.config.mts` used `testDir: tests/e2e`,
  base URL `http://localhost:3000`, locale `de-DE`, auth/shop projects with their existing spec
  matchers, and `webServer: []`. Hidden manually owned production server used
  `NUXT_LEGACY_ORIGIN=http://localhost:18090`; the legacy stand-in used port 18090.
  Exact final candidate command: `E2E_ASSERT_COMPILED_I18N=1 npx playwright test
  --config=playwright.wp25b.production.config.mts tests/e2e/auth.spec.ts
  tests/e2e/shop-product.spec.ts tests/e2e/shop-cart.spec.ts
  --grep 'SSR serves both locales|related product labels and formatting follow|supports the complete cart journey'`
  (3 passed, exit 0). No session-reset helper in these three tests uses the legacy test port.
- Exact corrected additional production command: `E2E_LEGACY_PORT=18090 npx playwright test
  --config=playwright.wp25b.production.config.mts tests/e2e/auth.spec.ts
  tests/e2e/shop-cache.spec.ts --grep 'an English browser gets English without touching the switcher|public shop response caching safety'`
  (9 passed, exit 0). Without the port override the first attempt had 8 passed/1 harness failure.
  Exact reverted-build command: `E2E_LEGACY_PORT=18090 npx playwright test
  --config=playwright.wp25b.production.config.mts tests/e2e/shop-cart.spec.ts
  --grep 'supports the complete cart journey'` (1 passed, exit 0). Temporary config was removed.
- Lighthouse produced the manifest directly; no recovery upload or remote upload was needed.
  The exact 41-file output directory was moved to `.lighthouseci-shop-wp25b-final/`, preserving
  all earlier backups. Baseline/candidate use Lighthouse 12.6.1, HeadlessChrome 156 and the same
  mobile/simulated throttling settings. No retained-source Lighthouse rerun was performed:
  runtime is byte-identical to baseline, whose hard gate already fails, and final retained
  correctness/build checks were rerun. This is not a claim that all work packages are complete.
- Failure interpretation: the same eager/high-priority/parser-discoverable listing image has
  unchanged bytes and similar observed request timing, while its simulated load phase differs
  materially. Observed trace-derived insight timing and the hard simulated LCP even move in
  opposite directions for some routes. No cause, statistical gain or CSS/image fix is inferred.
  A next bounded investigation should examine report inputs and capture paired trace/network
  artifacts if required (the 41-file backups are reports, not a claim of preserved raw traces),
  before selecting another optimization. No such next package has started.
- Human subsequently accepted pushed `304c87b`; WP-25c diagnostic work is now separately
  bounded. Acceptance does not convert the failed candidate into a retained performance gain.

## WP-25c — Simulated LCP diagnosis (Done; 2026-10-18)
- Human accepted WP-25b and permitted this bounded investigation. Branch
  `codex/storefront-complete`, base `304c87b`; product runtime remains the accepted baseline.
- Fresh GPT-6 Luna high agents own serialized capture/verification and independent read-only
  simulation/source analysis. Primary owns package/index/progress, integration and final review.
- Installed LHCI runner forces report output to stdout; direct installed Lighthouse CLI
  supports `--save-assets` and `--lantern-data-output-path`. Capture will use unique prefixes
  and compare resolved defaults to the unchanged baseline, not tune simulation parameters.
  Ten captures maximum; no product edits or optimization is authorized by this package.
- Fresh `npm run build` exited 0 on accepted runtime. Installed Lighthouse 12.6.1 and the
  Playwright Chromium path are verified; baseline settings match mobile 412×823/1.75 scale,
  simulated 150 ms RTT/1638.4 Kbps/4× CPU and the four unchanged audit categories.
  Temporary capture runner uses hidden owned Node children and unique per-run output paths.
- Independent installed-source review confirms simulated LCP uses Lantern's network graph
  with fixed configured RTT/throughput/CPU plus observed per-origin additional RTT and server
  response estimates. Trace-engine `lcp-phases-insight` is distinct observed evidence; it
  does not replace the simulated hard metric. No source-specific cause is proven yet.
- All ten direct CLI captures and the wrapper exited 0; assigned ports were free afterward.
  Local `.lighthouseci-shop-wp25c-diagnostics/` contains exactly 50 files: ten each report JSON,
  report HTML, raw trace JSON, DevTools log JSON and Lantern network JSON. This is successful
  diagnostic collection, not a successful hard shop gate. Temporary runner was removed.
- Primary independently verified actual resolved settings/versions match baseline. Separate
  JSON/HTML output format is the only intended CLI reporting difference. Observed host
  benchmark scores vary and are not used to excuse hard simulated failures.
- Current unfiltered listing simulated LCP runs: 2943.763, 2788.436, 2785.410, 2795.234,
  2783.702 ms; independent median 2788.436 ms. Trace-observed LCP: 426, 304, 236, 235, 250 ms
  (median 250). Product simulated: 2936.435, 2784.308, 2786.378, 2784.010, 2782.570 ms;
  median 2784.308. Product trace-observed: 280, 221, 246, 272, 343 ms (median 272).
  All ten simulated values still exceed 2500 ms. Direct captures have no LHCI-selected
  representative; none of these medians is labelled as one.
- Total-byte-weight is constant at 203669 B listing / 201055 B product, matching retained
  baseline. Network-request transfer sums are separately 203440/200826 B, not the same audit.
  Saved Lantern estimates have zero additional origin RTT and only about 1.89–3.75 ms
  server-response estimates; those small differences alone do not establish a cause for
  hundreds of milliseconds of simulated variation. Graph/priority/dependency analysis is next.
- Post-capture full check passed lint/types/tokens/inventory and 289 unit tests so far;
  browser/build/budget verification is still running. No product source has changed.
- Post-capture `E2E_LEGACY_PORT=18090 ROUTE_BUDGET_LEGACY_PORT=18090 npm run check` exited 0:
  289 unit tests, 190 browser tests, build and all seven unchanged budgets. Baseline gzip JS
  remains 117.626 KB stations/sessions, 120.395 KB invoices/dispute, 125.136 KB listing,
  127.640 KB budget product and 121.080 KB cart. Owned ports are clear and runtime lease returned.
- Offline replay avoids another browser-capture scope: installed
  `LanternLargestContentfulPaint.request` can recompute from saved trace/DevTools/settings,
  navigation gather context, recorded URL fields, `SourceMaps: []`, `simulator: null` and a
  fresh computed cache. Independent reviewer reproduced listing-01 exactly at
  2943.7625000000016 ms; primary reproduced listing-03 exactly at 2785.4099999999994 ms
  (optimistic 2710.41, pessimistic 2860.41, 44/48 timing-map nodes).
- Primary's validated listing-03 replay shows `/api/vitals` requests finish last in both
  modeled LCP graphs (2710.41/2860.41 ms), after late locale/CSS requests. This is evidence
  about the simulator's graph, not proof those beacons block real pixels or that delaying
  them alone would satisfy the gate. All-ten replay and dependency-chain analysis are next;
  no graph pruning, custom parameter overrides or product edits have been made.
- Independent review now validates all ten offline replays exactly against saved report LCP.
  In each optimistic/pessimistic graph, the terminal node is `/api/vitals` or `/api/events`
  Ping, not the LCP image. Installed `LargestContentfulPaint.js` filters low-priority images
  but retains other requests, then uses their maximum end time with 0.5/0.5 optimistic/
  pessimistic weights. This explains how a non-rendering request can end the modeled path;
  it does not prove that request blocks the observed paint or invalidate the unchanged gate.
- Example validated listing-03 optimistic dependency path: navigation document ends 752.6 ms,
  parser entry `DQFPaqzK.js` (45716 B transfer) ends 2405.2 ms, a RunTask contributes 48 ms,
  a later Nuxt chunk ends about 2461.5 ms, then vitals pings end 2710.41 ms (pessimistic
  2860.41). Product-02 has the analogous path with about 52 ms RunTask. The ~1.8–2.2 s old
  "render delay" row is not evidence of that much CPU work: network/dependency timing is
  substantial. Terminal requests can have multiple graph dependencies; this is a compact
  path summary, not an additive breakdown of every node or a causal user-performance model.
- Late route CSS and German locale messages run in parallel after entry JS, not a CSS
  waterfall or direct proven cause of the terminal ping. Image bytes/priority and request
  signatures remain stable. A CSS-consolidation change is therefore not justified here.
- Compression evidence: captured listing HTML is `text/html;charset=utf-8`, Content-Length
  23530, no Content-Encoding. Its compression audit estimates 19070 B savings (~4460 B body);
  product HTML 20130 B has about 15912–15913 B estimated savings (~4217–4218 B). Baseline
  filtered/cart HTML estimated savings are 9077/4356 B. The audit estimates 150 ms for listing/
  product but 0 ms filtered/cart: these opportunity estimates are not measured gains.
- Proposed next scope (NOT implemented/approved): one aggregate experiment combining
  public-shop HTML-only gzip with deferral of initial noncritical telemetry transport.
  Keep metric observers/calculation active, serialize payloads at call time, preserve route/
  tab/value/order and same beacon/fetch fallback, flush on idle and visibility/pagehide,
  and cover immediate navigation plus late metric callbacks. No Lighthouse detection or
  graph pruning. Compression alone (~150 ms modeled opportunity) or one ping (~153 ms
  modeled tail) is not a promised fix; aggregate effects need real unchanged hard audits.
- Source-based compression safety: H3 awaits route/cache handler before its onBeforeResponse
  hook; Nitro forwards that hook before final send. Cached handler snapshots raw body first,
  permitting per-request compression after cache without encoded cache-body contamination.
  Compressed Content-Length must be updated. Conditional 304 returns before the usual
  beforeResponse path, so encoding Vary must also be ensured there, preserving existing
  Cookie/Accept-Language/Host/X-Forwarded-Proto values. Skip APIs/i18n endpoints, non-HTML,
  already encoded/stream/error/range/no-body responses and unsupported encodings.
- The next experiment would need explicit bounded runtime compression/header helpers/plugins,
  shared client transport plus ShopVitals/useShopEvents integrations, matching unit/wire/
  lifecycle browser regressions and package/index/progress docs. No dependencies, contracts,
  CI or caps change. Product JS has only 0.360 KB gzip headroom, so transport deduplication
  and unchanged budgets must be measured; failed optimization must be reverted.
- Exact capture command was `node .wp25c-capture.mjs` (exit 0). It sequentially invoked
  `node node_modules/lighthouse/cli/index.js <URL>
  --only-categories=performance,accessibility,best-practices,seo --form-factor=mobile
  --throttling-method=simulate --chrome-flags="--no-sandbox --headless=new"
  --output=json --output=html --output-path=.lighthouseci-shop-wp25c-diagnostics/<prefix>
  --save-assets --lantern-data-output-path=.lighthouseci-shop-wp25c-diagnostics/<prefix>.lantern.json
  --quiet`, with CHROME_PATH from installed Playwright. Prefixes listing-01..05/product-01..05,
  URLs `/shop/c/wallboxes` and `/shop/ladekabel-typ-1-10-m` on localhost:3000. Each CLI exited 0.
  Saved output and source-review details are local only; nothing was remotely uploaded.
- Temporary instrumentation is removed and the owned app/legacy processes are stopped.
  Only this package, index and progress docs differ; existing user checkout changes and
  earlier archives are untouched. Independent capture/source review and primary data
  checks are complete. Final diff/check and authorized commit/push are next; awaiting human
  acceptance before Done. The original WP-25/27 objective is still incomplete.
- Human subsequently accepted pushed `5d3d024` and declined the proposed WP-25d experiment
  for now ("Keep diagnosis only for now"). WP-25c is Done. GitHub Actions `39131215753`
  completed successfully and was reverified; it covers full check and portal Lighthouse,
  not the still-unwired shop hard gate. No new optimization package/source work is started.
  This acceptance-status update changes only this progress log; existing app/test/config
  sources and the preserved diagnostic archive remain unchanged.
