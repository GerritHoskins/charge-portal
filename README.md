# charge-portal-nuxt

A small, public-safe demo of **incrementally migrating a server-side rendered, monolith-coupled portal to Nuxt 4 + TypeScript**, using an EV-charging operator portal as the domain (stations, sessions, invoices). All data is synthetic; it is not affiliated with any company.

The point is the migration approach, not the feature count: typed contracts at the backend boundary, a runtime rollout/rollback switch, a token-based design system with white-label tenants and i18n, and accessibility and tests enforced per migrated route.

## Run

```bash
npm install
npx playwright install chromium   # first time only
npm run dev                       # legacy stand-in :8080 + Nuxt :3000
npm run check                     # lint, typecheck, tokens, inventory, unit + coverage, E2E, bundle budget
```

Open <http://localhost:3000/portal/stations> and log in with the synthetic demo account `demo` / `demo-password`. Try `?tenant=stadtwerke-demo` or `?tenant=fleet-demo` for white-label theming, and the language switcher in the header (German is the default, English follows the browser).

Against the PHP twin of the legacy stand-in: `docker compose up --build` (see "Honest limits": not run in the session that wrote it).

## How it works

| Route | Served by | Status |
|---|---|---|
| `/login`, `/logout` | Nuxt page + form handlers (CSRF, throttling); the **session stays owned by legacy** | migrated (ADR 0004) |
| `/portal/stations`, `/portal/sessions` | Nuxt pages | migrated |
| `/portal/invoices`, `/portal/invoices/:id/dispute` | Nuxt pages + BFF `POST` (`server/api/invoices/`) | migrated: list plus an accessible dispute form (ADR 0003) |
| `/api/v1/*` | legacy JSON API, consumed by the BFF through `shared/contracts` | deliberately stays |

`npm run migration:status` prints the progress from `docs/migration-routes.json` (the inventory; `-- --check` fails when it drifts from the repo).

Decision records: [0001 strangler migration](docs/adr/0001-strangler-migration.md), [0002 auth hand-over](docs/adr/0002-auth-hand-over.md), [0003 accessible dispute form](docs/adr/0003-accessible-dispute-form.md), [0004 login in Nuxt, CSRF, rate limiting](docs/adr/0004-login-in-nuxt.md), [0005 rollout and rollback](docs/adr/0005-rollout-and-rollback.md), [0006 i18n](docs/adr/0006-i18n.md). Working agreements: [CONTRIBUTING](CONTRIBUTING.md), [migration playbook](docs/migration-playbook.md), [accessibility checks](docs/accessibility-checks.md).

Rollback without a deploy: `NUXT_ROLLOUT="/portal/invoices=0"` sends everybody back to the legacy page for that route; `=50` serves half of the users from Nuxt (sticky per session). Details and limits in ADR 0005.

Gotcha: Playwright reuses servers already listening on its ports. A stale legacy process serving old endpoints makes tests fail confusingly; stop it, or move the whole stack: `NUXT_IGNORE_LOCK=1 E2E_APP_PORT=3100 E2E_LEGACY_PORT=8180 npx playwright test`.

## Honest limits

- The "legacy monolith" is a small Node server rendering deliberately dated HTML. `legacy-php/` is a PHP twin with a Dockerfile and `docker-compose.yml`, **written but never executed** (no PHP or running Docker daemon was available); `E2E_LEGACY_ORIGIN=http://localhost:8080 npx playwright test --project=contract` is the check that tells whether it matches.
- Auth: in-memory sessions, one demo account. CSRF tokens and the login throttle are in process memory (single instance); legacy's own `/login` has no such protection and must not be reachable from the internet (ADR 0004).
- Accessibility: automated checks only (axe, contrast unit tests, keyboard tests). **No manual screen-reader pass has been done**; the checklist in `docs/accessibility-checks.md` is the plan, with every row marked "not performed".
- i18n covers all pages; validation messages from legacy stay German (ADR 0006).
- Rollout has no metrics dashboard or automatic rollback, and legacy pages do not share the Nuxt header (ADR 0005).
- Mobile: responsive with plain CSS and tested at 320/375 px in headless Chromium only; no real-device run. Wide tables scroll horizontally inside their region instead of reflowing into cards, so on a phone some columns need a sideways swipe (there is no scroll hint). The posting names no UI library, so none was added.
- Design tokens are generated from `tokens/tokens.json`; a Figma/Tokens Studio sync into that file is not implemented.
- No visual-regression testing (screenshot baselines differ per OS and would be flaky between Windows and the Linux CI).
- Invoices are synthetic and the dispute is only recorded in memory (no payment, no PDF).

