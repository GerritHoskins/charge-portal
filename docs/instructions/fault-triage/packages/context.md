# Fault triage: shared context

Read this first in every package. It restates the repo facts packages need.

## Repo facts (verified 2026-10-25)

- npm (lockfile `package-lock.json`). Nuxt app stays at the repo root. After WP-00 the root
  `package.json` has `"workspaces": ["packages/*", "services/*"]`.
- `npm run check` = lint, typecheck, tokens check, migration status check, `test:coverage`
  (Vitest, 90% floor on `shared/**`), `test:e2e` (Playwright), `budget` (build + JS budgets).
- Contracts: `shared/contracts/*.ts`, zod 4. Names: `xxxSchema`, `xxxListResponseSchema`
  (`{ data: [...] }`), `export type X = z.infer<typeof xxxSchema>`. Import as `#shared/contracts/...`.
  Pattern: `shared/contracts/station.ts`; test pattern: `tests/unit/station-contract.test.ts`
  (a `valid` fixture, one "accepts" test, several "rejects ..." tests spreading `valid`).
- BFF upstream access: `server/utils/legacy.ts` `fetchLegacy(event, path, schema, opts)`. It forwards
  the cookie, maps 401/404/409 through, 422 only with a valid body, everything else and any schema
  violation to 502 ("... violates contract"). `fetchTriage` must mirror this mapping.
- Middleware: `server/middleware/auth.ts` (all `/api/**` and `/portal/**` need a session except an
  explicit public allowlist in `server/utils/public-api.ts`), `server/middleware/csrf.ts` (mutating
  requests need the CSRF token). The current user comes from `server/api/me.get.ts` / `legacy-auth.ts`.
- Pages: `app/pages/portal/{stations,sessions,invoices}/...`. Pattern: `<script setup lang="ts">`,
  `useI18n`, `useFetch<T>('/api/...')`, an `sr-only role="status"` live region, `DsDataTable`.
- Design system: `app/components/ds/` (`DsAlert`, `DsButton`, `DsDataTable`, `DsStatusBadge`,
  `DsTextField`), each with `.stories.ts`. Tokens only: `app/assets/css/tokens.css`, generated from
  `tokens/tokens.json` by `scripts/build-tokens.mjs` (never edit the CSS by hand).
- i18n: `i18n/locales/de.json` (default) and `en.json`, strategy `no_prefix`.
- E2E: `tests/e2e/*.spec.ts`, stored auth from `tests/e2e/auth.setup.ts`. axe pattern in
  `tests/e2e/portal.spec.ts`: `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a',
  'wcag21aa','wcag22aa']).analyze()` → `violations` equals `[]`; wait for `html[data-hydrated]`.
- Route inventory: `docs/migration-routes.json`, checked by `scripts/migration-status.mjs`. Routes
  created in Nuxt are status `nuxt-native` (ADR 0007, decision 4) and need an ADR and implementing files.
- Synthetic stations: `legacy/data.mjs` st-001..st-005 (st-003 `faulted`, st-005 `offline`).

## Target layout

```
packages/fault-taxonomy/   @charge-portal/fault-taxonomy: OCPP + vendor schemas, canonical taxonomy, normalise()
services/triage/           @charge-portal/triage: NestJS GraphQL service (faults, tickets, audit, drafting, telemetry)
scripts/telemetry-simulator.mjs
server/utils/triage.ts     fetchTriage(event, query, variables, schema)
server/api/triage/**       BFF routes
shared/contracts/triage.ts BFF-facing schemas
app/pages/portal/triage/   back-office queue + review
```

## Glossary

- **OCPP errorCode**: OCPP 1.6 `ChargePointErrorCode` enum (`ConnectorLockFailure`,
  `EVCommunicationError`, `GroundFailure`, `HighTemperature`, `InternalError`, `LocalListConflict`,
  `NoError`, `OtherError`, `OverCurrentFailure`, `OverVoltage`, `PowerMeterFailure`,
  `PowerSwitchFailure`, `ReaderFailure`, `ResetFailure`, `UnderVoltage`, `WeakSignal`).
- **vendorErrorCode**: free-text vendor code (max 50 chars in OCPP 1.6), meaning depends on `vendorId`.
- **Taxonomy class**: `{ taxonomyCode, component, severity, requiresSiteVisit }`. `taxonomyCode` is
  `AREA.NAME` uppercase, e.g. `PWR.OVERCURRENT`; `UNCLASSIFIED` when nothing matches.
- **Ticket states**: `draft` → `approved` | `edited` (approved with operator changes) | `rejected`
  (requires a reason). Terminal states never change.
- **Audit entry**: append-only row `{ id, ticketId, action, actor, before, after, at }`.
- **Station state**: `ok` | `degraded` | `needs-visit` | `offline`, plus a list of alerts.

## Local Postgres for agents

The orchestrator runs one shared container for all agent worktrees:
`docker run -d --name fault-triage-postgres -e POSTGRES_USER=triage -e POSTGRES_PASSWORD=triage
-p 5432:5432 postgres:16-alpine` (credentials are synthetic). Each package uses its own database
`triage_wp<NN>` via `TRIAGE_DATABASE_URL=postgres://triage:triage@localhost:5432/triage_wp<NN>`;
create it with `docker exec fault-triage-postgres createdb -U triage triage_wp<NN>` (ignore "already
exists"). Never start a second Postgres or bind port 5432 yourself. The `postgres` service that WP-02
adds to `docker-compose.yml` is for humans and CI, not for agent runs.

## Parallel agent runs

Several agents work at once in separate git worktrees. To avoid port clashes, agents run the
package-specific commands and `npm run lint`, `npm run typecheck`, `npm run test:coverage`, but
**not** `npm run test:e2e`, `npm run budget` or full `npm run check`; the orchestrator runs those
serially after merging. Packages that add E2E specs write them and run only their own spec with
`npx playwright test <spec>` when the package says so. Commit only to your `fault-triage/wp-NN`
branch, never push, never touch other branches.
