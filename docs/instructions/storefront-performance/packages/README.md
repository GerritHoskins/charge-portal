# Storefront performance: work packages

The plan in `../instructions.md` split into 28 original packages; approved follow-up experiments
are indexed alongside them below. Each package is sized for a local model
with a **64K-token context**: it names the few files to read (with line limits), restates the
repo facts it needs (`context.md`), and ends with commands that prove it is done.

## How to run one package

Start a **fresh session per package** (no carry-over context). Prompt:

```text
You are working in C:\Users\Gerrit\job-search\charge-portal-nuxt.
Read, in this order:
1. AGENTS.md and docs/instructions/work-package-workflow.md
2. docs/instructions/storefront-performance/packages/context.md
3. docs/instructions/storefront-performance/packages/WP-NN-<name>.md
4. docs/progress/storefront-performance/progress_log.md (Status, Open questions, and relevant prerequisite handoffs only)
Do work package WP-NN and nothing else. Follow its "Read" list instead of searching the repo.
Verify prerequisites against this checkout. Tests first. Run the commands under "Done when"
and npm run check, inspect the diff, then record the handoff and mark Review in the progress log.
When blocked, stuck, or needing a second opinion, consult the configured Codex advisor
before escalating a technical issue to the user. Follow the shared workflow's bounded
consultation and unavailable-advisor fallback. Stop after this package; Done requires human review.
```

Rough context budget per package: ~4K for `context.md`, ~2–3K for the package, 5–15K for the
listed files, leaving room for test output and edits. If a session gets close to the limit,
stop, write the state into the progress log, and continue in a fresh session with the same package.

## Order and dependencies

This index is the backlog; execution status lives only in the progress log. Use Ready,
In progress, Review, Done, and Blocked as defined in `../../work-package-workflow.md`.
Unmet dependencies stay pending. Load only the selected package and prerequisite evidence.

| WP | Title | Depends on | Who | Type |
|---|---|---|---|---|
| 00 | [Preflight and portal baseline](WP-00-preflight.md) | — | **human** | setup, measure |
| 01 | [Inventory status `nuxt-native`](WP-01-inventory-status.md) | 00 | model | code + unit |
| 02 | [Catalogue contract](WP-02-catalog-contract.md) | 00 | model (+ human for API field check) | code + unit |
| 03 | [Stand-in catalogue data and images](WP-03-standin-catalog-data.md) | 02 | model | data + unit |
| 04 | [Stand-in `/store-api/*`](WP-04-standin-store-api.md) | 03 | model | code + unit + contract |
| 05 | [Public API allowlist](WP-05-public-api-allowlist.md) | 00 | model | security + unit + E2E |
| 06 | [BFF shop endpoints](WP-06-bff-shop-routes.md) | 02, 04, 05 | model | code + E2E |
| 07 | [Portal and shop layouts](WP-07-layouts.md) | 00 | model | refactor |
| 08 | [Shop i18n strings](WP-08-shop-i18n.md) | 00 | model | content |
| 09 | [Listing page (naive)](WP-09-listing-page.md) | 01, 06, 07, 08 | model | page + E2E |
| 10 | [Filters and sorting (naive)](WP-10-listing-filters.md) | 09 | model | page + E2E |
| 11 | [Product page (naive)](WP-11-product-page.md) | 09 | model | page + E2E |
| 12 | [Client-side cart](WP-12-cart.md) | 11 | model | code + unit + E2E |
| 13 | [Per-route JS budget](WP-13-per-route-budget.md) | 12 | model | tooling + unit |
| 14 | [ADR 0007](WP-14-adr-0007.md) | 13 | model, human review | docs |
| 15 | [Lighthouse for shop + lab baseline](WP-15-lighthouse-shop-baseline.md) | 12 | model | tooling, measure |
| 16 | [Vitals schema and p75 logic](WP-16-vitals-logic.md) | 05 | model | code + unit |
| 17 | [Vitals endpoint and plugin](WP-17-vitals-endpoint-plugin.md) | 16, 12 | model | code + E2E |
| 18 | [Funnel events](WP-18-funnel-events.md) | 17 | model | code + unit + E2E |
| 19 | [Synthetic RUM script + baseline](WP-19-rum-sample.md) | 17, 18 | model | tooling, measure |
| 20 | [Opt: images / LCP](WP-20-opt-images.md) | 15, 19 | model | optimize, measure |
| 21 | [Opt: CLS and fonts](WP-21-opt-cls-fonts.md) | 20 | model | optimize, measure |
| 22 | [Opt: route caching / TTFB](WP-22-opt-caching.md) | 07, 19 | model, human review | optimize, measure |
| 23 | [Opt: lazy hydration](WP-23-opt-lazy-hydration.md) | 20 | model | optimize, measure |
| 24 | [Opt: filter INP](WP-24-opt-filter-inp.md) | 19, 23 | model | optimize, measure |
| 25 | [Opt: payload + error gates + CI](WP-25-opt-payload-and-gates.md) | 20–24 | model | optimize, CI |
| 25a | [Experiment: precompiled translations](WP-25a-opt-i18n-bundle.md) | 20–24, retained 25 checkpoint | model, human review | optimize, measure |
| 25b | [Experiment: compact production translations](WP-25b-opt-production-i18n.md) | accepted 25a, retained 25 checkpoint | model, human review | optimize, measure |
| 25c | [Diagnose simulated LCP](WP-25c-lcp-diagnosis.md) | accepted 25b, retained 25 checkpoint | model, human review | diagnosis, measure |
| 25d | [Experiment: HTML gzip and startup telemetry](WP-25d-opt-compression-telemetry.md) | accepted 25c | model, human review | optimize, measure |
| 26 | [SEO basics](WP-26-seo.md) | 11 | model | code + unit + E2E |
| 27 | [Storefront ADR and README (optional)](WP-27-docs.md) | all | model, human review | optional docs |

Human scope decision, 2026-10-18: WP-27 may be omitted as optional if its prerequisites
are not clear at the final time-boxed WP-25 closeout. Execution status and the CI caveat
remain in the progress log; optional does not mean implemented or verified.

Suggested linear order: 00, 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17,
18, 19, 20, 21, 22, 23, 24, 25, 26, 27.

## Human checkpoints

Have a human review the diff after each package (`AGENTS.md`). Commit only when explicitly
authorized; review does not itself authorize committing. Look
closely at these, which are easy for a model to get subtly wrong:

- **WP-05** (allowlist): exact path matching; nothing private became public.
- **WP-07** (layouts): the portal behaves exactly as before.
- **WP-22** (caching): no user-specific content or cookie in a cached response.
- **Every measurement WP**: numbers come from the commands in `measure.md`, with run counts and
  noise stated; no number is "estimated".

## Shared files

- `context.md`: repo facts and rules, read first in every package.
- `measure.md`: the one measurement protocol all measuring packages use.
- `../../../progress/storefront-performance/progress_log.md`: status, decisions, measurements,
  open questions. It is the only memory between sessions.
