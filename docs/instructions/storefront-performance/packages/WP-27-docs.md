# WP-27 — Storefront ADR, README, wrap-up

**Depends on:** all previous WPs. Documentation only; every number comes from the progress log.

## Read

- `docs/progress/storefront-performance/progress_log.md` (whole file)
- `docs/adr/0007-public-shop-and-budgets.md`
- `README.md` sections "How it works", "Honest limits", "Design system and performance", "Roadmap"

## Write

1. `docs/adr/<next free number>-storefront-performance.md` (0008 went to fault normalisation on 2026-10-25):
   - Context: why measure before optimizing; lab vs synthetic field data.
   - Measurement protocol (summarize `measure.md`, link it).
   - **Before/after table**: one row per change (WP-20 to WP-25): metric, route, before, after,
     runs, noise level, kept or reverted. Lab and synthetic-RUM numbers in separate columns,
     each labelled.
   - What did not help, and why (from the reverted changes).
   - Caching decision and invalidation (WP-22), the CSRF exclusion for `/shop`.
   - Limits: synthetic traffic, emulated device, mock Store API, no CDN, in-memory telemetry,
     no `hreflang` under `no_prefix`.
   - User and business value, without invented conversion uplift.
2. ADR 0007: status → accepted; update its budget numbers to the final ones.
3. `README.md`:
   - "How it works": rows for `/shop/c/:category`, `/shop/:slug`, `/shop/cart`, `/api/shop/*`,
     `/api/vitals`, `/api/events` (public, demo telemetry).
   - New section "Performance record" (5–8 lines): link the storefront ADR, the headline before/after for
     LCP, INP p75, TBT and initial JS on the product page, with the commands that reproduce them.
   - "Honest limits": the limits listed above.
   - "Design system and performance": replace the sentence that Lighthouse was not re-run, now
     that it was (WP-00).
   - Decision records list: add the storefront ADR.
4. Progress log: Status "done, ready for human review".

## Files you may change

`docs/adr/<next free number>-storefront-performance.md` (new), `docs/adr/0007-public-shop-and-budgets.md`,
`README.md`, the progress log.

## Done when

`npm run check`, `npm run lighthouse`, `npm run lighthouse:shop` pass on the final state, and every
number in README and ADRs has a matching row in the progress log.
