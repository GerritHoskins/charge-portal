# Task: Fault taxonomy, agent-in-the-loop triage and station telemetry

> **Execution:** do not run this file as one task. Work through the packages in
> [`packages/README.md`](packages/README.md), one fresh session per package. Where a package
> differs from this overview, the package wins.

## Environment
- Project: `C:\Users\Gerrit\job-search\charge-portal-nuxt` (integration branch `feat/fault-triage`)
- Existing stack: Nuxt 4 / Vue 3, strict TypeScript, zod 4 contracts, `@nuxtjs/i18n`, Vitest, Playwright + axe
- New stack (this initiative): npm workspaces, NestJS 11, `@nestjs/graphql` (Apollo driver, code-first),
  TypeORM with PostgreSQL 16 (Docker), migrations only (`synchronize: false`)
- Progress log: `docs/progress/fault-triage/progress_log.md`

## Objective

Charging stations are field devices that report faults, like lifts. Show three things operators of
field fleets need, in the same synthetic charging domain:

1. **Fault normalisation.** Stations report faults through OCPP 1.6 `StatusNotification`: a standard
   `errorCode` plus a free-text `vendorErrorCode`. Four fictional vendors each speak their own code
   dialect. A zod-based normaliser maps all of them into one canonical taxonomy: `component`,
   `severity`, `requiresSiteVisit`, `taxonomyCode` (ADR 0008).
2. **Agent-in-the-loop triage.** When a fault arrives, a drafting agent proposes a maintenance
   ticket (probable cause, taxonomy class, suggested action). An operator approves, edits or rejects
   it in a back-office screen; every decision lands in an append-only audit log (ADR 0010).
3. **Telemetry into device state.** A small simulator streams station status every few seconds; a
   rollup turns raw samples into station state with alerts ("Station st-003 needs a visit").
4. **One small backend service.** Points 1–3 live in `services/triage` (NestJS + PostgreSQL +
   TypeORM, GraphQL), reached only through the existing Nuxt BFF, in an npm-workspaces mono-repo
   (ADR 0009).

## Out of scope

Real hardware, a real OCPP websocket server (OCPP messages are simulated as JSON payloads), real
vendor names or code tables, real operator data, field-engineer dispatch/scheduling, notifications,
authentication changes beyond passing the existing session's actor to the service.

## Execution rules

1. Follow `AGENTS.md`: tests first, contracts at the boundary, axe per new route, tokens only,
   status never conveyed by colour alone.
2. Every new BFF endpoint gets a schema in `shared/contracts/` and a contract test with an invalid case.
3. All vendors, codes, stations and operators are synthetic. Do not name real manufacturers.
4. The rules-based drafter is the default. The Claude drafter is optional, env-gated
   (`ANTHROPIC_API_KEY`), and its output is validated with zod and falls back to rules when invalid.
   Tests never call the network.
5. Human decision 2026-10-25: packages are executed by agents in waves; agents commit only to their
   own `fault-triage/wp-NN` branch; the orchestrator merges into `feat/fault-triage`. Nothing is
   pushed. Per-package human acceptance is waived for this initiative; the human reviews the
   integrated result.
6. Update the progress log after every package (Status, Decisions, handoff).
