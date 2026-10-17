# Storefront Performance Progress

## Status
Current step: WP-01 — Inventory status `nuxt-native`
Completed steps: WP-00
Next step: WP-01

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

## Completed Changes
- WP-00: setup + measurement only, no application code changes. `package.json` + `package-lock.json` modified by the two installs (uncommitted at time of writing; a human commits every diff).

## Measurements

| Date | Commit | Route | Command | Runs | LCP | CLS | TBT | INP p75 (RUM) | Initial JS (gz) | TTFB cold/warm | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-17 | e34d009 | /portal/stations | `npm run lighthouse` | 3, median | 1957 ms | 0 | 39 ms | n/a (WP-19) | n/a (per-route tooling WP-13) | 20 ms (warm, local) | lab; portal baseline, WP-00 |
| 2026-10-17 | e34d009 | /portal/sessions | `npm run lighthouse` | 3, median | 1967 ms | 0 | 57 ms | n/a (WP-19) | n/a (per-route tooling WP-13) | 13 ms (warm, local) | lab; portal baseline, WP-00 |
| 2026-10-17 | e34d009 | /portal/invoices | `npm run lighthouse` | 3, median | 1956 ms | 0 | 34 ms | n/a (WP-19) | n/a (per-route tooling WP-13) | 12 ms (warm, local) | lab; portal baseline, WP-00 |
| 2026-10-17 | e34d009 | /portal/invoices/inv-0042/dispute | `npm run lighthouse` | 3, median | 2106 ms | 0 | 30 ms | n/a (WP-19) | n/a (per-route tooling WP-13) | 11 ms (warm, local) | lab; portal baseline, WP-00 |

Notes: medians from `.lighthouseci/` reports of the 2026-10-17 run; TTFB is the `server-response-time` audit on the local warm server (no cold/warm split yet); all numbers lab (mobile emulation, simulated throttling).

## Open questions
- `package.json` / `package-lock.json` (the two WP-00 installs) are still uncommitted on `feat/storefront-performance` — to be committed by a human before WP-01 starts.
