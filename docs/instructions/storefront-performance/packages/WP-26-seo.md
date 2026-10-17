# WP-26 — SEO basics for the public pages

**Depends on:** WP-11. Independent of the optimization WPs.

## Goal

Meta tags, canonical URLs, structured data and language alternates on the shop pages, tested.

## Read

- `nuxt.config.ts` (`i18n` block) and `docs/adr/0006-i18n.md` (Decision section only, ≤ 40 lines)
- The two shop pages (`useHead`/`useFetch` parts)
- Nuxt docs for `useSeoMeta` and `useHead` script entries (≤ 80 lines)

## Steps (tests first)

1. Pure builders in `shared/seo.ts` (unit-testable, covered by the floor):
   `productJsonLd(product, url)` → schema.org `Product` with `offers` (`price` as a decimal string
   from cents, `priceCurrency: 'EUR'`, `availability` `https://schema.org/InStock|OutOfStock`),
   `breadcrumbJsonLd(items)` → `BreadcrumbList`.
   `tests/unit/seo.test.ts`: exact objects for a fixture, cents → `"19.99"`, out of stock mapping.
2. Pages: `useSeoMeta` (title, description from product text truncated to ~155 chars, `ogTitle`,
   `ogImage` = largest image, `ogType`), canonical link (filtered listings canonicalize to the
   unfiltered category URL; page 2+ canonicalizes to itself; write the rule down), JSON-LD via
   `useHead({ script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(...) }] })`.
   Make sure the JSON is escaped safely for a `<script>` tag (`<` → `<`); test that too.
3. Language alternates: with `strategy: 'no_prefix'` there are no per-language URLs, so
   `hreflang` alternates cannot point anywhere useful. Do not fake them; write this limitation
   into the progress log for ADR 0008 (and what a prefix strategy would change).
4. E2E `tests/e2e/shop-seo.spec.ts`: SSR HTML (via `page.request.get`) contains the title,
   meta description, canonical, and a parsable JSON-LD `Product` with the right price.
5. Optional, human: run one product URL through Google's Rich Results Test (needs a public URL;
   skip and note "not performed" otherwise).

## Files you may change

`shared/seo.ts` (new), `tests/unit/seo.test.ts` (new), the shop pages, `tests/e2e/shop-seo.spec.ts` (new).

## Done when

Unit, coverage, `npx playwright test --project=shop`, Lighthouse SEO category for shop routes
(`npm run lighthouse:shop`) recorded.
