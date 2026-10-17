# WP-07 — Split the app shell: portal layout and shop layout

**Depends on:** WP-00. Can run before or after WP-06.

## Goal

`app/app.vue` renders the portal header and calls `useFetch('/api/me')` on **every** page.
A public shop page must not: it would ask legacy for a session on every request (slower TTFB),
render user-specific HTML (which must never be cached and shared, see WP-22), and show portal
navigation to anonymous visitors.

Move the portal shell into `app/layouts/default.vue` and add `app/layouts/shop.vue`.
This is a refactor of working code: the existing E2E suites are the safety net. Do not change
portal behaviour.

## Read

- `app/app.vue` (whole file)
- `app/middleware/rollout.global.ts` (only to check it does not depend on `app.vue` internals)

## Steps

1. Run `npx playwright test --project=app --project=auth --project=rollout` first and record the
   result (baseline; all must pass).
2. Move header, `/api/me` fetch, CSRF and rollout `useState` from `app.vue` into
   `app/layouts/default.vue` (with `<slot />` inside `<main id="main">`). Keep in `app.vue`:
   skip link, `useHead` (lang, data-tenant, titleTemplate), the `data-hydrated` `onMounted`,
   and `<NuxtLayout><NuxtPage /></NuxtLayout>`. Keep the skip link target `#main` working in
   both layouts.
3. Create `app/layouts/shop.vue`: a simple header (shop name as text, a link "Warenkorb" with
   the item count placeholder `0`, the language switcher reused from the default layout; if
   reusing means copying, extract a small `AppLocaleSwitcher.vue` component), `<main id="main">`.
   No `/api/me` call, no CSRF token.
4. Run the same three projects again → must pass unchanged. Then `npm run check`.

No new test is needed for the refactor itself; WP-09 adds the shop E2E tests that use the
shop layout (`definePageMeta({ layout: 'shop' })`).

## Files you may change

`app/app.vue`, `app/layouts/default.vue` (new), `app/layouts/shop.vue` (new),
`app/components/AppLocaleSwitcher.vue` (new, optional).

## Stop if

Any portal E2E test fails after the move and the cause is not obvious within two attempts:
revert your changes to `app.vue` and record the failure.
