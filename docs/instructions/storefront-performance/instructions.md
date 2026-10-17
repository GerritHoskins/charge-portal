# Task: Public storefront slice with measured Core Web Vitals

> **Execution:** do not run this file as one task. Work through the packages in
> [`packages/README.md`](packages/README.md), one fresh session per package. Where a package
> differs from this overview, the package wins. Notable refinements made while splitting:
> the cart is client-side only (no Store API cart endpoints); public endpoints need an explicit
> allowlist in the auth guard (WP-05); the shop gets its own layout without the session lookup
> (WP-07); `/shop` is excluded from the CSRF cookie before caching is enabled (WP-22).

## Environment
- Project: `C:\Users\Gerrit\job-search\charge-portal-nuxt`
- Stack: Nuxt 4 / Vue 3 / Vite, strict TypeScript, zod contracts, `@nuxtjs/i18n`
- Styling: existing token-driven design system (`app/components/ds/`, `tokens/tokens.json`)
- Progress log: `docs/progress/storefront-performance/progress_log.md`

## Objective

Every page in this repo sits behind a login. That hides the problems a public, server-rendered
storefront has: cacheable SSR, image-driven LCP, hydration cost on long lists, interaction latency
on filters, field data instead of lab data, and a conversion funnel.

Add a small public shop in the same synthetic domain (charging cards and wallboxes) and use it to
**measure, change, and re-measure** Core Web Vitals. The deliverable is not the shop. It is a
before/after record in an ADR that shows which change moved which metric, and by how much.

Out of scope: payment, checkout, accounts, a real Shopware instance, real product data or
third-party branding (see `AGENTS.md`).

## Execution Rules

1. Follow `AGENTS.md`: tests first, contracts at the boundary, axe per new route, tokens only.
2. Execute steps in order. Each step ends with `npm run check` green and a progress-log entry.
3. **Measure before optimizing.** Step 3 deliberately ships a naive version and records a baseline.
   Do not skip ahead to the optimized version: without the baseline there is nothing to show.
4. Record every measurement with: date, command, build commit, route, median of N runs,
   device profile (Lighthouse mobile emulation, simulated throttling). Lab numbers are labelled
   as lab numbers everywhere.
5. Do not raise `JS_BUDGET_KB` or loosen a Lighthouse assertion to make a step pass. If a budget
   needs to change, that is a decision for an ADR (see Step 2).
6. Do not install dependencies except those listed in Step 0. Installing them is a human step.
7. Do not commit, push, reset, or clean Git history; a human reviews every diff.
8. Follow `docs/instructions/work-package-workflow.md`. After two failed attempts on the same
   error, pause retries and consult Codex; also consult when blocked or needing a second
   opinion, before escalating technical issues to the user. Record advice and verification.

### Progress tracking — mandatory

After every completed step, update `docs/progress/storefront-performance/progress_log.md`
(same structure as `docs/progress/mobile-responsive/progress_log.md`: Status, Decisions,
Completed Changes per step, Measurements, Open questions).

---

## Step 0 — Preflight (human)

- Create a branch from the current feature branch, e.g. `feat/storefront-performance`.
- Install: `@nuxt/image` (responsive images, `sizes`, format negotiation, preload) and
  `web-vitals` (field metrics in the browser). Check each package's current Nuxt 4 compatibility
  note before installing.
- Run `npm run check` and `npm run lighthouse` on the untouched branch and paste both summaries
  into the progress log. The README says Lighthouse was not re-run after the design-system and
  i18n changes; this closes that gap and gives the portal its own baseline.

## Step 1 — Contract: a Shopware-Store-API-shaped catalogue

Goal: the shop reads products the way a Shopware storefront would, through the existing
contract pattern. The stand-in serves synthetic data; it does not claim to be Shopware.

