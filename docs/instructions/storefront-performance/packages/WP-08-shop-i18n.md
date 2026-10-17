# WP-08 — Shop strings in both catalogues

**Depends on:** WP-00.

## Goal

All strings for WP-09 to WP-12 exist in `de.json` and `en.json` before the pages are built, so
page work packages do not have to edit two large JSON files each time.

## Read

- `i18n/locales/de.json` (top-level keys only: `nav`, `login`, `stations`, …; read ~40 lines)
- `tests/unit/i18n-catalogues.test.ts` (first 25 lines)

## Add a top-level `shop` block to both files

German is the source; English the translation. Keys (extend if a page needs more later):

```
shop.title, shop.cart, shop.cartCount ("{n} Artikel"), shop.categories.wallboxes,
shop.categories.accessories, shop.listing.heading, shop.listing.caption,
shop.listing.shown ("{n} Produkte angezeigt"), shop.listing.empty, shop.listing.loadError,
shop.filter.heading, shop.filter.minPower, shop.filter.connector, shop.filter.connectorAll,
shop.filter.connectorType.type2, .ccs, .card, shop.sort.label, shop.sort.priceAsc,
shop.sort.priceDesc, shop.sort.nameAsc, shop.pagination.label, shop.pagination.prev,
shop.pagination.next, shop.pagination.page ("Seite {n} von {total}"),
shop.product.price, shop.product.inStock, shop.product.outOfStock, shop.product.addToCart,
shop.product.added ("Zum Warenkorb hinzugefügt"), shop.product.specs, shop.product.maxPower,
shop.product.connector, shop.product.notFound, shop.cartPage.heading, shop.cartPage.empty,
shop.cartPage.remove, shop.cartPage.total, shop.cartPage.quantity, shop.cartPage.noCheckout
("Demo: kein Checkout"), shop.breadcrumb.label, shop.breadcrumb.home
```

Stock status must be stated in text (not colour alone), hence `inStock`/`outOfStock`.

## Steps

1. Add the keys to both files. Keep existing key order; append the `shop` block at the end.
2. `npx vitest run tests/unit/i18n-catalogues.test.ts` → passes (key parity, no empty message).

## Files you may change

`i18n/locales/de.json`, `i18n/locales/en.json`.
