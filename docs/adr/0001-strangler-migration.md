# ADR 0001: Incremental migration with a strangler proxy

**Status:** accepted (demo)

## Context

A business-critical, server-side rendered frontend is tightly coupled to a
monolithic backend. A big-bang rewrite would freeze feature work and carry all
the delivery risk at once. In this repo the monolith is a stand-in
(`legacy/server.mjs`); in a real system it would be the PHP application.

## Decision

Put Nuxt in front of the monolith on the same origin.

1. **Routing table is the migration plan.** `routeRules` in `nuxt.config.ts`
   proxies every not-yet-migrated route to the legacy backend. A route is
   migrated by adding a page under `app/pages/` and deleting its proxy line.
   Rolling back is re-adding the line.
2. **Contracts at the boundary.** Legacy JSON is parsed with zod schemas in
   `shared/contracts/` inside a BFF handler (`server/api/`). Drift fails at the
   edge with a 502, not inside a component.
3. **Same origin, so sessions and cookies keep working.** No CORS, no second login.
4. **One shared design-token layer** (`app/assets/css/tokens.css`) that tenants
   override per `data-tenant`, so migrated and future pages look consistent.
5. **Every migrated route ships with an axe check** in E2E. Legacy pages are
   deliberately excluded: they are the baseline being replaced.

## Consequences

- Legacy and new pages are full-page navigations from one to the other until
  both sides are migrated (the nav uses plain anchors for legacy links).
- The proxy hop adds latency; acceptable for a transition period.
- Migration order should follow user value and risk, not page count. Read-only
  list views (stations) go first; billing-affecting flows go last.

## Not decided yet

Auth hand-over, shared layout chrome between legacy and Nuxt pages, and cache
rules on proxied routes.
