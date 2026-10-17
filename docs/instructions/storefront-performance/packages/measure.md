# Measurement protocol (used by WP-15, WP-19 and WP-20 to WP-25)

Numbers are only comparable when they are taken the same way. Use exactly this protocol.

## Lab (Lighthouse)

1. Stop any dev server on ports 3000 and 8080 (`scripts/lighthouse.mjs` refuses to measure a stale server).
2. `npm run build`
3. `npm run lighthouse:shop` (added in WP-15). It runs Lighthouse CI on the public shop routes,
   5 runs per route, median run, default mobile emulation with simulated throttling.
4. Read the median values from `.lighthouseci/` (the JSON reports) for each route:
   LCP (ms), CLS, TBT (ms), Speed Index (ms), total byte weight (KB).
5. Do not run other heavy programs during a measurement.

## Synthetic field data (RUM)

1. With the production build running (`node .output/server/index.mjs` plus `npm run legacy`),
   run `node scripts/rum-sample.mjs --runs 30` (added in WP-19).
2. Read `GET /api/vitals/summary` and `GET /api/events/funnel`.
3. Record p75 LCP, INP, CLS per route. Label every value "synthetic RUM": the traffic is a
   script with CPU throttling, not real users.

## Per-route JS

`npm run budget` (after WP-13 it prints initial gzipped JS per route). Record the shop routes.

## TTFB (WP-22 only)

`curl -s -o /dev/null -w "%{time_starttransfer}\n" http://localhost:3000/shop` five times,
first request after a server restart = cold, the median of the next four = warm.

## Recording

Add one row per route to the **Measurements** table in
`docs/progress/storefront-performance/progress_log.md`:
date, `git rev-parse --short HEAD` (plus "dirty" if uncommitted), route, command, runs,
LCP, CLS, TBT, INP p75, initial JS, TTFB cold/warm, note (which WP, before/after).

An optimization WP takes the "before" numbers from the previous row for that route; if there
is none or the code changed since, measure "before" first.

If a change does not improve its target metric by more than run-to-run noise (compare the spread
of the 5 Lighthouse runs), say so in the note. A change that does not help is reverted, and the
reversal is recorded too.