- Model a **subset** of the Shopware Store API response shapes for:
  - product listing (`POST /store-api/product-listing/{categoryId}`: `elements`, `total`,
    `page`, `limit`, `aggregations` for filters),
  - product detail (`POST /store-api/product/{productId}`),
  - and the cart endpoints you need (`GET`/`POST /store-api/checkout/cart...`).
  Take field names from the official Store API reference and cite the page and version in the
  schema file's header comment. Only model what the pages use (`translated.name`,
  `calculatedPrice`, `cover.media`, `seoUrls`, availability). Money stays integer cents at the
  BFF boundary, as in ADR 0003.
- Add `shared/contracts/catalog.ts` with zod schemas and inferred types.
- Tests first: `tests/unit/catalog-contract.test.ts` with valid fixtures and invalid cases
  (float price, missing cover, unknown availability).
- Extend the stand-in (`legacy/`) with a `/store-api/*` mock: about 40 synthetic products,
  2 categories, product images in 3 sizes under `public/` or generated placeholders
  (no stock photos with unclear licences).
- Add BFF routes `server/api/shop/*.ts` that call the stand-in through `fetchLegacy` and parse
  with the new schemas. Add one case to `tests/e2e/contract.spec.ts`.

Acceptance: contract tests green, invalid fixtures rejected with 502 at the BFF.

## Step 2 — Inventory and budget decisions (ADR 0007, draft)

Two repo guards will block a new public area. Decide how to handle them explicitly instead of
working around them:

- `docs/migration-routes.json` only knows `migrated | legacy | stays-legacy`, and
  `migration:status -- --check` fails on any page that is not listed. Proposal: add a status
  `nuxt-native` (never existed in legacy), excluded from the migration percentage. Update
  `scripts/lib/migration-routes.mjs` and `tests/unit/migration-routes.test.ts` first.
- `scripts/check-bundle-size.mjs` sums **all** gzipped client JS (115.8 KB of 120 KB per the
  README). Every new route chunk counts against it, even if no single page loads it. Proposal:
  keep the total as a soft report and add a hard budget **per route**, measured as the initial
  JS loaded by that route (entry plus that route's chunks; Playwright or the build manifest can
  supply this). Write the rationale and the chosen numbers in ADR 0007.

Acceptance: ADR 0007 drafted (status "proposed"), guards updated with tests, `npm run check` green.

## Step 3 — Naive storefront (baseline on purpose)

Build the pages the simple way a first version is often built, so the baseline is realistic:

- `/shop` (category listing, server-rendered, filters by power and connector type, sort by price)
- `/shop/[slug]` (product detail with large hero image, specs, "add to cart")
- `/shop/cart` (mini cart, client state, no checkout)

Baseline characteristics (intentional, documented in the progress log):
plain `<img>` with the largest image size, no `width`/`height`, everything hydrated eagerly,
filters re-fetch on every input event, no route caching.

Requirements that are **not** relaxed for the baseline: design-system components, tokens, i18n
strings in both catalogues, axe E2E per route, keyboard path from listing to cart, page titles.

Measure (median of 5 runs, mobile emulation), all three routes:
LCP, CLS, TBT, Speed Index, total transfer size, initial JS per route, server response time (TTFB)
for a cold and a warm request. Add the public routes to `lighthouserc.cjs` without the login
cookie (a second collect config, or a separate `lighthouserc.shop.cjs`).

Record the numbers. They are the "before" column of the ADR.

## Step 4 — Field data (RUM) and conversion events

Lab tests cannot see INP from real interactions, and no shop optimizes for Lighthouse alone.

- Client plugin `app/plugins/vitals.client.ts`: `web-vitals` `onLCP`, `onINP`, `onCLS`, `onTTFB`
  (use the attribution build so LCP reports the element and INP reports the interaction
  target). Send with `navigator.sendBeacon` to `POST /api/vitals` on `visibilitychange`.
- `server/api/vitals.post.ts`: validate with a zod schema, rate-limit with the existing
  `rate-limit` util, keep an in-memory ring buffer; `GET /api/vitals/summary` returns p75 per
  route and metric (p75 is how Core Web Vitals are assessed).
- Conversion events: `listing_view`, `product_view`, `add_to_cart` to `POST /api/events`,
  and `GET /api/events/funnel` with the step-to-step rates. No cookies, no IDs beyond a
  per-tab random id, no third-party analytics. Say in the README that this is demo telemetry.
