# WP-02 — Catalogue contract (Store-API-shaped)

**Depends on:** WP-00.

## Goal

zod schemas for a product listing and a product detail, shaped like a **subset** of the
Shopware Store API, so the shop reads data the way a Shopware storefront would. The stand-in
will serve synthetic data in this shape (WP-03/04). It does not claim to be Shopware.

## Read

- `shared/contracts/station.ts` (pattern)
- `tests/unit/station-contract.test.ts` (pattern)

## Before writing code (human or model with web access)

Look up the current Shopware Store API reference for `POST /store-api/product-listing/{categoryId}`
and `POST /store-api/product/{productId}`. Copy the field **names** you use from it and put the
reference URL plus the date you read it in the header comment of the schema file. If you have no
web access, use the field list below and write "field names not verified against the reference"
in the header comment and in Open questions.

Fields to model (only these; the pages need nothing else):

- Product: `id`, `productNumber`, `translated.name`, `translated.description` (plain text),
  `calculatedPrice.unitPrice` → **convert to integer cents at the BFF**, see below,
  `cover.media.url`, `cover.media.alt`, `cover.media.metaData.width/height`,
  `availableStock`, `available`, `seoUrls[0].seoPathInfo`, plus two synthetic custom fields
  `customFields.maxPowerKw` and `customFields.connectorType` (`'type2' | 'ccs' | 'card'`).
- Listing: `elements: Product[]`, `total`, `page`, `limit`, `sorting`, and `aggregations` with
  the min/max of `maxPowerKw` and the counts per `connectorType` (simplify the Shopware
  aggregation shape and say so in a comment).

## Two layers, on purpose

1. `storeApiProductSchema` / `storeApiListingSchema`: the raw shape coming from the stand-in.
2. `shopProductSchema` / `shopListingSchema`: what the BFF returns to pages: flat fields,
   `priceCents: number().int()`, `slug`, `image: { url, alt, width, height }`, `maxPowerKw`,
   `connectorType`, `inStock: boolean`.
3. A pure function `toShopProduct(raw)` (and `toShopListing`) in the same file that maps 1 → 2.
   Price: `Math.round(unitPrice * 100)`; reject `NaN`/negative via the schema.

## Steps (tests first)

1. Create `tests/unit/catalog-contract.test.ts` with:
   - a valid raw product fixture and a valid listing fixture → parse OK, mapping produces the
     expected flat object (assert `priceCents`, `slug`, `image`);
   - invalid cases: missing `cover`, `unitPrice` as string, unknown `connectorType`,
     negative stock, `elements` not an array;
   - mapping: `19.99` → `1999`, `0.1 + 0.2`-style float → rounded correctly.
2. Run it → fails (module missing).
3. Create `shared/contracts/catalog.ts` with both schema layers, mapping functions and
   `z.infer` types (`ShopProduct`, `ShopListing`).
4. Run the test file, then `npm run test:coverage` (the 90% floor covers `shared/**`).

## Files you may change

`shared/contracts/catalog.ts` (new), `tests/unit/catalog-contract.test.ts` (new).

### Approved reopened extension (2026-10-18)

The accepted baseline omitted the translated text, media metadata, typed specifications,
sorting and aggregation fields above. The human reopened these requirements and explicitly
approved the bounded producer/consumer repair, testing, commit and push.

- Preserve all 48 product identities, names, URLs, prices, stock and images. Keep the public
  `type2 | ccs | card` filter choices and their result sets; do not add a filter UI.
- Model existing connectors honestly as `type1 | type2 | ccs | card | cee | schuko | mixed`.
  Use explicit null for non-applicable power/connector values, not fabricated zero/Type 2.
  The synthetic raw custom fields use these codes; the existing BFF `customFields` legacy
  power/label compatibility remains available, alongside the typed flat product fields.
- Require translated name/plain description, media alt/positive dimensions, current sorting
  and simplified typed aggregations (power min/max, both null when absent; connector counts
  over the filtered full result before pagination). These custom fields and aggregation
  conventions are synthetic, not an assertion of the official Shopware aggregation shape.
- Render actual plain product descriptions and image dimensions. Keep explicit page data
  projections limited to rendered fields; omit raw custom fields, translations, stock,
  product numbers and listing metadata from page payloads when not rendered.
- Additional editable files: `legacy/catalog.mjs`, `tests/unit/legacy-catalog.test.ts`,
  `server/api/shop/listing/[category].get.ts`, both shop product/category pages,
  `app/components/shop/ShopProductCard.vue` and its `.stories.ts`, `shared/seo.ts`,
  `tests/unit/seo.test.ts`, existing `shop-listing`, `shop-product` and `shop-public` E2E
  specs, `i18n/locales/de.json` and `en.json`, this package and the authoritative progress log.
  The log records the exact paths. Any additional file still needs a scope decision.
- No dependencies, lockfiles, thresholds, route rules, WP-25 optimization or WP-27 work.
  Required checks include semantic failing-first regressions, full `npm run check`,
  production correctness and the unchanged performance gates. Review still needs human acceptance.

## Done when

The new tests pass, `npm run test:coverage`, `npm run lint`, `npm run typecheck` pass.
Progress log updated (including whether field names were verified).
