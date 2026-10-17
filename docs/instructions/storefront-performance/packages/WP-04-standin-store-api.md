# WP-04 — Stand-in endpoints `/store-api/*`

**Depends on:** WP-03.

## Goal

The legacy stand-in serves the catalogue publicly (no session), like a Store API does with an
access key.

## Read

- `legacy/server.mjs` lines 1–40 (helpers `json`, `readBody`) and lines 95–126 (routing tail;
  find the comment `// Everything below requires a session.`)
- `tests/e2e/contract.spec.ts` lines 1–40 (pattern)
- `shared/contracts/catalog.ts` (raw schema names only)

## Behaviour

Add **before** the session-required block in `legacy/server.mjs`:

- `POST /store-api/product-listing/{categoryId}` with JSON body
  `{ page?, limit?, order?, 'min-power'?, connector? }`:
  filters by `maxPowerKw >= min-power` and `connectorType`, sorts by `price-asc | price-desc |
  name-asc` (default `name-asc`), paginates (`limit` default 24, max 48), returns the listing shape.
  Unknown category → 404. Invalid JSON → 400.
- `POST /store-api/product/{productId}` → `{ product }` or 404.
- Require header `sw-access-key: demo-access-key` (synthetic, mirrors Shopware's sales-channel
  key); missing or wrong → 401. Put the key in `runtimeConfig` later (WP-06), not in pages.
- Optional, for WP-22: an env `LEGACY_CATALOG_DELAY_MS` that delays these responses, so the
  effect of caching is visible in TTFB. Default 0.

Keep the routing code small: put filter/sort/paginate in an exported pure function in
`legacy/catalog.mjs` and unit-test it there (extend `tests/unit/legacy-catalog.test.ts`).

## Steps (tests first)

1. Unit tests for the pure `queryListing(categoryId, params)` in `tests/unit/legacy-catalog.test.ts`:
   filter, each sort, pagination bounds, unknown category.
2. Contract cases in `tests/e2e/contract.spec.ts`: listing and detail parsed with the raw
   schemas from `shared/contracts/catalog.ts`; missing access key → 401. These requests need
   no login cookie.
3. Run both → fail. Implement. Run again.

## Files you may change

`legacy/server.mjs`, `legacy/catalog.mjs`, `tests/unit/legacy-catalog.test.ts`,
`tests/e2e/contract.spec.ts`.

## Done when

`npx vitest run tests/unit/legacy-catalog.test.ts` and `npx playwright test --project=contract`
pass. Note: `legacy-php/` is not updated (it is a never-executed twin); write that into Open questions.
