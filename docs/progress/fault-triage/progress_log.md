# Fault Triage Progress

## Status
Current step: WP-00..WP-06 and WP-08 merged into feat/fault-triage; WP-07 in Review (branch fault-triage/wp-07); WP-09 in Review (branch fault-triage/wp-09, based on the WP-07 commit); WP-10 in Review (branch fault-triage/wp-10, based on 4c284f8 = WP-07 + WP-09)
Completed steps: WP-00, WP-01, WP-02, WP-03, WP-04, WP-05, WP-06, WP-08 (orchestrator-reviewed; human acceptance waived per decision)
Next step: merge WP-07, WP-09 and WP-10; run the full `npm run check`; human review of the integrated result

## Decisions
- 2026-10-25: Human chose a pluggable `DraftProvider`: deterministic rules provider by default,
  Claude provider only when `ANTHROPIC_API_KEY` is set (ADR 0010).
- 2026-10-25: Human chose npm workspaces with Nuxt staying at the repo root
  (`packages/*`, `services/*`) (ADR 0009).
- 2026-10-25: Human chose real PostgreSQL via Docker for integration tests, locally and in CI.
- 2026-10-25: Human chose to write work-package docs first, then execute them.
- 2026-10-25: Human assigned the packages to Sonnet 5.5 (high effort) agents, in parallel where
  dependencies allow. Agents commit only to `fault-triage/wp-NN`; the orchestrator merges into
  `feat/fault-triage`; nothing is pushed.
- 2026-10-25: Human explicitly waived the workflow's per-package human acceptance for this
  initiative ("omit workflow's per-package human acceptance and run all waves through"). The
  orchestrator reviews and merges between waves; the human reviews the integrated result.
- 2026-10-25: Human assigned ADR number 0008 to fault normalisation. The deferred, unstarted
  storefront WP-27 now uses the next free ADR number instead of 0008.

## Package handoffs
<!-- One section per package: ## WP-NN — status, what changed, commands run with results, open points. -->

## WP-00 — Review
Branch `fault-triage/wp-00`, based on 360b489. Checks were run from this worktree only (not test:e2e, budget or the full check, per orchestrator instruction).

**What changed**
- `package.json`: `"workspaces": ["packages/*", "services/*"]`; new script `check:workspaces` = `npm run check --workspaces --if-present`; the root `check` runs it right after `typecheck`.
- `package-lock.json`: only the root `workspaces` entry added (4 lines).
- `eslint.config.mjs`: `packages/**` and `services/**` added to the global ignores (each workspace will own its config).
- `packages/.gitkeep`, `services/.gitkeep`: placeholders.
- `tests/unit/workspaces.test.ts` (new): asserts the workspaces array, the `check:workspaces` script, and that `check` runs it directly after `typecheck`.
- `vitest.config.ts`, `tsconfig.json`, `.gitignore`: unchanged. Vitest already includes only `tests/unit/**`; the Nuxt typecheck only follows the `.nuxt/` project references.

**Commands and results**
- `npm ci`: ok.
- `npx vitest run tests/unit/workspaces.test.ts` before the change: 3 failed (`workspaces` undefined). After: 3 passed.
- `npm install`: ok; the lockfile diff is the 4-line workspaces entry.
- `npm run check:workspaces`: **exit 1, "npm error No workspaces found!"** while `packages/` and `services/` contain no `package.json` (npm 11.1.0; CI uses node 24, same npm major). With one throwaway workspace package (removed afterwards) it exits 0. See open points.
- `npm run lint`: exit 0. `npm run typecheck`: exit 0.
- `npm run test:coverage`: exit 0; 26 files, 381 tests passed; statements 95.86%, branches 90.94%, functions 98.88%, lines 96.22%.
- Exclusion probe (temporary files under `packages/` with an `any` and a failing test, removed afterwards): lint exit 0, vitest still 26 files, typecheck exit 0.

**Open points**
- The spec calls `check:workspaces` a no-op while no workspaces exist, but npm 11 fails with "No workspaces found" when the globs match no `package.json`. The script is kept verbatim as specified. Until the first workspace package (WP-01, `packages/fault-taxonomy`) is merged, the root `npm run check` fails at `check:workspaces`. Merge WP-01 before running the full check, or decide on a tolerant script.
- Not run here: test:e2e, budget, full `npm run check`.

## WP-01 — Review
Branch `fault-triage/wp-01`, based on bb0a535 (WP-00). Checks were run from this worktree only (not test:e2e, budget or the full root check, per orchestrator instruction).

**What changed**
- `packages/fault-taxonomy/` (new workspace `@charge-portal/fault-taxonomy`, `"type": "module"`, `exports: { ".": "./src/index.ts" }`, zod ^4.6.6): `package.json`, `tsconfig.json`, `vitest.config.ts` (node env, coverage thresholds lines/functions/statements 95, branches 90 on `src/**`), `eslint.config.mjs` (imports the root config and drops its ignore-only entry, because the root ignores `packages/**`).
- `src/ocpp.ts` (raw OCPP 1.6 schemas), `src/taxonomy.ts` (enums, `faultClassSchema`, frozen `TAXONOMY` with 17 classes, per-area reasoning in comments), `src/vendors/{table,voltreon,kestrel-ev,lumenwatt,orbis-power,index}.ts` (8-9 codes per vendor, zod-validated at module load, 7 classes reachable from all four vendors), `src/normalise.ts`, `src/fixtures.ts`, `src/index.ts`.
- `tests/{ocpp,taxonomy,vendors,normalise,fixtures,index}.test.ts`: 192 tests.
- `package-lock.json`: workspace link and package entry only (+17 lines).

**Commands and results**
- `npm ci`: ok. `npm install` after adding the package: ok.
- Tests first: `npx vitest run` in the package before any `src/` existed: 6 files failed ("Cannot find module '../src/...'"), no tests ran. After implementation: 6 files, 192 tests passed.
- `npm run check -w @charge-portal/fault-taxonomy`: exit 0 (typecheck, lint, test with coverage). Coverage: statements 100%, branches 95% (19/20), functions 100%, lines 100%.
- Lint probe: a temporary `any` in `src/probe.ts` was reported by the package lint (so the package is actually linted); removed afterwards.
- `npm run lint` (root): exit 0. `npm run typecheck` (root): exit 0.
- `npm run check:workspaces` (root): exit 0 with the package present. This resolves the WP-00 open point (it failed with "No workspaces found" while no package existed).
- Root `npx vitest run`: 26 files, 381 tests passed (unchanged; root Vitest does not include the package tests).

**Decisions / deviations (for the reviewer)**
- `componentSchema` has a ninth value `unknown`, used only by `UNCLASSIFIED`. ADR 0008 lists eight components and has no component for the unknown case. Either amend the ADR text or choose another representation before WP-02 persists components.
- Vendor table lookups: `vendorId` is matched trimmed and case-insensitively; every vendor trims `vendorErrorCode`; kestrel-ev also upper-cases, lumenwatt lower-cases, orbis-power normalises to `0x` + upper-case hex. No fuzzy matching.
- Precedence is applied literally: a matching vendor code wins even when `errorCode` is `NoError`. Otherwise `NoError` returns `{ fault: null, source: 'ocpp-default' }`.
- `LocalListConflict` defaults to `COM.BACKEND_LINK` (local vs central authorisation list sync). `OtherError` and `InternalError` have no default.
- Timestamps accept offsets (`z.iso.datetime({ offset: true })`). Unknown extra keys on a notification are stripped by zod, so `raw` is the parsed notification.
- Source uses extensionless relative imports (`moduleResolution: Bundler`). Fine for Vite/Nitro/tsx; WP-02 may need a build step or `.ts` extensions if its Nest toolchain requires it.

**Open points**
- Not run here: test:e2e, budget, full root `npm run check`.
- No Codex consultation was needed.

## WP-02 — Review
Branch `fault-triage/wp-02`, based on bb0a535 (WP-00). Checks were run from this worktree only (not test:e2e, budget or the full `npm run check`, per orchestrator instruction). Database `triage_wp02` in the shared `fault-triage-postgres` container.

**What changed**
- `services/triage/` (new, `@charge-portal/triage`, private, ESM): NestJS 11 + `@nestjs/graphql` code-first (Apollo Server 5) + `@nestjs/typeorm`/TypeORM on PostgreSQL.
  - `src/main.ts` listens on `TRIAGE_PORT` (default 4100) and `TRIAGE_HOST` (default `127.0.0.1`, added so the internal service is loopback-only unless deployment says otherwise).
  - `src/config.ts`: zod-validated env (`loadConfig`), global `ConfigModule` providing `APP_CONFIG`. Missing/blank `TRIAGE_INTERNAL_TOKEN` or `TRIAGE_DATABASE_URL` => the service exits 1 at startup; messages never echo values.
  - `src/app.module.ts`: `GraphQLModule.forRoot` (`autoSchemaFile` -> `services/triage/schema.gql`, `sortSchema`, stack traces off; in-memory schema when `NODE_ENV=production`), `TypeOrmModule.forRootAsync` (`synchronize: false`, `migrationsRun: true`, `autoLoadEntities: true`), global `InternalAuthGuard` via `APP_GUARD`.
  - `src/internal-auth.guard.ts`: constant-time compare of `x-internal-token` (sha256 + `timingSafeEqual`); deny by default for non-GraphQL contexts; copies the trimmed `x-actor` (or `null`) into the GraphQL context (`TriageContext.actor`). `src/actor.decorator.ts`: `@Actor()` param decorator.
  - `src/health/*`: `health: Health!` with `status: HealthStatus!` (`ok` | `degraded`, lower-case wire values on purpose) and `database: Boolean!`. A dead database yields `degraded`, not a GraphQL error.
  - `src/database/typeorm.options.ts` (shared by the app and the CLI), `src/data-source.ts` (TypeORM CLI), `src/migrations/1792918800000-Init.ts` (empty `schema_meta` table) + `src/migrations/index.ts` (explicit list; the bundle cannot glob).
  - `src/graphql/express5-apollo.driver.ts`: see "Dependency-tree problems" below.
  - `schema.gql` committed (generated by Nest at startup; the integration test asserts it is in sync).
  - Tests: `test/unit/` (guard, config, health, reset guard: 19 tests), `test/integration/health.integration.test.ts` (5 tests), helpers in `test/helpers`, `test/integration/setup.ts`.
