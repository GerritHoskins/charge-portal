# WP-17 — Vitals endpoint and browser plugin

**Depends on:** WP-16, WP-12. `web-vitals` installed in WP-00.

## Goal

Real interactions in the browser report LCP, INP, CLS, TTFB and FCP for shop pages to the BFF.

## Read

- `shared/contracts/vitals.ts`, `server/utils/vitals-store.ts` (exports only)
- `server/utils/rate-limit.ts` (exports and how `check`/`fail` are used; ~40 lines)
- `node_modules/web-vitals/README.md`: only the sections on the attribution build and
  `onINP`/`onLCP` (search for those headings; read ≤ 120 lines). Use what the installed version
  documents, not memory.

## Server

- `server/api/vitals.post.ts`: accepts `text/plain` or `application/json` bodies (sendBeacon
  sends text/plain by default when given a string), max body 2 KB, parses with
  `vitalsBeaconSchema` (invalid → 400), rate-limits per client IP (reuse `createRateLimiter`;
  respect `runtimeConfig.trustProxy` like the login throttle does), adds to a module-level
  store, returns 204.
- `server/api/vitals/summary.get.ts`: returns `store.summary()`.
- Both paths are already public via WP-05.

## Client

`app/plugins/vitals.client.ts`:
- Only active on routes starting with `/shop`.
- Import from the attribution build; register `onLCP`, `onINP`, `onCLS`, `onTTFB`, `onFCP`.
- Send each metric with `navigator.sendBeacon('/api/vitals', JSON.stringify(payload))`;
  fall back to `fetch(..., { keepalive: true })`. Payload: route (`useRoute().path` at report time),
  name, value, rating, id, navigationType, `attribution.target` = LCP element selector or INP
  interaction target (truncate to 200 chars).
- No cookies, no user id, no third parties. Add a comment saying this is demo telemetry.

## Tests first

- E2E `tests/e2e/shop-vitals.spec.ts` (project `shop`): open a product page, click/press the add
  button (creates an INP entry), then trigger `visibilitychange` by navigating away
  (`page.goto('about:blank')`), then `GET /api/vitals/summary` contains `/shop/:slug` with
  at least LCP and CLS counts ≥ 1. INP may need a real interaction plus page hide; if it is
  not reported reliably in headless Chromium, assert LCP/CLS only and record that limitation.
- A request with an invalid body → 400; a portal route value → 400.

## Files you may change

`server/api/vitals.post.ts` (new), `server/api/vitals/summary.get.ts` (new),
`app/plugins/vitals.client.ts` (new), `tests/e2e/shop-vitals.spec.ts` (new).

## Done when

`npx playwright test --project=shop`, lint, typecheck, `npm run budget` (record the per-route
JS increase from `web-vitals`) pass.
