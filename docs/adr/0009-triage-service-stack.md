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
   script and CI step for no functional gain.
2. **NestJS 11** for the service: modules per domain (`faults`, `tickets`, `audit`, `drafting`,
   `telemetry`), dependency injection for swapping the drafting provider, and a testing module
   for unit tests with in-memory repositories.
3. **PostgreSQL 16 with TypeORM.** Explicit migrations only (`synchronize: false`). `jsonb` for raw
   fault payloads and audit before/after snapshots. Ticket decisions and their audit entries are
   written in one transaction.
4. **GraphQL, code-first (`@nestjs/graphql`, Apollo driver).** Queries for ticket queues, ticket
   detail, audit trail and station state; mutations for ingesting faults/telemetry and for decisions.
   The schema is generated from TypeScript and checked in as `schema.gql` so changes are reviewable.
5. **Only the BFF talks to the service.** The browser never sees GraphQL. `server/utils/triage.ts`
   `fetchTriage` posts queries, parses the `data` with zod contracts from `shared/contracts/triage.ts`,
   and maps errors like `fetchLegacy` (contract violation → 502). Pages call `/api/triage/*` as they
   call every other BFF route, so auth, CSRF and rollout rules apply unchanged.
6. **Actor identity is asserted by the BFF.** The BFF resolves the operator from the existing session
   and sends it in an `x-actor` header together with a shared internal token
   (`TRIAGE_INTERNAL_TOKEN`). The service rejects requests without the token and records the actor
   in audit entries. This is adequate for a service on an internal network behind the BFF; it is not
   end-user authentication and the service must not be exposed publicly.
7. **Docker for Postgres** locally (`docker-compose.yml` service `postgres`) and as a CI service
   container. Unit tests use in-memory repositories; integration tests run against real Postgres.

## Consequences

- `npm run check` now needs Docker running for the service integration tests and E2E.
- Two runtimes (Nitro and Nest) to start in development and in Playwright's `webServer` list.
- GraphQL adds a schema and a client step, but keeps the BFF free of the service's REST shape and
  lets the review screen fetch ticket, fault and audit in one round trip.
- The internal-token scheme is a deliberate simplification documented here; replacing it with
  service-to-service auth (mTLS or signed tokens) is future work.

## User and business value

The portal gains a real backend with durable, auditable state while the BFF boundary, contracts and
accessibility rules stay as they are. Each tool in the stack is used for something it is good at,
which makes the service a truthful example rather than a list of names.
