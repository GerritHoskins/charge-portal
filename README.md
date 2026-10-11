# charge-portal-nuxt

A small, public-safe demo of **incrementally migrating a server-side rendered, monolith-coupled portal to Nuxt 4 + TypeScript**, using an EV-charging operator portal as the domain (stations, sessions, invoices). All data is synthetic; it is not affiliated with any company.

The point is the migration approach, not the feature count: a strangler proxy, typed contracts at the backend boundary, a token-based design system with white-label tenants, and accessibility and tests enforced per migrated route.

## Run

```bash
npm install
npx playwright install chromium   # first time only
npm run dev                       # legacy stand-in :8080 + Nuxt :3000
npm run check                     # typecheck + unit + E2E
```

Open <http://localhost:3000/portal/stations>. Try `?tenant=stadtwerke-demo` or `?tenant=fleet-demo` for white-label theming.

## How it works

| Route | Served by | Status |
|---|---|---|
| `/portal/stations` | Nuxt page (`app/pages/portal/stations`) | migrated |
| `/portal/sessions` | legacy, proxied via `routeRules` | not migrated |
| `/portal/invoices` | legacy, proxied via `routeRules` | not migrated |

Decision record: [`docs/adr/0001-strangler-migration.md`](docs/adr/0001-strangler-migration.md).

Honest limits: the "legacy monolith" is a ~50-line Node server rendering deliberately dated HTML, standing in for a PHP application. Auth, real data and a shared layout between legacy and Nuxt pages are not modelled.

## Mapping to the role

| What the role asks for | Where it is shown here |
|---|---|
| Incremental migration of an SSR frontend coupled to a monolithic backend to a Vue architecture | Strangler proxy in `nuxt.config.ts`, ADR 0001 |
| Define boundaries and contracts between frontend and backend | `shared/contracts/` (zod), parsed in `server/api/stations.get.ts`, contract tests |
| Frontend standards: UI consistency, accessibility, testing, performance, code quality | Tokens, axe E2E per migrated route, `AGENTS.md`, strict TS; performance budgets are still open (see roadmap) |
| Reusable component library and design-system integration | `app/components/ds/` consuming `tokens.css`; Storybook is on the roadmap |
| White-label frontends in customer branding | `data-tenant` token overrides, AA checked per tenant |
| Vue, Nuxt, TypeScript | Nuxt 4, Vue 3 `<script setup>`, strict TS |
| Unit and E2E tests, WCAG | Vitest + Vue Test Utils, Playwright + axe (WCAG 2.2 AA tags) |
| AI in daily engineering with risks controlled | `AGENTS.md`: tests first, human review of every diff |

## Roadmap

1. Migrate `/portal/sessions` (list + detail) and delete its proxy rule: the commit history becomes the migration story.
2. Storybook for `ds/` components, with an axe addon.
3. Performance budget in CI (Lighthouse CI or bundle-size check).
4. A Direct-Payment/receipt style flow with accessible form validation.
5. Auth hand-over between legacy and Nuxt (cookie session) as a second ADR.
6. Optional: replace the Node stand-in with real PHP in Docker.
