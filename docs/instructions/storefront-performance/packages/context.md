# Shared context for every storefront work package

Read `AGENTS.md` and `docs/instructions/work-package-workflow.md`, then this file and the
selected package. These facts are starting points: verify relevant claims against the
current checkout. Use the package read list first, with targeted extra reads for diagnosis.

## Rules (from `AGENTS.md`, binding)

- Tests first for behaviour changes: write the failing test, run it, see it fail, then implement.
- Legacy responses are never read without parsing them with a schema from `shared/contracts/`.
  A new legacy endpoint needs a schema and a contract test with an invalid case.
- Every new page route needs an axe E2E check. Status and meaning are never shown by colour alone.
- Components use design tokens only (`var(--…)` from `app/assets/css/tokens.css`), no hard-coded
  colours or spacing. Never hand-edit `tokens.css`: it is generated from `tokens/tokens.json`
  by `npm run tokens`.
- All data is synthetic. No real product names, brands, prices from real shops, or stock photos.
- Do not install dependencies. Do not commit, push, reset or clean Git history.
- Touch only the files your work package lists and its progress log. If another file must
  change, consult Codex about an in-scope solution; record any required scope decision for the user.
- After two failed attempts on the same error, pause retries and consult Codex. Also consult
  when blocked or needing a second opinion. Follow the shared workflow before user escalation.

## Commands

| Purpose | Command |
|---|---|
| One unit test file | `npx vitest run tests/unit/<name>.test.ts` |
| All unit tests + coverage floor | `npm run test:coverage` |
| Lint / types | `npm run lint` / `npm run typecheck` |
| One E2E project | `npx playwright test --project=<name>` (starts legacy :8080 and Nuxt :3000 itself) |
| Everything | `npm run check` (slow: lint, types, tokens, inventory, unit, all E2E, bundle budget) |

Show only the last ~30 lines of command output in your reasoning; do not paste full logs.

## Repo facts you will need

- **Stack:** Nuxt 4, Vue 3 `<script setup lang="ts">`, strict TS, zod, `@nuxtjs/i18n`
  (`defaultLocale: 'de'`, `strategy: 'no_prefix'`). Shared code is imported as `#shared/...`.
- **Legacy stand-in:** `legacy/server.mjs` (plain Node `http`, port 8080). Data in
  `legacy/data.mjs`. Every path under `/api/` requires a session; anything that must be public
  has to be handled **before** the block that starts with the comment
  `// Everything below requires a session.`
- **BFF pattern:** `server/api/stations.get.ts` is the template:
  ```ts
  import { stationListResponseSchema } from '#shared/contracts/station'
  export default defineEventHandler(async (event) => (await fetchLegacy(event, '/api/v1/stations', stationListResponseSchema)).data)
  ```
  `fetchLegacy(event, path, schema, { method?, body? })` lives in `server/utils/legacy.ts`.
  It maps 401→401, 404/409→same, invalid contract or outage→502.
- **Contract pattern:** `shared/contracts/station.ts` (zod schema + `z.infer` types) with
  `tests/unit/station-contract.test.ts` (valid fixture accepted, invalid cases rejected).
  Money crosses the boundary as integer cents (`amountCents`), formatted only in the page.
- **Auth guard:** `server/middleware/auth.ts` guards every path starting with `/api/` or
  `/portal`. Public shop endpoints are blocked until a work package adds an explicit allowlist.
- **CSRF:** `server/middleware/csrf.ts` issues a CSRF cookie on every HTML document GET.
- **App shell:** `app/app.vue` renders the header and calls `useFetch('/api/me')` on every page.
- **Pages pattern:** `app/pages/portal/stations/index.vue`: `useI18n()`, `useHead({ title })`,
  `useFetch` with `default`, a polite `role="status"` live region for filter results,
  `DsDataTable`, `DsAlert` for load errors.
- **Design system:** `app/components/ds/` (`DsAlert`, `DsButton`, `DsDataTable`,
  `DsStatusBadge`, `DsTextField`), each with a `.stories.ts`.
- **i18n:** `i18n/locales/de.json` and `en.json`. `tests/unit/i18n-catalogues.test.ts` fails
  if the two files do not have exactly the same keys or if a message is empty.
- **Route inventory:** `docs/migration-routes.json`; `npm run migration:status -- --check`
  fails when a page under `app/pages` is not listed. Logic in `scripts/lib/migration-routes.mjs`,
  tests in `tests/unit/migration-routes.test.ts`.
- **E2E:** `playwright.config.ts` defines projects `setup`, `app` (logged in), `auth`,
  `storybook`, `contract`, `rollout`. Tests pin `locale: 'de-DE'`. Pages set
  `data-hydrated` on `<html>` after mount; wait for it before interacting.
  axe pattern: `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze()`
  then `expect(results.violations).toEqual([])`.
- **Coverage:** `vitest.config.ts` includes `shared/**/*.ts`, `scripts/lib/**/*.mjs` and a few
  server utils, with a floor of 90% lines/functions/statements and 80% branches. New files in
  those folders need enough tests to keep the floor.
- **Budgets:** `scripts/check-bundle-size.mjs` sums all gzipped client JS (budget 120 KB,
  ~115.8 KB used). `lighthouserc.cjs` asserts performance ≥ 0.9, a11y = 1, LCP ≤ 2500 ms,
  CLS ≤ 0.1, TBT ≤ 300 ms on four logged-in portal routes; `scripts/lighthouse.mjs` logs in
  and passes `LH_COOKIE`.

## Progress log

After finishing, append to `docs/progress/storefront-performance/progress_log.md`:
update **Status** (package state, current/completed/next WP), add a **Completed Changes** entry
(`### WP-NN — title`: files changed, tests added, commands run with pass/fail), add any
measurements to the **Measurements** table, and any blockers to **Open questions**.
Include branch/HEAD, next action, and Codex advice/results when used. Mark Review only after
package checks and `npm run check` pass; mark Done only after human review accepts the diff.
