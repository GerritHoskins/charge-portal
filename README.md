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

Open <http://localhost:3000/portal/stations> and log in with the synthetic demo account `demo` / `demo-password`. Try `?tenant=stadtwerke-demo` or `?tenant=fleet-demo` for white-label theming.

## How it works

| Route | Served by | Status |
|---|---|---|
| `/portal/stations` | Nuxt page (`app/pages/portal/stations`) | migrated |
| `/portal/sessions` | Nuxt page (`app/pages/portal/sessions`) | migrated (see git history: proxy rule removed, legacy HTML page decommissioned) |
| `/portal/invoices` | legacy, proxied via `routeRules` | not migrated |
| `/login`, `/logout` | legacy (session owner), proxied | not migrated (ADR 0002) |

Decision records: [0001 strangler migration](docs/adr/0001-strangler-migration.md), [0002 auth hand-over](docs/adr/0002-auth-hand-over.md).

Gotcha: Playwright reuses servers already listening on :3000/:8080/:6006. A stale legacy process serving old endpoints makes tests fail confusingly; stop it first.

Honest limits: the "legacy monolith" is a ~50-line Node server rendering deliberately dated HTML, standing in for a PHP application. Auth is modelled minimally (in-memory sessions, one demo account, no CSRF token, no rate limiting; see ADR 0002). Real data and a shared layout between legacy and Nuxt pages are not modelled.

## Mapping to the role

| What the role asks for | Where it is shown here |
|---|---|
| Incremental migration of an SSR frontend coupled to a monolithic backend to a Vue architecture | Strangler proxy in `nuxt.config.ts`, ADR 0001 |
| Own delivery risk of the riskiest slice (auth) | Shared session cookie, server-side guard, open-redirect and logout tests, ADR 0002 |
| Define boundaries and contracts between frontend and backend | `shared/contracts/` (zod), parsed in `server/api/stations.get.ts`, contract tests |
| Frontend standards: UI consistency, accessibility, testing, performance, code quality | Tokens, axe E2E per migrated route, `AGENTS.md`, strict TS; bundle-size budget in `scripts/check-bundle-size.mjs` |
| Reusable component library and design-system integration | `app/components/ds/` consuming `tokens.css`, documented in Storybook with per-tenant axe checks |
| White-label frontends in customer branding | `data-tenant` token overrides, AA checked per tenant |
| Vue, Nuxt, TypeScript | Nuxt 4, Vue 3 `<script setup>`, strict TS |
| Unit and E2E tests, WCAG | Vitest + Vue Test Utils, Playwright + axe (WCAG 2.2 AA tags) |
| AI in daily engineering with risks controlled | `AGENTS.md`: tests first, human review of every diff |

## Design system and performance

- `npm run storybook` starts Storybook (Vue 3 + Vite) with a toolbar to switch the white-label tenant. Stories live next to components (`*.stories.ts`).
- `tests/e2e/storybook.spec.ts` runs axe against every story in every tenant theme, so a token change that breaks contrast fails before it reaches a page.
- `npm run budget` builds and fails if gzipped client JS exceeds `JS_BUDGET_KB` (default 120). It measures bundle size only; it is not a Lighthouse or Core Web Vitals check.
- `.github/workflows/ci.yml` runs `npm run check` (typecheck, unit, E2E incl. Storybook a11y, budget). It has not been run on GitHub yet.

## Roadmap

1. Migrate `/portal/invoices` (billing-affecting, so last and with the most tests).
2. Real-user-style performance checks (Lighthouse CI) on top of the bundle budget.
3. A Direct-Payment/receipt style flow with accessible form validation.
4. Move login/logout into Nuxt (second migration of the session owner), with CSRF token and rate limiting.
5. Optional: replace the Node stand-in with real PHP in Docker.
