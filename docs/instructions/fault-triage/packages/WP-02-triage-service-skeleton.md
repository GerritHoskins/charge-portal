# WP-02 — `services/triage` skeleton: NestJS + GraphQL + PostgreSQL/TypeORM

**Depends on:** WP-00.
**Execution status:** maintained in the designated progress log.
**Progress log:** `docs/progress/fault-triage/progress_log.md`

## Goal

A runnable NestJS service with a GraphQL `health` query that reports database connectivity, a
TypeORM data source with migrations, a Postgres service for humans and CI, and a `check` script that
the root `check:workspaces` runs.

## Read

- `docs/adr/0009-triage-service-stack.md`, `packages/context.md` ("Local Postgres for agents").
- `docker-compose.yml`, `.github/workflows/ci.yml`, root `package.json` scripts.

## Files you may change

Everything under `services/triage/` (new), `docker-compose.yml`, `.github/workflows/ci.yml`,
`package-lock.json`, the progress log.

## Design

- Package `@charge-portal/triage`, private. Dependencies: `@nestjs/core`, `@nestjs/common`,
  `@nestjs/platform-express`, `@nestjs/graphql`, `@nestjs/apollo`, `@apollo/server`, `graphql`,
  `@nestjs/typeorm`, `typeorm`, `pg`, `reflect-metadata`, `rxjs`, `zod`. Dev: `@nestjs/testing`,
  `vitest` + `unplugin-swc` (decorator metadata) or `jest`/`ts-jest` (pick one, justify in the log),
  `tsx` or `@nestjs/cli` for running. Use current stable versions; record them in the log.
- `src/main.ts` listens on `TRIAGE_PORT` (default 4100). `src/app.module.ts` wires
  `GraphQLModule.forRoot<ApolloDriverConfig>({ autoSchemaFile: 'schema.gql', sortSchema: true })`
  and `TypeOrmModule.forRootAsync` from `TRIAGE_DATABASE_URL`, `synchronize: false`,
  `migrationsRun: true`.
- `src/data-source.ts` for the TypeORM CLI; `src/migrations/<ts>-Init.ts` creates an empty
  `schema_meta` table (or similar) so the migration path is proven.
- `src/health/health.resolver.ts`: `health: { status: 'ok' | 'degraded', database: boolean }`.
- `src/internal-auth.guard.ts`: global guard; requests without header
  `x-internal-token === TRIAGE_INTERNAL_TOKEN` are rejected; the service refuses to start without
  the env var (tests set it). Reads `x-actor` into the GraphQL context.
- Scripts: `dev`, `build` (tsc to `dist/`), `start`, `typecheck`, `lint`, `test` (unit),
  `test:integration` (needs `TRIAGE_DATABASE_URL`), `migration:run`, and `check` = typecheck + lint +
  test + test:integration. If `@charge-portal/fault-taxonomy` is consumed later as TS source, make
  sure the chosen runner/build can compile it (note in log for WP-03).
- `docker-compose.yml`: add service `postgres` (postgres:16-alpine, synthetic creds `triage`/`triage`,
  db `triage`, port 5432, healthcheck) and service `triage` (node image running the service,
  depends on postgres). Keep existing services unchanged.
- CI: add a `postgres` service container and `TRIAGE_DATABASE_URL`/`TRIAGE_INTERNAL_TOKEN` env to the
  job that runs `npm run check`.
- Commit `schema.gql`.

## Acceptance criteria

- [ ] Tests first: unit test for the guard (missing/wrong token rejected, actor read); integration
      test boots the app against `triage_wp02`, runs migrations and queries `health` →
      `{ status: 'ok', database: true }`; observed failing before implementation.
- [ ] `npm run check -w @charge-portal/triage` passes with
      `TRIAGE_DATABASE_URL=postgres://triage:triage@localhost:5432/triage_wp02`.
- [ ] Root `npm run lint` and `npm run typecheck` still pass (root does not lint/typecheck the service).
- [ ] Commit on `fault-triage/wp-02`; progress-log handoff includes versions and how to run.

## Verification commands

`docker exec fault-triage-postgres createdb -U triage triage_wp02`, then
`npm run check -w @charge-portal/triage`, `npm run lint`, `npm run typecheck`.

## Blockers and handoff

When blocked after two attempts on the same error, stop and report to the orchestrator.
