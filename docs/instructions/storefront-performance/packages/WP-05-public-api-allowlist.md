# WP-05 — Public API allowlist in the auth guard

**Depends on:** WP-00.

## Goal

`server/middleware/auth.ts` guards every `/api/*` and `/portal*` path. The shop needs public
endpoints (`/api/shop/*`, `/api/vitals`, `/api/events/*`) and public pages (`/shop*`, which the
guard already ignores). Add an **explicit, tested allowlist**: security-relevant, so keep it
small and exact.

## Read

- `server/middleware/auth.ts` (whole file, ~25 lines)
- `playwright.config.ts` (projects block)

## Design

- A pure function `isPublicApi(pathname: string): boolean` in a new
  `server/utils/public-api.ts`. Match by prefix with a trailing slash or exact path, so
  `/api/shopping` or `/api/shop-admin` are **not** public:
  `/api/shop/` (prefix), `/api/vitals` (exact), `/api/vitals/summary` (exact),
  `/api/events` (exact), `/api/events/funnel` (exact).
- `auth.ts` returns early when `isPublicApi(pathname)`.
- Add `server/utils/public-api.ts` to the coverage `include` list in `vitest.config.ts`
  (it is framework-free, like `rate-limit.ts`).

## Steps (tests first)

1. `tests/unit/public-api.test.ts`: true for the listed paths and `/api/shop/products/x`;
   false for `/api/me`, `/api/stations`, `/api/shopping`, `/api/shop` (no slash; decide and
   document), `/api/vitals/../me`, `/API/shop/x`, `/api/events/funnel/x`.
2. Run → fails. Implement. Run → passes.
3. Add a Playwright project `shop` (logged out, no `storageState`) with
   `testMatch: /shop.*\.spec\.ts/`, and `tests/e2e/shop-public.spec.ts` with one test:
   `GET /api/me` without cookie → 401 (still guarded). The shop endpoints do not exist yet;
   WP-06 adds their tests to this file.

## Files you may change

`server/utils/public-api.ts` (new), `server/middleware/auth.ts`, `vitest.config.ts`,
`tests/unit/public-api.test.ts` (new), `playwright.config.ts`, `tests/e2e/shop-public.spec.ts` (new).

## Done when

Unit test, `npx playwright test --project=shop`, `npm run test:coverage`, lint and typecheck pass.