- `docker-compose.yml`: new services `postgres` (postgres:16-alpine, `triage`/`triage`, db `triage`, healthcheck, named volume) and `triage` (node:24-alpine, builds + starts the bundle, published on `127.0.0.1:4100` only). Existing services unchanged. `docker compose config -q` passes; not started (agents must not bind 5432).
- `.github/workflows/ci.yml`: job-level `services.postgres` container and `TRIAGE_DATABASE_URL`/`TRIAGE_INTERNAL_TOKEN` env for the job that runs `npm run check`.
- Outside the listed edit scope (needed, see below): root `package.json` gained an `overrides` entry. `package-lock.json`: +197 packages, one transitive bump (`qs` 6.16.0 -> 6.16.1), nothing removed.

**Versions chosen** (latest stable on npm on 2026-10-25, constrained by ADR 0009 "NestJS 11")
- `@nestjs/core|common|platform-express|testing` 11.2.8 (12.2.0 exists; ADR 0009 and the package say NestJS 11, so 12 was not used), `@nestjs/graphql` 13.4.5 and `@nestjs/apollo` 13.4.5 (the lines that peer `@nestjs/core ^11`), `@nestjs/typeorm` 11.0.3, `typeorm` 1.1.2 (latest; works with `@nestjs/typeorm` 11), `@apollo/server` 5.5.1, `@as-integrations/express5` 1.1.2, `graphql` 16.14.2 (17.0.2 is `latest` but `@apollo/server` 5 peers `graphql ^16.11`), `pg` 8.23.1, `reflect-metadata` 0.2.2, `rxjs` 7.8.2, `zod` 4.6.6.
- Dev: `vitest` 5.0.4, `vite` 8.3.4, `unplugin-swc` 2.0.0, `@swc/core` 1.16.20, `typescript` 6.0.3, `typescript-eslint` 8.71.1, `eslint` 10.12.0, `concurrently` 10.0.6, `@types/node` 24.19.2 (CI uses Node 24), `@types/express` 5.0.6, `@types/pg` 8.23.1. Local run used Node 26.3.0, npm 11.1.0.

**Runner decision (vitest + unplugin-swc, built with vite)**: Nest DI, TypeORM and GraphQL fields need `emitDecoratorMetadata`; esbuild/oxc based runners (tsx, plain Vite) do not emit it, `jest`/`ts-jest` would add a second test stack next to the root Vitest. SWC plus Vitest reuses the repo's runner, and the same SWC plugin (`swc.plugin.ts`) drives `vite build`, so tests and the shipped bundle compile identically.

**For WP-03: consuming `@charge-portal/fault-taxonomy` (exports `./src/index.ts`, ESM, zod 4)**
- Verified with a throwaway stub package (uncommitted, removed afterwards): `exports ./src/index.ts`, zod 4, one extensionless relative import and one `./x.js` import of a `.ts` file. Result: vitest unit test passed, `vite build` bundled it, the built file ran under plain `node`, `tsc --noEmit` (moduleResolution `Bundler`) and eslint passed.
- Vitest/Vite: npm links the workspace into `node_modules/@charge-portal/...`; Vite resolves the symlink to the real path under `packages/`, so the file is transformed by the SWC plugin like our own source (not externalised as a dependency).
- Build: `vite.config.ts` sets `ssr.noExternal: [/^@charge-portal\//]`, so workspace packages are bundled into `dist/`; everything from node_modules stays external. Plain `tsc`/`nest build` or `node dist/main.js` without the bundle would try to load `.ts` from the package at runtime and is NOT supported. Do not switch the build to `tsc`.
- The dependency only needs `"@charge-portal/fault-taxonomy": "*"` in `services/triage/package.json` plus `npm install` (this creates the workspace link and lock entry); no tsconfig `paths`. Note `tsc` typechecks the package source with the service's strict settings.
- Docker/CI run `npm ci` at the repo root first, so the link exists there.

**Dependency-tree problems (npm hoisting) and how they were handled**
1. `@nestjs/apollo` 13.4.5 depends on `@apollo/server-plugin-landing-page-graphql-playground` 4.0.1, which peers `@apollo/server ^4`. Without help npm put `@apollo/server` 4.13.0 at the root (what `@nestjs/apollo` resolves) and 5.5.1 only under the workspace; the app then fails. Fix: root `package.json` `"overrides": {"@apollo/server-plugin-landing-page-graphql-playground": {"@apollo/server": "^5.5.1"}}`. This is a root file outside WP-02's listed edit scope; it is the minimum change and needs the human's/orchestrator's acceptance.
2. `@as-integrations/express5` (peer `express ^5`) stays in `services/triage/node_modules` because the root holds express 4.22.3 for `@lhci/cli`; the hoisted `@nestjs/apollo` then cannot `require` it ("The @as-integrations/express5 package is missing"). A second `overrides` attempt (relaxing its express peer) did not change placement and was discarded. Fix: `src/graphql/express5-apollo.driver.ts` subclasses `ApolloDriver` and overrides `registerExpress` (copy of the 13.4.5 method, import changed). Remove it when the stock driver works (e.g. after @lhci/cli moves to express 5).

**Commands and results** (all with `TRIAGE_DATABASE_URL=postgres://triage:triage@localhost:5432/triage_wp02`)
- Tests first: `npm run test -w @charge-portal/triage` => 3 files failed ("Cannot find module ../../src/..."), `test:integration` failed (suite error) before any implementation existed. After implementation: unit 4 files / 19 tests passed; integration 1 file / 5 tests passed (migrations run on an emptied `public` schema, `health` => `{status:'ok',database:true}`, missing/wrong token => `Unauthorized`/`UNAUTHENTICATED`, `schema.gql` in sync).
- `npm run check -w @charge-portal/triage`: exit 0 (typecheck, lint, 19 unit tests, 5 integration tests).
- Root `npm run lint`: exit 0. `npm run typecheck`: exit 0. `npm run test:coverage`: exit 0, 26 files / 381 tests, statements 95.86%, branches 90.94%, functions 98.88%, lines 96.22% (unchanged from WP-00). `npm run check:workspaces`: exit 0 (runs the service check).
- `npm run build -w @charge-portal/triage`: ok (`dist/main.js`, `dist/data-source.js`). `node dist/main.js` without `TRIAGE_INTERNAL_TOKEN`: exit 1 with a config error. With env: `curl` of `{ health { status database } }` returns `{"data":{"health":{"status":"ok","database":true}}}` with the token and `Unauthorized`/`UNAUTHENTICATED` without. `npm run dev` (build + watch + `node --watch`) served the same query.
- `npm run migration:run -w @charge-portal/triage` after dropping the tables: `Init1792918800000` executed, `schema_meta` and `migrations` present.
- Not run: `test:e2e`, `budget`, full root `npm run check`, `docker compose up` (not allowed here).

**How to run**
- Tests: `export TRIAGE_DATABASE_URL=postgres://triage:triage@localhost:5432/triage_test`; `npm run check -w @charge-portal/triage` (unit tests need no database; integration tests need Postgres and WIPE the `public` schema of that database, so use a test database).
- Service: `docker compose up postgres` (humans/CI), then `TRIAGE_DATABASE_URL=... TRIAGE_INTERNAL_TOKEN=... npm run dev -w @charge-portal/triage` (or `build` + `start`). Endpoint `http://127.0.0.1:4100/graphql`; send `x-internal-token` and `x-actor`. `docker compose up postgres triage` builds and runs everything in containers.
- Migrations: `npm run migration:run -w @charge-portal/triage` (the app also runs them at startup).

**Conventions for WP-03 / WP-08**
- One Nest module per domain under `src/<domain>/` (`faults`, `tickets`, `audit`, `drafting`, `telemetry`) with `<name>.module|resolver|service|entity|model.ts`; import the module in `AppModule`. Entities are registered with `TypeOrmModule.forFeature([...])` (`autoLoadEntities` is on).
- Every migration: `src/migrations/<ms-timestamp>-<Name>.ts` AND an entry in `src/migrations/index.ts` (explicit list; no globs because the build is a bundle). Never use `synchronize`.
- Code-first GraphQL; commit the regenerated `schema.gql` with the change (the integration test fails if it drifts; run it once and commit the file Nest rewrote). Keep enum wire values as the contract needs them (lower-case members are allowed).
- Read the operator with `@Actor()`; it is `string | null`, so mutations must reject `null` themselves. All resolvers sit behind the global guard; do not add public endpoints without changing the guard deliberately.
- Integration tests: use `integrationEnv()`, `resetDatabase()`, `withClient()` from `test/integration/setup.ts`; files run serially against one database.
- Imports use extensionless relative paths; do not use `import type` for classes that Nest injects or TypeORM/GraphQL decorate (metadata needs the value import).

**Open points**
- Root `package.json` `overrides` entry (outside the listed scope) and the `Express5ApolloDriver` workaround, see above.
- ADR 0009 is still `proposed`; it was not edited (out of scope). Apollo Server 5 and graphql 16 are used, which the ADR does not name.
- The progress log Status lines edited here will conflict with other packages' edits to the same lines; resolve at merge.
- `npm install` warns that `@apollo/server-plugin-landing-page-graphql-playground` is deprecated; it is a hard dependency of `@nestjs/apollo` and is unused by us.
- The integration test refuses to wipe a database named exactly `triage` unless `CI=true` or `TRIAGE_ALLOW_DB_RESET=1`; CI sets `CI=true` automatically.

## WP-03 — Review
Branch `fault-triage/wp-03`, based on 130c655 (feat/fault-triage with WP-00..02). Checks were run from this worktree only (not test:e2e, budget or the full root `npm run check`, per orchestrator instruction). Database `triage_wp03` in the shared `fault-triage-postgres` container.