## Mapping to the role

| What the role asks for | Where it is shown here |
|---|---|
| Incremental migration of an SSR frontend coupled to a monolithic backend to a Vue architecture | ADR 0001, route inventory + `migration:status`, [playbook](docs/migration-playbook.md) |
| Own delivery risk | Runtime rollout/rollback switch with sticky buckets (ADR 0005), legacy fallback pages, contract suite against the real backend |
| Own delivery risk of the riskiest slice (auth) | Shared session cookie, server-side guard, then login/logout in Nuxt with CSRF + throttling (ADR 0002, 0004) |
| Define boundaries and contracts between frontend and backend | `shared/contracts/` (zod), BFF parsing, unit tests with invalid cases, `tests/e2e/contract.spec.ts` against live legacy |
| Frontend standards: UI consistency, accessibility, testing, performance, code quality | [CONTRIBUTING](CONTRIBUTING.md) table mapping each standard to its enforcement: ESLint (`--max-warnings 0`), coverage floor, axe per route, bundle budget, Lighthouse CI, strict TS |
| Reusable component library and design-system integration | `app/components/ds/` (Badge, Button, Alert, TextField, DataTable) consuming generated tokens, documented in Storybook, axe per story and tenant |
| White-label frontends in customer branding | `data-tenant` token overrides, AA contrast unit-tested and axe-checked per tenant |
| Vue, Nuxt, TypeScript | Nuxt 4, Vue 3 `<script setup>`, strict TS, `@nuxtjs/i18n` |
| Unit and E2E tests, WCAG | Vitest + Vue Test Utils, Playwright + axe (WCAG 2.2 AA tags), keyboard-only flows |
| Mentoring and standards without formal authority | CONTRIBUTING, PR template, playbook, ADRs that state value and limits |
| Link technical decisions to user value | "User and business value" section in every ADR |
| AI in daily engineering with risks controlled | `AGENTS.md`: tests first, human review of every diff |

## Design system and performance

- `npm run storybook` starts Storybook (Vue 3 + Vite) with a toolbar to switch the white-label tenant. Stories live next to components (`*.stories.ts`).
- `tests/e2e/storybook.spec.ts` runs axe against every story of every component in every tenant theme, so a token change that breaks contrast fails before it reaches a page. `tests/unit/tokens.test.ts` checks the same contrast pairs numerically.
- `npm run budget` builds and fails if gzipped client JS exceeds `JS_BUDGET_KB` (default 120). It measures bundle size only; it is not a Lighthouse or Core Web Vitals check. After adding i18n it measured 115.8 KB, so there is little headroom left.
- `npm run lighthouse` runs Lighthouse CI against the production build, logged in, for four routes (3 runs each, median asserted): performance >= 90, accessibility = 100, best practices >= 90, LCP <= 2.5 s, CLS <= 0.1, TBT <= 300 ms, on Lighthouse's default mobile emulation with simulated throttling. These are lab numbers on a demo app, not field data. It has **not been re-run since the design-system and i18n changes**.
- `.github/workflows/ci.yml` runs `npm run check` and then Lighthouse CI.

## Roadmap

1. Run the manual accessibility checklist with real assistive technology and record the results.
2. Execute and fix the PHP twin (`legacy-php/`) against `contract.spec.ts`.
3. Rollout metrics (error rate per variant) and automatic rollback.
4. Share header/navigation chrome between legacy and Nuxt pages.
5. Error codes in the dispute validation contract so legacy messages can be translated.
