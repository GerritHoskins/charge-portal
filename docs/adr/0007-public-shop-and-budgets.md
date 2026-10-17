# ADR 0007: Public shop area, route inventory, and performance budgets

**Status:** proposed

## Context

The portal demo originally exercised only authenticated, user-specific pages. That hides
important storefront concerns: cacheable server-rendered HTML, image-driven LCP, hydration
cost, search-engine discoverability, and the effect of route-specific code splitting. A
public shop area makes those constraints visible without changing the portal's role as a
synthetic migration demonstration.

The catalogue is synthetic. It follows a deliberately narrow subset of the Shopware Store
API response shape behind the repository's existing contract pattern (WP-02, WP-04, and
WP-06), but it is not a Shopware integration. The `sw-access-key` value is synthetic and is
used only by the local stand-in and BFF.

## Decision

1. **Expose the shop as a public SSR area.** Public listing, product, and cart pages let the
   demo measure cacheable HTML, image-heavy rendering, hydration, and SEO behavior that the
   authenticated portal does not expose.
2. **Keep public API access narrowly allowlisted.** The exact public paths are `/api/vitals`,
   `/api/vitals/summary`, `/api/events`, and `/api/events/funnel`; catalogue endpoints use
   the `/api/shop/` prefix. The trailing slash is deliberate: `/api/shop` and similarly
   named paths remain guarded. All other `/api/` paths and every `/portal` path continue to
   require the legacy-owned session.
3. **Use a separate shop layout.** Public pages do not perform a session lookup, issue a
   CSRF token, or render user-specific HTML. The portal layout retains those responsibilities.
   This separation is a precondition for caching public HTML in WP-22 because the cached
   response cannot depend on a user's session.
4. **Represent already-native routes as `nuxt-native`.** These routes require an ADR and
   implementing files in the route inventory, but they are excluded from migration progress:
   they were created in Nuxt and were never legacy routes waiting to be migrated.
5. **Gate initial JavaScript per route.** Summing every emitted client chunk was misleading
   because no first visit loads all route chunks. The former aggregate remains informational,
   while the hard gate opens each required route in a fresh browser context, authenticates
   portal contexts with the demo session, waits for hydration and initial network idle,
   collects same-origin `/_nuxt/*.js` responses, reads those emitted files from
   `.output/public`, and gzips them locally. The 2026-10-17 aggregate was **122.9 KB gz / 120
   KB** and is informational only. For the 2026-10-17 baseline, portal thresholds are the
   measured value +5%, rounded upward to 0.1 KB; shop thresholds are the measured value +10%,
   rounded upward to 0.1 KB and remain provisional until the optimization packages tighten
   them.

The route measurements and hard budgets copied from the 2026-10-17 WP-13 baseline are:

| Route | Initial JavaScript (gz) | Hard budget | Budget phase |
|---|---:|---:|---|
| `/portal/stations` | 113.795 KB | 119.5 KB | WP-13 baseline |
| `/portal/sessions` | 113.795 KB | 119.5 KB | WP-13 baseline |
| `/portal/invoices` | 116.556 KB | 122.4 KB | WP-13 baseline |
| `/portal/invoices/inv-0042/dispute` | 116.556 KB | 122.4 KB | WP-13 baseline |
| `/shop/c/wallboxes` | 114.527 KB | 126.0 KB | provisional WP-13 baseline |
| `/shop/wallbox-home-7-4` | 116.307 KB | 128.0 KB | provisional WP-13 baseline |
| `/shop/cart` | 111.800 KB | 123.0 KB | provisional WP-13 baseline |

## Consequences

- The application maintains separate portal and shop layouts, with intentionally different
  session and CSRF behavior.
- Performance tooling keeps an informational aggregate report alongside the hard per-route
  gate. Route thresholds are configuration reviewed in source control, and provisional shop
  thresholds are tightened by later optimization work rather than raised silently.
- The cart remains client-side only; there is no server cart or checkout.
- CDN behavior is not implemented. WP-22 can add caching only because the public layout does
  not emit user-specific HTML.
- `legacy-php/` is not updated; it remains the deliberately non-executed twin of the Node
  stand-in.

## User and business value

The public area gives reviewers a realistic place to see catalogue discovery, product
details, cart interactions, accessibility, SEO, and performance trade-offs without exposing
operator data. Per-route budgets identify regressions on the pages users actually visit,
while the public/private boundary keeps authenticated portal behavior isolated and prepares
the storefront for safe caching work.