**What changed** (all under `services/triage/` unless noted)
- `package.json`: `"@charge-portal/fault-taxonomy": "*"` (+ `package-lock.json`: that one line in the workspace entry). No other dependency was added.
- Migration `src/migrations/1792922400000-CreateFaultTriageTables.ts` (registered in `src/migrations/index.ts`): tables `faults`, `tickets`, `audit_entries`, foreign keys `tickets.fault_id -> faults.id` and `audit_entries.ticket_id -> tickets.id`, CHECK constraints (fault source, ticket state, confidence 0..1, reject reason required when `rejected`, audit action, non-blank actor), indexes `(station_id, occurred_at)`, `(state, created_at DESC)`, `(ticket_id, at)`. `down` drops the three tables (revert + rerun verified).
- `src/faults/`: `Fault` entity/GraphQL type, `FaultsService.ingest`, `FaultsResolver` (`ingestFault`), `IngestResult`, `json.scalar.ts` (`JSON` scalar), `FaultsModule`.
- `src/tickets/`: `Ticket` entity/GraphQL type + `TicketState` enum, `TicketsService` (`list`, `get`, `faultOf`, `createDraft(manager, fault, draft)`), `TicketsResolver` (`tickets`, `ticket`, field resolvers `fault` and `audit`), `ticketSnapshot()`, `TicketsModule`.
- `src/audit/`: `AuditEntry` entity/GraphQL type, `AuditService` (`record(manager, ...)` insert only, `forTicket(id)` oldest first), `AuditModule`.
- `src/drafting/`: `DRAFT_PROVIDER` token, `DraftProvider` interface, `ticketDraftInputSchema`, `RulesDraftProvider`, `DraftingService` (runs the provider and validates its output; throws `InvalidDraftError`), `DraftingModule` (binds `DRAFT_PROVIDER` to `RulesDraftProvider` with `useExisting`).
- `src/app.module.ts`: imports the four modules. `schema.gql` regenerated and committed.
- Tests: unit `rules-draft-provider`, `ticket-draft-schema`, `drafting.service`, `faults.service`, `ticket-snapshot`, `json-scalar` (+ helper `test/helpers/fault-factory.ts`); integration `faults.integration.test.ts` (26 tests). The WP-02 test `health.integration.test.ts` now expects both migrations.

**Behaviour**
- `ingestFault(notification: JSON!)`: the notification is parsed with `ocppStatusNotificationSchema` (invalid => `GraphQLError` code `BAD_USER_INPUT`, `extensions.issues = [{ path, message, code }]`, submitted values are not echoed), then `normalise()`. `NoError` => `{ ticket: null, ignored: true }`, nothing stored. Otherwise: recent faults of the station are read, the provider drafts (validated by `DraftingService`), then ONE transaction inserts fault, ticket (`draft`) and the `draft-created` audit entry (`actor = agent:<provider>`, `before = null`, `after = ticketSnapshot(ticket)`). The provider runs before the transaction opens, so a slow (model) provider never holds a DB transaction; the fault id is generated in the service for that reason.
- `RulesDraftProvider` (provider name `rules`): cause/action template per component (9, including `unknown`); confidence 0.9 `vendor-table`, 0.6 `ocpp-default`, 0.3 `unclassified`; recurrence: occurrences of the same `taxonomyCode` on the same station in the 24 h up to and including the fault, the NEW FAULT COUNTED, `>= 3` => `requiresSiteVisit = true`, cause gets "Recurring: ... N times ...", action is prefixed "Escalated ... schedule a site visit". The window is relative to the fault's own `occurredAt` (not the clock), so it is deterministic; later faults are ignored.
- `ticketDraftInputSchema`: `{ taxonomyCode (enum of the TAXONOMY keys), probableCause 1..2000, suggestedAction 1..2000, requiresSiteVisit, confidence 0..1, provider 1..100 }`.

**GraphQL surface (see `schema.gql`)**
- `Mutation.ingestFault(notification: JSON!): IngestResult!`; `IngestResult { ticket: Ticket, ignored: Boolean! }`.
- `Query.tickets(state: TicketState): [Ticket!]!` (newest first), `Query.ticket(id: ID!): Ticket` (null for unknown or non-UUID id).
- `Ticket { id, faultId, stationId, state, taxonomyCode, probableCause, suggestedAction, requiresSiteVisit, confidence: Float, provider, rejectReason, createdAt, decidedAt, decidedBy, fault: Fault!, audit: [AuditEntry!]! }`; `enum TicketState { draft approved edited rejected }` (lower-case wire values, like `HealthStatus`).
- `Fault { id, stationId, connectorId, ocppErrorCode, vendorId, vendorErrorCode, taxonomyCode, component, severity, requiresSiteVisit, source, raw: JSON!, occurredAt, receivedAt }`; `AuditEntry { id, ticketId, action, actor, before: JSON, after: JSON!, at }`. `component`, `severity`, `source` and `action` are plain `String!` on the wire (values contain hyphens; `draft-created` is not a legal enum name).
- `fault` and `audit` are field resolvers: one query each per ticket (N+1 on `tickets`; fine for a queue, use a DataLoader if lists grow).

**For later packages**
- WP-04 (decisions): add approve/edit/reject to `TicketsService` and a resolver inside `src/tickets/`; reuse `AuditService.record(manager, ...)` in the same transaction and `ticketSnapshot()` for `before`/`after`; actor strings are operator ids from `@Actor()` (reject `null`). The DB already enforces the state values and "rejected needs a reason"; terminal-state immutability is NOT enforced in the DB, so do it in the service (e.g. `UPDATE ... WHERE id = $1 AND state = 'draft'` and check the row count).
- WP-05 (Claude provider): implement `DraftProvider`, rebind `DRAFT_PROVIDER` in `DraftingModule` with a factory (`ANTHROPIC_API_KEY` set => Claude with `RulesDraftProvider` as fallback, else rules). Output is already validated by `DraftingService`; on fallback set `provider` to whatever ADR 0010 should record (any 1..100 char string; the audit actor becomes `agent:<provider>`). `RulesDraftProvider` is injectable for the fallback.
- WP-06 (BFF): the wire contracts above; `ingestFault` needs only the internal token (no `@Actor`, stations are not operators).

**Commands and results** (`TRIAGE_DATABASE_URL=postgres://triage:triage@localhost:5432/triage_wp03`)
- Tests first: before any `src/` code, `npm run test -w @charge-portal/triage`: 6 files failed ("Cannot find module ../../src/..."), the 19 tests of the old files passed; the new integration suite failed to load.
- After implementation: `npm run check -w @charge-portal/triage` exit 0 (typecheck, lint, unit 10 files / 60 tests, integration 2 files / 31 tests). The first integration run after adding the types failed the `schema.gql` drift test, as designed (Nest rewrote the file); the file is committed and the next run passed.
- Root `npm run lint` exit 0; root `npm run typecheck` exit 0.
- `npm run build -w @charge-portal/triage` ok; `NODE_ENV=production node dist/main.js` (port 4113, smoke only, stopped afterwards) answered `ingestFault` for a voltreon fixture with a `draft` ticket and an `agent:rules` audit entry, and returned `BAD_USER_INPUT` with issues for an invalid inline literal. `typeorm migration:revert` and `migration:run` of the new migration ok.
- Not run: `test:e2e`, `budget`, full root `npm run check`, root `test:coverage` (no root source files touched).

**Decisions / deviations (for the reviewer)**
- The `JSON` scalar is a Nest `@Scalar` class (`Json` marker + `JsonScalar`) instead of a `GraphQLScalarType` or `graphql-type-json`: a `GraphQLScalarType` built in our ESM code is a different class than the CommonJS `graphql` Nest uses (failed with "Cannot determine a GraphQL input type"). No new dependency.
- Recurrence counts the new fault (the 3rd occurrence escalates); "occurred >= 3 times" is ambiguous in the package text. Change `occurrences()` in `rules-draft-provider.ts` if 3 earlier ones were meant.
- Nest logs every thrown `BAD_USER_INPUT` as an `[ExceptionsHandler]` error line with a stack. Harmless, but noisy for bad station input; left as is.
- Inserts use `manager.insert(Entity, entity as QueryDeepPartialEntity<Entity>)` because TypeORM's insert type rejects jsonb `Record<string, unknown>` columns.
- Audit entries are append-only by construction (no update/delete code); no database trigger was added (not in the package text).

**Merge notes**
- `src/migrations/index.ts`, `src/app.module.ts` and the progress-log Status lines will conflict with WP-08 (telemetry module): keep both migrations (ordered by timestamp; mine is `1792922400000`) and both module imports. Regenerate `schema.gql` after the merge (run the integration test once and commit the rewritten file). `package-lock.json` should merge cleanly (one line); otherwise rerun `npm install`.
- WP-08/WP-04 migrations need a timestamp different from `1792922400000`.

## WP-08 — Review
Branch `fault-triage/wp-08`, based on 130c655 (WP-00/01/02 merged). Checks were run from this worktree only (not test:e2e, budget or the full root `npm run check`, per orchestrator instruction). Database `triage_wp08` in the shared `fault-triage-postgres` container.

**What changed**
- `services/triage/src/telemetry/` (new module `TelemetryModule`, registered in `app.module.ts`):
  - `sample.ts`: `telemetrySampleSchema` (zod; `{ stationId, at, status (OCPP), temperatureC -50..150, powerKw 0..1000, faultClass? }`, reuses `faultClassSchema`/`ocppStatusSchema` from the taxonomy package) and `parseTelemetrySample` (error names fields, never values).
  - `rollup.ts`: pure `rollupStationState(prev, sample, now)`, `isOffline`, `effectiveHealth`, `recurringFault`, and the exported constants `NEEDS_VISIT_FAULT_COUNT=3`, `FAULT_WINDOW_MS=30 min`, `NEEDS_VISIT_TEMPERATURE_C=70`, `NEEDS_VISIT_HOT_SAMPLES=3`, `DEGRADED_TEMPERATURE_C=60`, `OFFLINE_AFTER_INTERVALS=3`, `DEFAULT_TELEMETRY_INTERVAL_MS=5000`.
  - `alerts.ts`: `planAlertChanges(prev, next)` (raise on condition start, clear on end) and the English messages.
  - `telemetry.service.ts` / `telemetry.resolver.ts` / `telemetry.model.ts` / `json.scalar.ts` / `telemetry.config.ts` (`TELEMETRY_INTERVAL_MS`, default 5000, invalid value stops startup) / entities `station-state.entity.ts`, `station-alert.entity.ts`.
