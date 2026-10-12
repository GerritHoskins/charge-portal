# ADR 0005: Per-route rollout, rollback and migration progress

**Status:** accepted (demo). Updates ADR 0001 decision 1: the proxy table in `routeRules` is empty now, and
"rolling back is re-adding the line" is replaced by a runtime switch.

## Context

ADR 0001 made migration reversible by editing `routeRules`, which means a code change and a deploy. That is the
slowest possible rollback exactly when it is needed (a migrated billing page misbehaves in production). The role of
this repo is to show how delivery risk is owned, so the risk controls have to be as concrete as the migration itself.

## Decision

1. **Runtime rollout switch, no deploy.** `NUXT_ROLLOUT="/portal/invoices=0,/portal/sessions=50"` gives, per route prefix,
   the share of users served by Nuxt. `0` is the kill switch (everybody back on legacy), `100` or unlisted is fully
   migrated. Longest prefix wins. Parsing and bucketing are pure functions (`server/utils/rollout.ts`, unit tested);
   invalid entries are ignored rather than half-applied.
2. **Sticky per user.** The bucket is a hash of the session cookie, so one user does not flip between variants on
   every request. Anonymous requests share one bucket; they are redirected to login either way.
3. **Server and client agree.** `server/middleware/00-rollout.ts` proxies document loads of a rolled-back route to
   legacy (before the auth guard, so legacy performs its own login redirect) and sets `x-served-by: nuxt|legacy`.
   Nuxt's client router would otherwise render the Nuxt page on a `NuxtLink` click and ignore the rollback, so the
   user's rolled-back prefixes travel in the payload and `app/middleware/rollout.global.ts` turns such navigations
   into full page loads.
4. **Legacy keeps working fallback pages** (`legacy/pages.mjs`, and the same in the PHP twin) for stations, sessions and
   invoices. A rollback target that does not exist is not a rollback. Sub-paths without a legacy equivalent
   (the dispute form) answer 404 while rolled back; that is the accepted cost of a rollback.
5. **Progress is measured, not assumed.** `docs/migration-routes.json` lists every route with its owner, ADR and
   implementing files; `npm run migration:status` prints "migrated X of Y" and `-- --check` (part of `npm run check`)
   fails if a page exists that the inventory does not know about or a listed file is gone.
6. **Contracts are checked against the real backend.** `tests/e2e/contract.spec.ts` runs the shared zod schemas against
   live legacy responses and can target another implementation with `E2E_LEGACY_ORIGIN` (the PHP twin, `docker-compose.yml`).

## User and business value

A defect found after release costs minutes of exposure instead of a deploy cycle, and a staged rollout limits it to a
share of users first. Billing-related routes (invoices) are exactly where this matters. The progress number gives
Product a plain answer to "how far along is the migration".

## Consequences

- Rolled-back users get legacy markup and lose Nuxt-only features (English UI, the dispute form) until the switch is
  reverted. The switch is per prefix, so unaffected routes stay migrated.
- `NUXT_ROLLOUT` is read per request from runtime config; changing it needs a restart of the Nuxt process (an env
  change), not a build. A live flag service would remove the restart and is not modelled.
- Bucketing on the session cookie means a user who logs in again may land in the other bucket.
- Metrics are only the response header; there is no dashboard, error-rate comparison or automatic rollback.
- Shared layout chrome (navigation, header) between legacy and Nuxt pages is still **not** modelled: legacy pages have
  their own dated header, which is also what a real user would see in a rolled-back state.
