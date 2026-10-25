# ADR 0009: Triage service: NestJS, PostgreSQL, TypeORM and GraphQL behind the BFF

**Status:** proposed

## Context

Fault ingestion, ticket drafting, operator decisions, an audit log and telemetry rollup need durable
state, transactions and a domain model. None of that belongs in the legacy stand-in (which models
the system being migrated away from) or in Nuxt server routes (which are a thin BFF over upstreams,
ADR 0001). The work is small enough for one service.

## Decision

1. **npm workspaces mono-repo, Nuxt stays at the root.** Workspaces: `packages/*` (shared libraries,
   starting with `@charge-portal/fault-taxonomy`) and `services/*` (starting with
   `@charge-portal/triage`). Moving Nuxt into `apps/` was rejected: it would touch every config,
   script and CI step for no functional gain. The root `npm run check` runs each workspace's own
   `check` through `check:workspaces`; the root ESLint ignores `packages/**` and `services/**`, which
   own their configs.
2. **NestJS 11** for the service (`@nestjs/*` 11.2): modules per domain under
   `services/triage/src/` (`faults`, `tickets`, `audit`, `drafting`, `telemetry`, plus `health`),
   dependency injection for swapping the drafting provider (token `DRAFT_PROVIDER`), and Nest's
   testing module for the integration tests, which boot the whole `AppModule`.
3. **PostgreSQL 16 with TypeORM.** Explicit migrations only (`synchronize: false`); the app runs them
   at startup (`migrationsRun`) from an explicit list in `src/migrations/index.ts`, because the build
   is a bundle and cannot glob. `jsonb` for raw fault payloads and audit before/after snapshots.
   CHECK constraints guard the ticket state values, the confidence range, a reject reason for rejected
   tickets, the audit action and a non-blank actor. A decision locks the ticket row
   (`pessimistic_write`), refuses anything that is not a `draft`, updates it and writes its audit
   entry in one transaction; terminal states are enforced by that service code, not by the database.
4. **GraphQL, code-first (`@nestjs/graphql` + `@nestjs/apollo` 13, Apollo Server 5, `graphql` 16).**
   Queries for ticket queues, ticket detail (with fault and audit trail as fields) and station state;
   mutations for ingesting faults/telemetry and for decisions. The schema is generated from
   TypeScript and checked in as `services/triage/schema.gql`; an integration test fails when the file
   drifts from what Nest generates. In production (`NODE_ENV=production`) the schema stays in memory.
   GraphQL names cannot contain a hyphen, so enum members that are hyphenated on the BFF contract are
   lower-case with an underscore on the wire (`needs_visit`), and the BFF maps them.
5. **Build and test toolchain: Vite (SSR build) with SWC, and Vitest.** Nest DI, TypeORM columns and
   GraphQL fields need `emitDecoratorMetadata`, which esbuild/oxc-based runners do not emit. One SWC
   setup (`swc.plugin.ts`) drives both Vitest and `vite build`, so tests and the shipped bundle
   compile the same way. The build bundles `@charge-portal/*` workspace packages (they ship TypeScript
   source) and leaves everything else in `node_modules` external; `tsc`/`nest build` is not supported.
6. **Two dependency-tree workarounds, both removable.** `@nestjs/apollo` pulls in a package that peers
   `@apollo/server` 4, so the root `package.json` has an `overrides` entry forcing `^5.5.1`. And with
   Express 4 held at the root by `@lhci/cli`, the hoisted `@nestjs/apollo` cannot see
   `@as-integrations/express5`, so `src/graphql/express5-apollo.driver.ts` subclasses `ApolloDriver`
   and overrides `registerExpress` (a copy of the 13.4.5 method with only the import changed). Both go
   away once the stock driver works, which should be checked on upgrades.
7. **Only the BFF talks to the service.** The browser never sees GraphQL. `server/utils/triage.ts`
   `fetchTriage` posts queries (10 s timeout, no retries, so a mutation never runs twice), parses the
   `data` with zod contracts from `shared/contracts/triage.ts`, and maps errors like `fetchLegacy`:
   `FORBIDDEN` 403, `TICKET_NOT_FOUND` 404, `TICKET_ALREADY_DECIDED` 409, `BAD_USER_INPUT` with issues
   422, anything else (outage, wrong token, unknown code) and any contract violation 502; service
   messages are not passed on. Pages call `/api/triage/*` as they call every other BFF route. The auth
   middleware applies unchanged. There is no rollout switch because there is no legacy page. The CSRF
   middleware only issues tokens for HTML pages and the decision route does not verify one (like the
   existing JSON `POST` routes); it relies on `SameSite=Lax` and accepts `application/json` only.
8. **Actor identity is asserted by the BFF.** The BFF resolves the operator from the existing session
   (the legacy `/api/v1/me`; legacy has no separate user id, so the user's `name` is the identity) and
   sends it in an `x-actor` header together with a shared internal token (`TRIAGE_INTERNAL_TOKEN`,
   header `x-internal-token`). A global guard compares the token in constant time and denies by
   default; the actor is taken from the header only, never from an argument, and decisions without it
   are `FORBIDDEN`. Fault and telemetry ingestion need only the token (stations are not operators).
   The service refuses to start without the token or a database URL, and listens on `TRIAGE_HOST`
   (default `127.0.0.1`); `docker-compose.yml` publishes it on loopback only. This is adequate for a
   service on an internal network behind the BFF; it is not end-user authentication and the service
   must not be exposed publicly. The header value must be Latin-1, so a session name outside it fails
   the call as a 502.
9. **Docker for Postgres** locally (`docker-compose.yml` service `postgres`, plus a `triage` service
   that builds and runs the bundle) and as a CI service container. Unit tests need no database and use
   hand-written stubs for repositories and the data source; integration tests run the whole app against
   real Postgres and wipe the `public` schema of `TRIAGE_DATABASE_URL`. Playwright starts the service
   against a throwaway `triage_e2e` database.

## Consequences

- `npm run check` now needs a reachable PostgreSQL (`TRIAGE_DATABASE_URL`) for the service integration
  tests and for E2E (the database user must be able to create `triage_e2e`); CI provides it as a
  service container.
- Two runtimes (Nitro and Nest) to start in development and in Playwright's `webServer` list. The
  root `npm run dev` does not start the triage service.
- GraphQL adds a schema and a client step, but keeps the BFF free of the service's REST shape and
  lets the review screen fetch ticket, fault and audit in one round trip. Field resolvers for `fault`
  and `audit` cost one query per ticket in the list (N+1); a DataLoader is the fix if lists grow.
- The root `overrides` entry and the Express 5 driver are maintenance debt, documented above.
- The internal-token scheme is a deliberate simplification documented here; replacing it with
  service-to-service auth (mTLS or signed tokens) is future work. Likewise there is no database
  trigger for audit immutability (ADR 0010).

## User and business value

The portal gains a real backend with durable, auditable state while the BFF boundary, contracts and
accessibility rules stay as they are. Each tool in the stack is used for something it is good at,
which makes the service a truthful example rather than a list of names.
