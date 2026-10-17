# WP-06 — BFF shop endpoints

**Depends on:** WP-02, WP-04, WP-05.

## Goal

Pages talk only to the BFF. The BFF calls the stand-in's `/store-api/*`, parses the raw shape and
returns the flat shop shape.

## Read

- `server/utils/legacy.ts` (whole file, ~45 lines)
- `server/api/stations.get.ts` (pattern, 3 lines)
- `shared/contracts/catalog.ts` (exports only)
- `nuxt.config.ts` (`runtimeConfig` block)

## Design

- `fetchLegacy` forwards the browser cookie. Shop calls must **not** forward cookies (they are
  public and later cached, WP-22) and must send `sw-access-key`. Add an option to
  `fetchLegacy`: `{ forwardCookie?: boolean (default true), headers?: Record<string,string> }`.
  Do not create a second fetch helper: one place where legacy responses enter the app.
- `runtimeConfig.storeApiAccessKey: 'demo-access-key'` (server-only, overridable via
  `NUXT_STORE_API_ACCESS_KEY`).
- Endpoints:
  - `GET /api/shop/listing/[category]?page&limit&order&minPower&connector` → validates the
    query with a zod schema (`shopListingQuerySchema` in `shared/contracts/catalog.ts`;
    invalid → 400), calls `POST /store-api/product-listing/{category}`, returns
    `toShopListing(...)`.
  - `GET /api/shop/products/[slug]` → resolves the product (simplest: the stand-in also accepts
    the slug as `productId`; if you change the stand-in for this, note it), returns
    `toShopProduct(...)`. 404 passes through.

## Steps (tests first)

1. Unit tests for `shopListingQuerySchema` in `tests/unit/catalog-contract.test.ts`
   (coercion of numbers from strings, bounds, unknown `order` rejected).
2. E2E in `tests/e2e/shop-public.spec.ts` (logged out):
   listing returns 24 items with integer `priceCents`; `?connector=ccs` narrows the result;
   `?order=bogus` → 400; unknown slug → 404; response sets no cookie (`set-cookie` absent).
3. Run → fail. Implement. Run → pass.

## Files you may change

`server/utils/legacy.ts`, `nuxt.config.ts`, `shared/contracts/catalog.ts`,
`server/api/shop/listing/[category].get.ts` (new), `server/api/shop/products/[slug].get.ts` (new),
`tests/unit/catalog-contract.test.ts`, `tests/e2e/shop-public.spec.ts`,
`legacy/server.mjs` (only if the slug lookup needs it).

## Done when

Unit + `npx playwright test --project=shop` + `npx playwright test --project=app` (unchanged
portal behaviour after the `fetchLegacy` change) + lint + typecheck pass.
