# WP-00 — Preflight and portal baseline (human)

**Depends on:** nothing. **Done by:** you, not the local model (installs and branch).

## Steps

1. `git switch -c feat/storefront-performance` (from the branch you want to build on).
2. Install the two dependencies the plan needs, after checking each package's Nuxt 4
   compatibility note:
   - `npm install @nuxt/image`
   - `npm install web-vitals`
   Do **not** register `@nuxt/image` in `nuxt.config.ts` yet; WP-20 does that, so the baseline
   in WP-15 is measured without it.
3. `npm run check`. It must be green before any work package starts. Fix or note failures.
4. `npm run lighthouse` (portal routes, logged in). The README says this has not been re-run
   since the design-system and i18n changes.
5. In `docs/progress/storefront-performance/progress_log.md`:
   - Status → current WP-01.
   - Measurements: one row per portal route from step 4 (note "portal baseline, WP-00").
   - Note the installed versions of `nuxt`, `@nuxt/image`, `web-vitals`.

## Done when

`npm run check` is green on the new branch and the portal baseline is recorded.