- Tests first: unit tests for the schemas and the p75 calculation; an E2E test that drives
  listing -> product -> add to cart and asserts the funnel counts and that vitals arrive.
- Write a small Playwright script `scripts/rum-sample.mjs` that runs the funnel N times with
  CPU throttling, so the field-style p75 numbers can be produced locally and repeatably.

Acceptance: summary endpoint shows p75 LCP/INP/CLS for each shop route after a sample run.
Record those as the baseline field-style numbers (synthetic traffic, labelled as such).

## Step 5 — Optimizations, one at a time, each measured

Apply each change separately, re-run the Step 3 and Step 4 measurements, and add one row to the
ADR table per change (metric, before, after, why). Revert a change that does not help, and
record that too.

1. **LCP image:** `<NuxtImg>` / `<NuxtPicture>` with `sizes`, modern formats, explicit
   `width`/`height`, `preload` and `fetchpriority="high"` for the product hero and the first
   listing row only; lazy loading below the fold.
2. **CLS:** reserved aspect ratios for images and price/availability blocks; font loading
   (`font-display`, preload of the one font file actually used, or system fonts).
3. **Caching:** `routeRules` for `/shop/**`: `swr` (or `isr` where the deployment target
   supports it) with a short TTL for listing and detail; cart and `/api/shop/cart` stay uncached.
   Measure TTFB cold vs warm. Write down what invalidates the cache in a real shop
   (price changes, stock), and why the TTL was chosen.
4. **Hydration cost:** lazy hydration for below-the-fold parts (specs, related products,
   reviews placeholder) with Nuxt's `hydrate-on-visible` / `hydrate-on-idle` on lazy
   components; check in the Nuxt docs which version introduced it and note it. Measure TBT
   and initial JS per route.
5. **INP on filters:** debounce the filter input, keep the listing update off the critical
   path (update URL query, fetch with `useFetch` + `watch`, show a non-blocking pending state),
   avoid re-rendering the whole grid. Measure INP p75 from the RUM sample before and after.
6. **Payload:** check `useFetch` payload size in the HTML (`__NUXT_DATA__`) for the listing;
   use `pick`/`transform` so only fields the page renders are serialised.

## Step 6 — SEO basics for the public pages

- `useSeoMeta` per page (title, description, canonical, Open Graph), `lang` from i18n.
- JSON-LD `Product` with `offers` on the detail page; `BreadcrumbList` on listing and detail.
  Validate with a unit test against the schema shape; note that a manual check with Google's
  Rich Results Test was or was not performed.
- `hreflang` alternates for de/en, consistent with the `no_prefix` strategy decision in ADR 0006
  (document the limitation if `no_prefix` makes per-language URLs impossible).
- Lighthouse SEO category added for shop routes only.

## Step 7 — Documentation

- ADR 0007 (inventory + budgets) to "accepted".
- ADR 0008 "Storefront performance": context, the measurement protocol, the before/after table
  (lab and synthetic field numbers separated), what did not help, and the user and business
  value section (faster product pages, fewer abandoned filters), stated without invented
  conversion uplift.
- README: new rows in "How it works", a "Performance record" section linking ADR 0008, and
  additions to "Honest limits": synthetic traffic, lab emulation, mock Store API, no CDN,
  in-memory telemetry.
- `.github/workflows/ci.yml`: run the shop Lighthouse config too.

## Definition of done

- `npm run check` and both Lighthouse configs green with unchanged thresholds (or thresholds
  changed only through ADR 0007).
- ADR 0008 holds a measured before/after row for every optimization in Step 5.
- Every number in the README and ADRs can be reproduced with a command named next to it.

## Interview evidence this produces

Stated here so the scope stays honest. After this work, the accurate claim is:
"Nuxt 4 with SSR, route caching and lazy hydration in a private project; I measured Core Web
Vitals in the lab and with synthetic field data, and can show which change moved which metric."
It is not production Nuxt experience, real-user data or a measured conversion uplift.