- Migration `1793005200000-CreateStationTelemetry` (tables `station_state`, `station_alert`, partial unique index `UQ_station_alert_active` on `(station_id, kind) WHERE cleared_at IS NULL`), registered in `migrations/index.ts`. `schema.gql` regenerated and committed.
- `scripts/telemetry-simulator.mjs` (no dependencies) and `npm run simulate:telemetry`.
- Outside the listed edit scope (asked for by the orchestrator / needed): `services/triage/package.json` + `package-lock.json` (`"@charge-portal/fault-taxonomy": "*"`, one line each); `test/integration/health.integration.test.ts` (the migrations assertion expected exactly one migration; it now asserts that `Init` is first so later packages can append).

**Rules as implemented** (decisions where the package left room)
- Conditions (= alert kinds): `site_visit_fault` (active fault class requires a visit), `recurring_fault` (>= 3 fault onsets of one `taxonomyCode` within 30 min, window inclusive), `sustained_overheating` (>= 3 consecutive samples >= 70), `degraded_fault`, `high_temperature` (>= 60). First three => `needs-visit`; the others => `degraded`; none => `ok`.
- A fault counts once when it appears (onset: previous sample had no fault or another code), not per repeated sample. Window and hot-run rules use the sample's own timestamps; `now` only feeds `lastReceivedAt`/`updatedAt` (deterministic replays).
- `degraded_fault`: Faulted status or a fault class of severity minor/major/critical without site visit. A Faulted status without fault class is also degraded (never `ok`). An `info` class on a non-faulted status is ignored.
- Recovery to `ok` happens with the first sample where no condition fires. `recurring_fault` therefore persists after recovery until faults leave the 30 min window.
- An older sample (timestamp before the newest processed one) does not rewind the state; it only refreshes `lastReceivedAt`.
- Offline: `now - lastReceivedAt >= 3 x interval` (server clock, tolerant of station clock skew); overlaid on read, never stored. Because transitions deserve an alert, a read (`stationStates`/`stationState`) records one `offline` alert per offline station (idempotent via the partial unique index, under the per-station advisory lock); the next sample clears it.
- Ingest is one transaction under `pg_advisory_xact_lock` per station (also covers the first sample of a station).

**GraphQL surface for WP-09** (`schema.gql`)
- `ingestTelemetry(sample: JSON!): StationState!` (non-null, the package wrote it nullable), `stationStates: [StationState!]!`, `stationState(stationId: ID!): StationState`.
- `StationState { stationId: ID!, state: StationHealth!, lastSampleAt: DateTime!, lastReceivedAt: DateTime!, lastStatus: String!, temperatureC: Float!, powerKw: Float!, activeFault: StationFault, alerts: [StationAlert!]! }` (alerts = active only, oldest first).
- `enum StationHealth { ok degraded needs_visit offline }`. GraphQL names cannot contain "-": the wire value is `needs_visit`; BFF/UI map it to the contract value `needs-visit`.
- `StationAlert { id: ID!, stationId: ID!, kind: StationAlertKind!, message: String!, raisedAt: DateTime!, clearedAt: DateTime }`; `enum StationAlertKind { site_visit_fault recurring_fault sustained_overheating degraded_fault high_temperature offline }`; `StationFault { taxonomyCode, component, severity: String!, requiresSiteVisit: Boolean! }`.
- Scalars: `DateTime` (ISO string on the wire) and `JSON`.

**Scalar `JSON` (merge hazard)**: WP-03's `ingestFault(notification: JSON!)` needs the same scalar name. This branch registers it in `telemetry/json.scalar.ts` (class-based `@Scalar('JSON')`, marker type `JsonValue`). A `new GraphQLScalarType()` does not work here: under Vitest/Node ESM the service's `graphql` import and Nest's CJS `graphql` are two module instances, so Nest rejects it ("Cannot determine a GraphQL input type"). After merging WP-03 exactly one `JSON` scalar may remain; keep one and point the other module at it.

