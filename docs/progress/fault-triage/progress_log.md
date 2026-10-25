# Fault Triage Progress

## Status
Current step: WP-00..WP-06 and WP-08 merged into feat/fault-triage; WP-07 running
Completed steps: WP-00, WP-01, WP-02, WP-03, WP-04, WP-05, WP-06, WP-08 (orchestrator-reviewed; human acceptance waived per decision)
Next step: WP-07, then WP-09, then WP-10

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

