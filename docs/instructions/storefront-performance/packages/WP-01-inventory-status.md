# WP-01 — Route inventory: status `nuxt-native`

**Depends on:** WP-00.

## Goal

The route inventory only knows `migrated | legacy | stays-legacy`. Shop routes never existed in
legacy, so they need a status that is listed and file-checked like `migrated`, but does not count
toward the migration percentage.

## Read

- `scripts/lib/migration-routes.mjs` (whole file, ~30 lines)
- `tests/unit/migration-routes.test.ts` (whole file)
- `docs/migration-routes.json` (only the `$comment` line)

## Steps (tests first)

1. In `tests/unit/migration-routes.test.ts` add failing tests:
   - `summarize` ignores `nuxt-native` routes in `migrated/remaining/total/percent` and returns
     a new count `native`.
   - `validate` accepts a `nuxt-native` route with `adr` and existing `files`.
   - `validate` reports a missing `adr`, missing `files` and a non-existent file for
     `nuxt-native`, with the same messages as for `migrated` (adapt the wording to
     "migrated and nuxt-native routes must …" if you change the text, and update existing
     expectations accordingly).
   - Existing `summarize` expectations get `native: 0`.
2. Run `npx vitest run tests/unit/migration-routes.test.ts` → must fail.
3. Implement in `scripts/lib/migration-routes.mjs`: add `'nuxt-native'` to `STATUSES`, apply the
   `migrated` checks to both statuses, add `native` to `summarize`.
4. In `docs/migration-routes.json` extend the `$comment` text with
   `nuxt-native (new in Nuxt, never in legacy; not counted as migration progress)`.
   Do not add routes yet.
5. Optional: `scripts/migration-status.mjs` prints `, N Nuxt-native routes` when `native > 0`
   (one line change).

## Files you may change

`scripts/lib/migration-routes.mjs`, `tests/unit/migration-routes.test.ts`,
`docs/migration-routes.json`, `scripts/migration-status.mjs`.

## Done when

`npx vitest run tests/unit/migration-routes.test.ts`, `npm run migration:status -- --check`
and `npm run lint` pass. Progress log updated.
