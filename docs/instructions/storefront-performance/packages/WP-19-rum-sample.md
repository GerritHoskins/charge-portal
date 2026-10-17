# WP-19 — Repeatable synthetic field data + baseline

**Depends on:** WP-17, WP-18.

## Goal

A script that drives the funnel many times with CPU throttling against the production build,
so p75 field-style numbers (especially INP, which Lighthouse cannot measure) are repeatable.

## Read

- `scripts/lighthouse.mjs` lines 1–40 (start/stop/wait pattern)
- `measure.md`

## Script `scripts/rum-sample.mjs`

- Args: `--runs N` (default 30), `--base http://localhost:3000`, `--cpu 4` (slowdown factor).
- Starts legacy + `.output/server/index.mjs` like `scripts/lighthouse.mjs` (refuse if ports are busy),
  unless `--no-start` is given.
- Per run, a **fresh** Playwright browser context (mobile viewport 390×844), CPU throttling via a
  CDP session (`Emulation.setCPUThrottlingRate`), then:
  open `/shop/c/wallboxes` → change the connector filter → change sort → open the 3rd product →
  add to cart → open `/shop/cart` → `about:blank` (flushes the beacons). Small random pauses are
  **not** allowed (keep runs deterministic); use fixed waits on `data-hydrated` and visible elements.
- At the end, fetch `/api/vitals/summary` and `/api/events/funnel` and print a compact table;
  `--json out.json` writes them to a file.
- `package.json`: `"rum:sample": "node scripts/rum-sample.mjs"`.

No unit test is required for the driver itself; keep logic minimal. If you extract table
formatting into `scripts/lib/`, test it (coverage floor applies there).

## Run

Follow `measure.md`: `npm run build`, then `npm run rum:sample -- --runs 30`.
Record p75 LCP, INP, CLS per route with note "WP-19 synthetic RUM baseline", plus the funnel rates.

## Files you may change

`scripts/rum-sample.mjs` (new), `package.json`, optionally `scripts/lib/rum-table.mjs` + test.

## Done when

Two consecutive runs of 30 give p75 values within a spread you can state (record both runs);
this spread is the noise level the optimization WPs compare against.