**Simulator** (`scripts/telemetry-simulator.mjs`): scenario st-003 recurring connector-lock fault (Faulted in ticks 1, 5, 9, ...; also sent to `ingestFault` as the WP-01 voltreon lock notification, inlined because plain Node cannot load the taxonomy package's TypeScript), st-002 heats 40 -> 75 degrees C (+3/tick), st-005 stops after tick 3, others healthy. Pure generator `generateTick({ stations, seed, tick, startAtMs, intervalMs })` is a function of (seed, station, tick) only (FNV-1a + mulberry32). `ingestFault` does not exist on this branch (WP-03): `postGraphql` never throws, failures are counted, each distinct error is logged once, tests never call the real mutation.

**Commands and results**
- Tests first: unit tests (`test/unit/telemetry/*`) written before `src/telemetry/*` => 4 files failed with "Cannot find module" (no tests ran), then 8 files / 87 tests passed. Integration test written before the module: failed at schema build ("Cannot determine a GraphQL input type for the sample"), which led to the class-based scalar; then 2 files / 16 tests passed. Simulator test written before the script: failed ("Failed to resolve import ../../scripts/telemetry-simulator.mjs"), then 37 tests passed.
- `TRIAGE_DATABASE_URL=postgres://triage:triage@localhost:5432/triage_wp08 npm run check -w @charge-portal/triage`: exit 0 (typecheck, lint, 87 unit, 16 integration tests; schema.gql in sync on repeated runs).
- `npx vitest run tests/unit/telemetry-simulator.test.ts`: 37 passed. Root `npx vitest run`: 27 files / 418 tests passed.
- Root `npm run lint`: exit 0. `npm run typecheck`: exit 0. `npm run test:coverage`: exit 0; statements 95.86%, branches 90.94%, functions 98.88%, lines 96.22% (unchanged; the new test does not alter the coverage include list).
- Live run: built bundle (`npm run build -w`), `node dist/main.js` on port 4188 with `TELEMETRY_INTERVAL_MS=1000`, simulator `--interval 1000 --seed 7` for 16 ticks: st-002 `needs_visit` (high_temperature + sustained_overheating), st-003 `needs_visit` (recurring_fault, after its lock alert cleared on recovery), st-005 `offline` with an offline alert, st-001/st-004 `ok`; the simulator logged `Cannot query field "ingestFault"` once and kept running; after stopping it all stations turned `offline`. Server stopped afterwards.
- Not run: `test:e2e`, `budget`, full root `npm run check`.

**Open points**
- `JSON` scalar duplicate with WP-03 (above); `schema.gql`, `migrations/index.ts`, `app.module.ts`, `services/triage/package.json`, `health.integration.test.ts` and the Status lines of this log will conflict textually with WP-03 and need a manual merge; regenerate `schema.gql` after merging (run the integration tests once and commit what Nest wrote).
- Reads write: `stationStates`/`stationState` may insert the offline alert. Acceptable for a small fleet; a scheduled sweep would replace it if reads must stay side-effect free.
- No Codex consultation was needed.
## WP-04 — Review
Branch `fault-triage/wp-04`, based on 80a241d (WP-03 on top of feat/fault-triage). Checks were run from this worktree only (not test:e2e, budget or the full root `npm run check`, per orchestrator instruction). Database `triage_wp04` in the shared `fault-triage-postgres` container. No migration was needed (see decisions).

**What changed** (all under `services/triage/`)
- `src/tickets/tickets.service.ts`: `approve(id, actor)`, `edit(id, input, actor)`, `reject(id, reason, actor)` over one private `decide()`: one `DataSource.transaction`, `findOne` with `pessimistic_write` (row lock), state must be `draft` (else `TICKET_ALREADY_DECIDED`), `UPDATE ... WHERE id AND state='draft'` with an affected-rows check as a second guard, then `AuditService.record(manager, ...)` in the same transaction. The service now also injects `DataSource` and `AuditService` (constructor changed; `TicketsModule` already imported `AuditModule`).
- `src/tickets/tickets.resolver.ts`: mutations `approveTicket(id)`, `editTicket(id, input: TicketEditInput!)`, `rejectTicket(id, reason)`, all returning `Ticket!`. The actor comes only from `@Actor()`; there is no actor argument (a test asserts a client-supplied `actor` argument is a schema error).
- New: `ticket-decision.schema.ts` (zod `ticketEditSchema` strict, at least one of probableCause/suggestedAction/taxonomyCode/requiresSiteVisit, null = not provided, text trimmed 1..2000, taxonomyCode must be a `TAXONOMY` key; `rejectReasonSchema` trimmed 3..500; `EDITABLE_FIELDS`), `ticket-edit.input.ts` (GraphQL `TicketEditInput`), `decision-errors.ts` (the error factories).
- `schema.gql` regenerated and committed (3 mutations, 1 input type).
- Tests: unit `ticket-decision-schema`, `ticket-decisions.service` (no actor / invalid input / bad id never open a transaction; lost-race guard), `audit.service` (surface: exactly `record` and `forTicket`, no update/delete/save/...); integration `decisions.integration.test.ts` (37 tests): approve/edit/reject with before/after and changedFields, missing and blank actor, internal token still required, validation cases without state change, all 9 first-decision x second-decision pairs, unknown/malformed id, 8 rounds of concurrent approve+reject plus 6 concurrent approvals (exactly one wins), rollback when the audit write fails (approve, edit, reject), API exposes no audit mutation.

**Error contract** (GraphQL `errors[0].extensions.code`)
- `FORBIDDEN`: no or blank `x-actor`. Checked first, before input validation and before any DB access. A missing/wrong `x-internal-token` is still `UNAUTHENTICATED` (guard).
- `BAD_USER_INPUT` with `extensions.issues = [{ path, message, code }]` (paths start with `input` or `reason`; submitted values are not echoed): empty edit, blank/over-long text, taxonomyCode outside the taxonomy, reason shorter than 3 or longer than 500 after trimming, and an edit where no submitted field differs from the draft (issue code `no_change`).
- `TICKET_NOT_FOUND`: unknown id and a malformed (non-UUID) id.
- `TICKET_ALREADY_DECIDED` with `extensions.state` (the winning terminal state): the ticket is not a draft any more.
- GraphQL validation errors (missing `reason`, unknown input field, unknown argument) come from Apollo with its own codes, not ours.

**Decisions / deviations (for the reviewer)**
- `changedFields` is stored inside the audit entry's `after` JSON (key `changedFields`, array in EDITABLE_FIELDS order: probableCause, suggestedAction, taxonomyCode, requiresSiteVisit), not in a new column: no migration, and `before`/`after` stay diffable snapshots. Only fields whose submitted value differs from the draft are listed. `before` never carries it. Consumers comparing `after` with a ticket snapshot must ignore this key.
- An `editTicket` that changes nothing is refused with `BAD_USER_INPUT` (`no_change`; the message tells the operator to approve): an `edited` state with an empty diff would be misleading provenance. The package text did not say; easy to relax in `TicketsService.edit`.
- `AuditService` keeps the WP-03 names `record(manager, ...)` and `forTicket(id)` instead of the `append`/`listForTicket` named in the package text: `faults.service.ts` (outside this package's edit scope) and WP-03 tests use them. The surface test pins exactly these two methods.
- Edits keep `confidence` and `provider` (still the agent's draft); `decidedBy`/`decidedAt` are set for all three decisions. Editing `taxonomyCode` does not recompute `requiresSiteVisit`; the operator sets it explicitly.
- No database trigger against audit UPDATE/DELETE was added (not in the package text); immutability is by construction in code. A trigger would be a small follow-up migration (timestamp 1792926000000 was reserved for this package and is unused).
- Nest logs every thrown GraphQLError as an `[ExceptionsHandler]` error line (same noise as WP-03 for `BAD_USER_INPUT`).

**Commands and results** (`TRIAGE_DATABASE_URL=postgres://triage:triage@localhost:5432/triage_wp04`)
- Tests first: with only the tests written, `npm run test -w @charge-portal/triage` => 2 files failed / 6 tests failed (`service.approve is not a function`, missing `ticket-decision.schema`); `npm run test:integration` => 34 failed / 34 passed (every decision test failed, the WP-02/03 tests passed).
- After implementation: `npm run check -w @charge-portal/triage` exit 0 (typecheck, lint, unit 13 files / 96 tests, integration 3 files / 68 tests); the integration suite was run 3 more times without a failure (the concurrency tests are stable). The schema drift test passes against the committed `schema.gql`.
- Root `npm run lint` exit 0. Root `npm run typecheck` exit 0.
- Not run: `test:e2e`, `budget`, full root `npm run check`, root `test:coverage` (no root files touched).

**For WP-06 (BFF)**: map `FORBIDDEN` -> 403, `TICKET_NOT_FOUND` -> 404, `TICKET_ALREADY_DECIDED` -> 409, `BAD_USER_INPUT` -> 422 (with `issues`), `UNAUTHENTICATED` -> 502 (misconfigured internal token). Always send `x-actor` from the session user; the service rejects decisions without it. The mutations return the full `Ticket` including `audit`.

**Merge notes**
- Touches only `services/triage/src/tickets/**`, `test/**`, `schema.gql` and one Status line of this log. `schema.gql` will conflict with WP-08 (telemetry types) and WP-05 if they change it: regenerate after merging (run the integration suite once; Nest rewrites it) and commit. No migration, so `src/migrations/index.ts` is untouched.
- `TicketsService` gained constructor dependencies; anything constructing it by hand (none known besides tests) must pass `DataSource` and `AuditService`.
## WP-05 — Review
Branch `fault-triage/wp-05`, based on 80a241d (feat/fault-triage with WP-00..03). Checks were run from this worktree only (not test:e2e, budget or the full root `npm run check`, per orchestrator instruction), with `ANTHROPIC_API_KEY` unset. Database `triage_wp05` in the shared `fault-triage-postgres` container. No migration, no GraphQL schema change.

**What changed** (all under `services/triage/`, plus the lockfile)
- Dependency: `@anthropic-ai/sdk` ^1.3.0 (resolved 1.3.0; `package-lock.json`: SDK + `@opentelemetry/api`, `json-schema-to-ts`, `standardwebhooks` and their small deps; `@babel/runtime` loses `dev`). `npm ci` verified.
- `src/drafting/claude-client.ts`: `ClaudeMessageClient { createMessage(params, { signal }) }` (the injected interface), structural `ClaudeMessageResponse`, `CLAUDE_CLIENT` token, `createAnthropicMessageClient(apiKey, { fetch? })` wrapping the SDK (`maxRetries: 1`; the optional `fetch` lets a test drive the real SDK without network).
- `src/drafting/claude-prompt.ts`: `draftToolDefinition()` (tool `submit_ticket_draft`, `input_schema` from `z.toJSONSchema` of `ticketDraftInputSchema` minus `provider`, with per-field descriptions; `$schema` stripped), system prompt (drafts for a human operator, taxonomyCode must come from the catalogue, station text is untrusted data), `buildUserPrompt` (catalogue table with all codes, the normalised fault with raw OCPP/vendor codes and `info`, up to 10 recent faults of the station without the fault itself, task line).
- `src/drafting/claude-draft-provider.ts`: `ClaudeDraftProvider(client, { model, timeoutMs })`. Timeout = race against a timer that rejects, then aborts the request via `AbortSignal`. Failures throw `DraftProviderError(reason)`: `timeout`, `api-error[-<status>]`, `refusal`, `truncated` (stop_reason `max_tokens`), `no-tool-call`, `unknown-taxonomy-code`, `invalid-output` (field names only, in `detail`). Success: output parsed with `ticketDraftInputSchema`, `provider = claude:<model>` (set after the model's fields, so the model cannot choose it). The class never logs.
- `src/drafting/fallback-draft-provider.ts`: `FallbackDraftProvider(primary, fallback, logger?)`. Any primary error -> rules draft with `provider = "<rules provider> (fallback: <reason>)"` (clamped to 100 chars, the schema limit) and ONE `warn` with reason/detail only (no payload, no fault ids). A non-`DraftProviderError` becomes `unexpected-error`. A failing fallback propagates.
- `src/drafting/drafting-config.ts`: `loadDraftingConfig(env)` (zod): `ANTHROPIC_API_KEY` (blank = unset), `TRIAGE_DRAFT_MODEL` (default `claude-sonnet-5-5`, max 90 chars), `TRIAGE_DRAFT_TIMEOUT_MS` (default 15000, 100..120000). Errors name variables, never values. Provided through a `DRAFTING_CONFIG` provider (not through `src/config.ts`, which is outside the package scope).
- `src/drafting/create-draft-provider.ts` + `drafting.module.ts`: selection by factory: no key -> `RulesDraftProvider` itself (no client is created); key -> `FallbackDraftProvider(ClaudeDraftProvider, RulesDraftProvider)`. `src/app.module.ts` needed no change (selection lives in `DraftingModule`, which `AppModule` already imports). The audit actor was already `agent:${draft.provider}` in `FaultsService` (WP-03), so it becomes `agent:claude:<model>` or `agent:rules (fallback: <reason>)` with no further change.
- `src/drafting/draft-provider.ts`: added `DraftProviderError` (`reason`, `detail`).
- `README.md` (new, short): env vars and provider behaviour.
- Tests: `test/unit/{claude-draft-provider,fallback-draft-provider,drafting-config,draft-provider-selection,anthropic-message-client}.test.ts`, helper `test/helpers/fake-claude-client.ts`. `test/integration/setup.ts` `integrationEnv()` now deletes `ANTHROPIC_API_KEY` from the test process so a real key on a developer machine can never make integration tests call out.

**Decision to review: `tool_choice` is NOT forced on the default model.** The task asked to force the tool. The claude-api reference for the current models says Claude Sonnet 5.5, Opus 5.5, Fable 5.1 and Mythos 5.1 return HTTP 400 for `tool_choice` `{type:"tool"}` / `{type:"any"}`; the default model `claude-sonnet-5-5` is one of them. So `ClaudeDraftProvider` sends `tool_choice: {type:"auto"}` plus an explicit instruction (system prompt and a final "Task" line) to call `submit_ticket_draft`, with `output_config.effort: "medium"`, for those four model families (regex `REJECTS_FORCED_TOOL_CHOICE`); every other model id gets `tool_choice: {type:"tool", name}` and no effort. Output is still structured (tool input) and fully validated, and a model that answers in prose just falls back (`no-tool-call`). Not verified against the live API (no key, and no network by rule). If a model outside the regex rejects forcing, drafts fall back with `api-error-400` visible in `provider`; extend the regex. `strict: true` was not used: it restricts which JSON Schema keywords (min/max length, minimum/maximum) are allowed, and zod validation already enforces the schema.

**Behaviour notes**
- Adaptive thinking is left at the model default; `max_tokens` 8192 leaves room for thinking plus two 2000-char fields. Thinking and text blocks in the response are ignored.
- Prompt and response content are never logged or stored; the key lives only inside the SDK client. The prompt contains the station id, connector, codes and the station's `info` (synthetic data) and is sent to the Anthropic API when the key is set.
- Smoke test of the built bundle (`NODE_ENV=production node dist/main.js`, port 4155): `ANTHROPIC_API_KEY` set to a dummy and `ANTHROPIC_BASE_URL=http://127.0.0.1:9` (closed local port, nothing left the machine) -> `ingestFault` returned a `draft` ticket with provider `rules (fallback: api-error)` and audit actor `agent:rules (fallback: api-error)`; the log showed one `[FallbackDraftProvider] WARN Draft provider failed (api-error); using the fallback provider`. Process stopped afterwards.

**Commands and results** (`TRIAGE_DATABASE_URL=postgres://triage:triage@localhost:5432/triage_wp05`, `ANTHROPIC_API_KEY` unset)
- Tests first: `npx vitest run --config vitest.config.ts` before any implementation: 5 new files failed to load ("Cannot find module ../../src/drafting/..."), 10 old files / 60 tests passed.
- After implementation: `npm run check -w @charge-portal/triage` exit 0 (typecheck, lint, unit 15 files / 118 tests, integration 2 files / 31 tests).
- Root `npm run lint` exit 0; root `npm run typecheck` (nuxt typecheck) exit 0.
- Not run: `test:e2e`, `budget`, full root `npm run check`, root `test:coverage` (no root source files touched).

**Merge notes**
- Touches `package-lock.json` (additive) and `services/triage/package.json` (one line). Regenerate with `npm install` if the lock conflicts. `docker-compose.yml` is outside this package: the `triage` service does not forward `ANTHROPIC_API_KEY`, `TRIAGE_DRAFT_MODEL`, `TRIAGE_DRAFT_TIMEOUT_MS`; add them there when Claude drafts are wanted in compose (without them compose behaves as before).
- Progress-log Status lines will conflict with the other packages' edits; resolve by hand.
- ADR 0010 still says `proposed`; not edited.

**Open points**
- Never run against the real API (by rule). The first real call should confirm that the `auto` + instruction route on `claude-sonnet-5-5` yields a tool call at `effort: medium`, and check latency against the 15 s default.

## WP-06 — Review
Branch `fault-triage/wp-06`, based on 1304543 (WP-00..04 and WP-08 merged). Checks were run from this worktree only (not test:e2e, budget or the full root `npm run check`, per orchestrator instruction). The triage service was not needed for the tests (`$fetch` is stubbed).

**What changed**
- `shared/contracts/triage.ts` (new): `ticketStateSchema`, `faultClassSummarySchema`, `faultDetailSchema` (raw codes + normalised class, no `raw` payload), `auditEntrySchema` (`before` nullable, `after` loose with optional `changedFields`), `ticketSummarySchema`, `ticketDetailSchema`, envelopes `ticketListResponseSchema` / `ticketDetailResponseSchema` (`{ data }`), GraphQL result shapes (`ticketsQueryDataSchema`, `ticketQueryDataSchema`, `mutationTicketDataSchema(name)`), `ticketDecisionInputSchema` (strict discriminated union on `action`), `triageValidationErrorSchema`, `toValidationError(zodError)`. Component, severity, OCPP error code and taxonomy code come from `@charge-portal/fault-taxonomy`; `source`, `action`, `changedFields` are enums defined here.
- `server/utils/triage.ts` (new): `fetchTriage(event, query, variables, schema)`, the three operations `listTickets`, `getTicket`, `decideTicket` (routes are one-liners over them) and `readJsonBody`.
- `server/api/triage/tickets.get.ts`, `server/api/triage/tickets/[id].get.ts`, `server/api/triage/tickets/[id]/decision.post.ts` (new).
- `nuxt.config.ts`: `runtimeConfig.triageOrigin` (`http://127.0.0.1:4100`) and `runtimeConfig.triageInternalToken` (`synthetic-dev-internal-token`, the value from `docker-compose.yml`); env overrides `NUXT_TRIAGE_ORIGIN`, `NUXT_TRIAGE_INTERNAL_TOKEN`. No `.env.example` exists, so none was changed.
- `tests/unit/triage-contract.test.ts`, `tests/unit/triage-bff.test.ts` (new).

**Behaviour**
- Actor: resolved once per request from the legacy session (`fetchLegacy('/api/v1/me')`, cached in `event.context.triageActor`) and sent as `x-actor` = the user's `name`; the shared token as `x-internal-token`. No session: 401 before the service is called. The decision body is `strictObject`, so an `actor` key is a 422; nothing from the body reaches a header.
- Error mapping (GraphQL `errors[0].extensions.code`, read from 200 and from non-2xx bodies): FORBIDDEN 403; TICKET_NOT_FOUND 404 (also `ticket: null`, and a non-UUID id before any call); TICKET_ALREADY_DECIDED 409; BAD_USER_INPUT with valid `issues` 422 (paths: leading `input` dropped, arrays dotted); BAD_USER_INPUT without issues, UNAUTHENTICATED, Apollo validation codes, unknown codes, network/HTML/timeout 502 ("Triage service unreachable"); data not matching the schema 502 "Triage response violates contract". Service messages are never passed on.
- `$fetch` uses `retry: 0` and a 10 s timeout.
- Decision route only reads `application/json` bodies (415 otherwise), a cheap addition to the session cookie's SameSite=Lax.

**Commands and results**
- Tests first: `npx vitest run tests/unit/triage-contract.test.ts tests/unit/triage-bff.test.ts` before any implementation: 2 files failed to load (`#shared/contracts/triage`, `server/utils/triage` missing).
- After implementation: same command: 2 files, 101 tests passed.
- `npm run lint` exit 0. `npm run typecheck` exit 0. `npm run test:coverage` exit 0 (statements 96.65%, branches 90.94%, functions 98.95%, lines 97.1%; floor 90%/80%).
- Extra checks (not committed): `npx nuxt build` exit 0 (the workspace TS import resolves and is inlined in the Nitro bundle). Smoke run of the built server against the legacy stand-in and a fake GraphQL server on spare ports (all stopped afterwards): no session 401, list 200, bad `state` 422, detail 200, non-UUID id 404, upstream TICKET_ALREADY_DECIDED 409, text/plain decision 415, `actor` in body 422; the fake service saw `x-actor: Demo Operator` and the internal token; `NUXT_TRIAGE_ORIGIN` override worked. The five GraphQL documents validate against `services/triage/schema.gql` (graphql-js `validate`).
- Not run: `test:e2e`, `budget`, full root `npm run check`.

**Decisions / notes for the reviewer**
- The operator id is the legacy session's `name` (legacy has no separate id; the demo user is `Demo Operator`). The `x-actor` header must be ASCII/Latin-1; a name outside it would fail the call as 502.
- The existing `csrf.ts` middleware only issues tokens for HTML pages; the repo's JSON `POST` routes (disputes) do not verify one, and the new decision route follows that. Protection is SameSite=Lax plus the JSON-only content type. WP-07 needs no CSRF token; a `$fetch` with an object body sends `application/json`.
- All routes return `{ data }` (list: `TicketSummary[]`, detail and decision: `TicketDetail`), unlike `stations.get.ts`, which unwraps. This keeps the contract schemas and the wire identical.
- `server/utils/triage.ts` is not in the vitest coverage `include` (edit scope excluded `vitest.config.ts`); `shared/contracts/triage.ts` is covered by the `shared/**` glob.
- Bundle size hazard for WP-07: `shared/contracts/triage.ts` imports `@charge-portal/fault-taxonomy` (package index; vendor tables validate at load and the package declares no `sideEffects: false`). A page that imports the contracts could pull the whole taxonomy package into its client chunk. The server bundle is unaffected. Check with `npm run budget`; if needed add `"sideEffects": false` or a subpath export to the package.

## WP-07 — Review
Branch `fault-triage/wp-07`, based on 921ac74 (WP-00..06 and WP-08 merged). This package ran alone, so E2E and `npm run budget` were run (not the full `npm run check`). Triage database `triage_e2e` in the shared `fault-triage-postgres` container.

**What changed**
- Pages: `app/pages/portal/triage/index.vue` (queue: state filter, default Entwurf, table with station, class code + label, severity badge, site visit as Ja/Nein, provider, time, link per row; polite live region with the count) and `app/pages/portal/triage/[id].vue` (fault panel with raw OCPP and vendor codes, normalised class, source; draft panel with cause, action, class, site visit, confidence as "90 %", provider; decision section; audit trail as ordered list). Nav link in `app/layouts/default.vue` (`:prefetch="false"`, see budget).
- Review behaviour (ADR 0003 pattern): approve in one click; Bearbeiten opens an edit form (`DsTextField`s for cause and action, a labelled `<select>` for the class, a checkbox for the site visit); Ablehnen opens a required reason field. `novalidate` forms, client rules first; a failed submit focuses an error summary (`DsAlert`, links to the fields) and each field is tied by `aria-invalid` + `aria-describedby`; nothing is sent while invalid. Success: polite `role="status"` message, focus moves to the "Entscheidung" heading (the buttons are gone), the ticket and audit trail update from the decision response. 409 (decided elsewhere): alert "bereits entschieden", the page reloads to the read-only state. 422 issues map to fields by path. Decided tickets render read-only. Cancel returns focus to the button that opened the form. The edit sends only changed fields.
- Components (`app/components/triage/`, presentational, text passed in, each with `.stories.ts`): `TriageSeverityBadge`, `TriageFacts` (definition list; optional `<time>` and severity badge per item), `TriageAuditTrail`.
- `shared/contracts/triage-rules.ts` (new): zero-dependency browser rules (`validateReason`, `validateEdit`, `buildEdit`, `errorFromIssueCode`, `TAXONOMY_CODES`, error codes). Like `dispute-rules.ts`: the page never ships zod or the taxonomy package. `tests/unit/triage-rules.test.ts` checks it agrees with `ticketDecisionInputSchema` case by case and that `TAXONOMY_CODES` equals the package's keys.
- i18n: `nav.triage` and a `triage.*` section in de and en (states, severities, components, sources, all 17 taxonomy labels as `triage.taxonomy.<AREA>.<NAME>`, audit actions, field labels, error texts by code, form and panel texts). `tests/unit/triage-i18n.test.ts` fails when a contract value (taxonomy code, component, severity, source, state, audit action, field, error code) has no text in either locale.
- Bundle hazard (WP-06): `packages/fault-taxonomy/package.json` got `"sideEffects": false` and subpath exports `./taxonomy` and `./ocpp`; `shared/contracts/triage.ts` imports those instead of the index (a unit test pins both). The pages import only types from the contract file and the zero-dependency rules, so the client bundle has no zod and no taxonomy tables (grep of `.output/public/_nuxt`).
- E2E infrastructure: see "How Playwright starts and seeds the service".
- `docs/migration-routes.json`: `/portal/triage` and `/portal/triage/:id`, `nuxt-native`, ADR 0010, with the page and BFF files.
- Route budget (see below): `scripts/lib/route-budget.mjs`, `scripts/check-route-budget.mjs`, `scripts/route-budgets.json`, new `scripts/lib/triage-stub.mjs`, `tests/unit/route-budget.test.ts`, `tests/unit/triage-stub.test.ts`.
- `services/triage/README.md`: section on the seed script.

**How Playwright starts and seeds the service** (`playwright.config.ts`)
- New exports: `TRIAGE_PORT` (`E2E_TRIAGE_PORT`, default 4100), `TRIAGE_GRAPHQL_URL`, `TRIAGE_E2E_DATABASE_URL` (`E2E_TRIAGE_DATABASE_URL`, default `postgres://triage:triage@localhost:5432/triage_e2e`), `TRIAGE_INTERNAL_TOKEN` (`TRIAGE_INTERNAL_TOKEN` env, default `synthetic-dev-internal-token`; CI sets `synthetic-ci-internal-token` job-wide, so the same variable works locally and in CI). New project `triage` (`/triage\.spec\.ts/`, depends on `setup`, stored login).
- webServer entry "triage": `npm run e2e:serve -w @charge-portal/triage` = `vite build && node dist/seed.js prepare && node dist/main.js`. `prepare` drops and creates `triage_e2e` through the maintenance database `postgres`; the service then runs its migrations at startup. `reuseExistingServer: false` (a stale service might use another database), `ANTHROPIC_API_KEY` forced blank (rules provider). The Nuxt dev server entry now gets `NUXT_TRIAGE_ORIGIN` and `NUXT_TRIAGE_INTERNAL_TOKEN` (same token).
- Seeding: `services/triage/src/seed/seed.ts` exports `seedFaults({ graphqlUrl, internalToken })` (ingests all 12 WP-01 fixtures sequentially through `ingestFault`, so tickets are drafted by the real service), `resetTriageData(url)` (TRUNCATE the three tables, schema kept so the running service stays valid), `recreateDatabase(url)`, `assertE2eDatabase(url)`. All destructive helpers refuse any database whose name does not end in `_e2e`. `triage.spec.ts` imports them and runs `resetTriageData` + `seedFaults` in `beforeEach`. `src/seed/cli.ts` is a third build entry (`dist/seed.js prepare|seed|reset`); scripts `seed`, `seed:reset`, `e2e:serve` in `services/triage/package.json`.
- CI: no change to `.github/workflows/ci.yml` was needed: the Postgres service user `triage` can create `triage_e2e`, and the job-level `TRIAGE_INTERNAL_TOKEN` is picked up by the config for both the service and the BFF. The workspace integration tests use database `triage`, E2E uses `triage_e2e`, so they cannot collide. Not run in CI from here.

**Route budget** (ADR 0007: measured +5%, rounded up to 0.1 KB; thresholds of existing routes unchanged)
- `scripts/lib/route-budget.mjs` `REQUIRED_ROUTES` now has nine routes (the unit test that pinned seven was updated): `/portal/triage` and `/portal/triage/3f0c2a8e-6a55-4a5e-9a3c-0d1f6f1d2b10`. `validateBudgetCoverage` rejects budget keys that are not required, so the JSON could not be extended alone. The budget script starts `scripts/lib/triage-stub.mjs` (a tiny GraphQL stand-in with one synthetic ticket; its answers are unit-tested against the BFF contracts) and gives the app `NUXT_TRIAGE_ORIGIN`, so the measurement needs neither Postgres nor the real service.
- Measured (gz, `npm run budget`): `/portal/triage` 124.643 KB, `/portal/triage/<id>` 124.643 KB (same value: each page prefetches the other), budgets 130.9 KB each.
- Existing routes, main (before) -> now: stations/sessions 117.655 -> 117.847 (budget 119.5); invoices and dispute 120.423 -> 120.615 (122.4); `/shop/c/wallboxes` 125.563 -> 125.752 (126.0); `/shop/cart` 121.549 -> 121.735 (123.0); `/shop/wallbox-home-7-4` 128.049 -> 128.239 (budget 128.0, FAILS on unchanged main as well). Every route gains about 0.19 KB gz from the larger message catalogue; nothing else. Without `:prefetch="false"` on the nav link the portal routes gained 1.77 KB (the triage chunks were prefetched on every portal page) and `/portal/stations` had 0.07 KB of headroom left.

**Commands and results**
- Tests first: unit tests (`triage-rules`, `triage-i18n`, service `seed`) failed to load/resolve before the code; the E2E spec was first run with the infrastructure in place and no pages: 22 failed, 4 passed (the BFF/logged-out API tests). After implementation: `npx playwright test tests/e2e/triage.spec.ts --project=triage` 26 passed (47 s). Full `npx playwright test` (all projects incl. storybook, contract, rollout): 223 passed (1.6 min).
- axe (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa) in the E2E: queue, draft review, edit form, edit form with error, reject form with error, rejected review, in default + stadtwerke-demo + fleet-demo; approved and edited reviews; queue and review at 320 and 375 px (no sideways scroll). All `violations` equal `[]`.
- `npm run lint` exit 0. `npm run typecheck` exit 0. `npm run test:coverage` exit 0: 32 files, 586 tests; statements 97.1%, branches 92.02%, functions 99.12%, lines 97.63%. `npm run migration:status -- --check` exit 0 (6 Nuxt-native routes). Service: `npm run typecheck`, `npm run lint`, `npm run test` (23 files, 236 tests) exit 0; its integration tests were not run (no service code outside `src/seed` and `vite.config.ts` changed).
- `npm run budget` exit 1 only because of the pre-existing `/shop/wallbox-home-7-4` failure (above); the other eight routes PASS. The `tests/e2e` spec is type-checked ad hoc with `tsc --ignoreConfig` (the Nuxt typecheck does not include `tests/e2e`): no errors.
- Not run: full `npm run check`.

**Decisions / for the reviewer**
- Files outside the package's edit list that were needed: `packages/fault-taxonomy/package.json` and `shared/contracts/triage.ts` (bundle hazard, allowed by the orchestrator), `services/triage/vite.config.ts` (seed build entry), `services/triage/test/unit/seed.test.ts`, `shared/contracts/triage-rules.ts`, the budget files above, `services/triage/README.md`. The CSRF token is not used (WP-06: the decision route does not verify one).
- The operator name in audit rows and "Entschieden von" is the legacy session `name` ("Demo Operator"), per WP-06.
- Draft text (cause and action) comes from the rules provider in English, whatever the UI locale; only the labels around it are translated.
- Severity badge colours reuse the station status tokens (no new tokens): info = charging, minor = offline, major and critical = faulted; critical also has a border. Meaning is always in the text.
- The Edit form sends only changed fields; the service refuses an edit that changes nothing (`no_change`), the client says so first.

**For WP-09**
- Reuse `TriageFacts`, `TriageAuditTrail`, `TriageSeverityBadge`, the `triage.*` i18n keys (`triage.severity.*`, `triage.component.*`, `triage.taxonomy.*`, `triage.state.*`, `triage.yes/no`), the seed module (`seedFaults`, `resetTriageData`) and the `triage` Playwright project / `TRIAGE_*` exports. A spec that needs the service and a fresh seed copies the `beforeEach` of `tests/e2e/triage.spec.ts`; a new spec file must match the project's `testMatch` or get its own project.
- Any new portal page needs entries in `docs/migration-routes.json`; a new budgeted route needs `REQUIRED_ROUTES` + `route-budgets.json` (+ stub answers if it needs the service).

## WP-09 — Review
Branch `fault-triage/wp-09`, based on ebcc30f (WP-00..08 incl. WP-07). This package ran alone, so E2E and `npm run budget` were run (not the full `npm run check`). Triage database `triage_e2e` (E2E) and `triage_wp09` (workspace integration tests) in the shared `fault-triage-postgres` container.

**What changed**
- Contract (`shared/contracts/triage.ts`): `stationHealthSchema` (`ok | degraded | needs-visit | offline`), `stationAlertKindSchema` (the six kinds), `stationAlertSchema` (`id, stationId, kind, raisedAt`), `stationStateSchema` (`stationId, state, updatedAt, alerts`), `stationStateListResponseSchema` (`{ data }`), and `stationStatesQueryDataSchema`, which parses the wire answer and maps it in one step (`needs_visit` -> `needs-visit`, `lastSampleAt` -> `updatedAt`, unused fields dropped). Taxonomy still comes only from the subpath exports.
- BFF: `listStationStates(event)` in `server/utils/triage.ts` (query without `message`, sorted needs-visit, offline, degraded, ok, then by station id) and `server/api/triage/stations/state.get.ts`. Error mapping is `fetchTriage`'s: outage / contract violation 502, no session 401.
- Page `app/pages/portal/stations/index.vue`: "Live-Zustand" column (new `TriageStateBadge`: text + one icon shape per state + border style; `app/components/triage/TriageStateBadge.vue` + stories, reuses the status tokens), region "Handlungsbedarf" above the table (every station that is not `ok`, most urgent first, alerts translated by kind from `stations.live.alert.*`, link "Tickets zu <Name>" to `/portal/triage?station=<id>`, `:prefetch="false"`), time of the last reading per row. Stations that never reported: "Nicht gemeldet"; while loading: "Wird geladen ..."; after an outage: "-" (sr-only "Nicht verfügbar") plus a non-blocking `DsAlert` ("Der Live-Zustand ist derzeit nicht verfügbar. ...").
- The live state is fetched in the browser only (`useFetch(..., { server: false })`): a slow or absent triage service (10 s BFF timeout) never delays the legacy table, and the alert needs no SSR/hydration care. Consequence: the live column is empty in the server-rendered HTML and fills after hydration.
- Queue filter (`app/pages/portal/triage/index.vue`): `?station=<id>` filters the already loaded tickets in the browser, shows "Gefiltert nach Station <id>" with a "Filter entfernen" link, and its own empty text. The state filter keeps working on top.
- i18n: `stations.col.live`, `stations.live.*` (attention, state, alert, tickets, loading, unknown, unavailableCell, unavailable), `triage.stationFilter`, `triage.stationFilterClear`, `triage.emptyStation` in de and en. `tests/unit/triage-i18n.test.ts` now also checks that every health state and alert kind has text in both locales.
- Seeding: `services/triage/src/seed/seed.ts` gained `telemetryScenario(now)` (st-001 ok, st-002 66 degrees C = degraded, st-003 Faulted + `CON.LOCK_FAILURE` = needs-visit, st-004 ok, st-005 ok), `seedTelemetry` (through the real `ingestTelemetry`, sequential), `resetTelemetryData` (TRUNCATE the two telemetry tables) and `silenceStation` (moves `last_received_at` into the past); both destructive helpers keep the `_e2e` database guard. I wrote an own five-sample scenario instead of importing the WP-08 simulator (plain `.mjs` outside the service's build); the unit test rolls it up with the real `rollupStationState`.
- Route budget stub (`scripts/lib/triage-stub.mjs`): answers `stationStates` in the wire dialect for the five demo stations (ok, degraded, needs_visit, ok, offline, with alerts), so `/portal/stations` is measured with the alert region on screen; `tests/unit/triage-stub.test.ts` checks the answers against the BFF contract.
- `playwright.config.ts`: new project `stations-state` (`/stations-state\.spec\.ts/`, depends on `setup`, stored login); `TELEMETRY_INTERVAL_MS=60000` on the triage service; `NUXT_TRIAGE_ORIGIN=http://127.0.0.1:1` on the second Nuxt app (rollout), so a test sees the page with a really unreachable service.

**Offline in E2E (decision)**: the service judges offline on its own receive time (3 x `TELEMETRY_INTERVAL_MS`), which a sample cannot fake. With the default 5 s every seeded station would be offline after 15 s, so the e2e service runs with `TELEMETRY_INTERVAL_MS=60000` (3 min) and `silenceStation('st-005', 1 h)` makes exactly one station offline, deterministically. The offline alert is then recorded by the first read (WP-08 behaviour), which the spec asserts.

**Commands and results**
- Tests first: unit tests written before the code failed (27 failed in 4 files: missing exports, stub without `stationStates`); the service seed test failed to load (`telemetryScenario` etc. missing). The new E2E spec before the page: 16 failed, 4 passed (the BFF/logged-out API tests, which already passed because contract, BFF and seed existed); after the page: all pass.
- `npx playwright test tests/e2e/stations-state.spec.ts tests/e2e/portal.spec.ts tests/e2e/rollout.spec.ts`: 36 passed. Full `npx playwright test`: 244 passed (1.6 min; includes the 21 new tests and the setup test).
- New E2E coverage: BFF contract and order, no English alert text or wire spelling in the response, 401 logged out; live column and alert region (text, order, translation by kind); link to `/portal/triage?station=st-003`; status filter and the single `role=status` live region; "Nicht gemeldet"; BFF 502 (stubbed) and really unreachable service: page renders 5 legacy rows plus the alert; queue filter incl. empty state and removal. axe (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa), `violations` equal `[]`, in: default, stadtwerke-demo, fleet-demo (all with the alert region visible), 320 px and 375 px (no sideways scroll), the unavailable state (stubbed and really unreachable), the empty filtered queue.
- `npm run lint` exit 0. `npm run typecheck` exit 0. `npm run test:coverage` exit 0: 32 files, 617 tests; statements 97.18%, branches 92.13%, functions 99.13%, lines 97.69%. `npm run migration:status -- --check` exit 0. `npm run tokens -- --check` ok. Service: typecheck and lint exit 0, unit tests 23 files / 242 tests; `TRIAGE_DATABASE_URL=.../triage_wp09 npm run check:workspaces` exit 0 (integration 4 files / 79 tests).
- `npm run budget` exit 1, only because of the pre-existing `/shop/wallbox-home-7-4` (128.242 KB, budget 128.0). Others PASS: `/portal/stations` 118.823 KB gz (budget 119.5, was 117.847; headroom 0.677 KB), `/portal/sessions` 118.823 (119.5), `/portal/invoices` and dispute 121.592 (122.4), `/portal/triage` and `/portal/triage/<id>` 125.757 (130.9), `/shop/c/wallboxes` 125.752 (126.0), `/shop/cart` 121.735 (123.0). Growth of about 0.98 KB gz on every portal route is the page chunk (prefetched by the nav) plus the larger catalogue. No budget or threshold was changed. No zod and no taxonomy tables in the client chunks (grep of `.output/public/_nuxt`; the page imports types only).
- Not run: full `npm run check`.

**Decisions / for the reviewer**
- Files outside the package's edit list: `playwright.config.ts` (project, `TELEMETRY_INTERVAL_MS`, unreachable origin for the second app), `server/utils/triage.ts` (the operation lives next to the others), `scripts/lib/triage-stub.mjs` + `tests/unit/triage-stub.test.ts` (requested), `tests/unit/triage-bff.test.ts`, `tests/unit/triage-i18n.test.ts`, `services/triage/test/unit/seed.test.ts`.
- The queue filter is client-side on the loaded tickets; a station with many tickets in other states needs the state filter changed (default is Entwurf, as before).
- No auto-refresh of the live state: it is read once per page visit.
- The `DsAlert` for the outage is the default `error` tone (`role=alert`): the `info` tone is `role=status` and would make the existing `main getByRole('status')` assertions ambiguous.
- The stations-state spec does not touch fault tickets (triage.spec.ts resets and seeds them in parallel); the queue filter is tested against a stubbed `/api/triage/tickets` through client-side navigation.
- Reading `stationStates` may write an `offline` alert in the service (WP-08); accepted.

**Merge notes**: textual conflicts are possible in `playwright.config.ts` and `services/triage/src/seed/seed.ts` (WP-07 touched both; this branch only adds), `i18n/locales/*.json` (WP-10 may add keys near `stations`/`triage`), and the Status lines of this log.

## WP-10 — Review
Branch `fault-triage/wp-10`, based on 4c284f8 (WP-00..09 integrated). Documentation only: `README.md`, ADRs 0008 to 0010 (status still `proposed`) and this log. No code, locale file, threshold or test was touched. Every claim below was checked against the code on this branch, not only against the log.

**What changed**
- `README.md`: new section "Fault triage" (workspace layout, routes, how to start Postgres / service / seed / simulator / Nuxt, test databases, one environment table); routes table rows for `/portal/triage`, `/portal/triage/:id` and the live state on `/portal/stations`; ADRs 0008 to 0010 in the decision-records list; `npm run check` comment and a note that `npm run dev` does not start the service; honest limits for the triage slice; a row in "What this demonstrates"; a roadmap item.
- `README.md` budget bullet rewritten: the old text said `npm run budget` fails above a 120 KB aggregate, but `scripts/check-bundle-size.mjs` is informational and the hard gate is the per-route table in `scripts/route-budgets.json` (ADR 0007). It now says so and records the pre-existing `/shop/wallbox-home-7-4` failure: about 128.05 KB gz on main, 128.242 KB with this work, threshold 128.045 KB in `scripts/route-budgets.json` (ADR 0007 prints it as 128.0). No threshold changed.
- ADR 0008: the `unknown` component was already documented (commit 533c818). Added: 17 classes incl. `UNCLASSIFIED`; vendor id matching; a matching vendor code beats `NoError`; `NoError` otherwise = no fault, nothing stored; `OCPP_DEFAULTS` and which codes have no default; "downgrade" reworded to reclassify / clear the site-visit flag (a ticket has no severity field); the "frequency of unclassified per vendor" claim reworded (queryable, no report); per-vendor canonical forms (the old text said all vendors trim and case-fold; `voltreon` only trims and `orbis-power` upper-cases hex); `sideEffects: false` and the `./taxonomy` / `./ocpp` subpath exports.
- ADR 0009: Apollo Server 5 / `graphql` 16 / NestJS 11.2 / Nest GraphQL 13; Vite SSR build with SWC (why, and that `tsc`/`nest build` is unsupported); the root `overrides` entry and `Express5ApolloDriver` workaround; `schema.gql` committed with a drift test; explicit migration list and `migrationsRun`; CHECK constraints and that terminal states are enforced in service code (row lock); BFF details (10 s timeout, no retry, error mapping); the old "auth, CSRF and rollout rules apply unchanged" corrected (auth applies, no CSRF token check on the decision route, no rollout switch); internal token (constant-time, deny by default) and `x-actor` = session user `name`; `TRIAGE_HOST` default `127.0.0.1`, compose publishes on loopback; the old "unit tests use in-memory repositories" corrected (stubs; integration tests boot the whole app on real Postgres); the old "needs Docker running" corrected (needs reachable Postgres); N+1 note.
- ADR 0010: provider set and `TicketDraftInput` fields; edit fields and the no-op edit refusal; terminal states and error codes; audit actions, actor formats, `changedFields` inside `after`, snapshot fields; no DB trigger; rules provider confidence and recurrence rule; Claude provider (tool `submit_ticket_draft`, `tool_choice: auto` + instruction + `effort: medium` for Sonnet 5.5 / Opus 5.5 / Fable 5.1 / Mythos 5.1, forced elsewhere, **unverified against the live API**), fallback reasons and the `rules (fallback: <reason>)` provider string, env vars, prompt content sent to the API; draft text is English regardless of UI locale; compose does not forward the Claude variables; "measuring accepted drafts" and "mocked client" reworded to what exists.

**Commands and results**
- `npm ci`: ok. `npm run lint`: exit 0 (see below). Link check: every relative link in `README.md` and ADRs 0008 to 0010 resolves (small node script, not committed).
- Not run: typecheck, tests, `test:e2e`, `budget`, full `npm run check` (no code or test changed). The budget numbers above are copied from the WP-07 and WP-09 entries, not re-measured here.

**Things found while reading, not fixed (outside WP-10's edit scope)**
- `services/triage/package.json` lists `"@charge-portal/fault-taxonomy": "*"` twice in `dependencies` (merge artifact of WP-03 and WP-08). Valid JSON for npm (last wins) but should be deduplicated.
- `scripts/route-budgets.json` has `/shop/wallbox-home-7-4` at 128.045 KB while the WP-07/09 entries and ADR 0007 say 128.0; the figure on main was recorded as 128.049 in WP-07 and as 128.047 in the WP-10 brief.
- `services/triage/README.md` does not mention `TELEMETRY_INTERVAL_MS` (documented in the root README table instead).
- `ADR 0007` is not edited; the shop budget remains a separate matter.
