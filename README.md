# charge-portal-nuxt

A small, public-safe demo of **incrementally migrating a server-side rendered, monolith-coupled portal to Nuxt 4 + TypeScript**, using an EV-charging operator portal as the domain (stations, sessions, invoices). All data is synthetic; it is not affiliated with any company.

The point is the migration approach, not the feature count: typed contracts at the backend boundary, a runtime rollout/rollback switch, a token-based design system with white-label tenants and i18n, and accessibility and tests enforced per migrated route.

## Run

```bash
npm install
npx playwright install chromium   # first time only
npm run dev                       # legacy stand-in :8080 + Nuxt :3000
npm run check                     # lint, typecheck, workspace checks, tokens, inventory, unit + coverage, E2E, bundle budget
```

`npm run dev` does not start the triage service, so the Nuxt app alone shows the migrated pages, but the live state on `/portal/stations` is unavailable and the triage pages cannot load tickets. `npm run check` needs PostgreSQL (workspace integration tests and E2E). See "Fault triage" below for both.

Open <http://localhost:3000/portal/stations> and log in with the synthetic demo account `demo` / `demo-password`. Try `?tenant=stadtwerke-demo` or `?tenant=fleet-demo` for white-label theming, and the language switcher in the header (German is the default, English follows the browser).

Against the PHP twin of the legacy stand-in: `docker compose up --build` (see "Honest limits": not run in the session that wrote it).

## How it works

| Route | Served by | Status |
|---|---|---|
| `/login`, `/logout` | Nuxt page + form handlers (CSRF, throttling); the **session stays owned by legacy** | migrated (ADR 0004) |
| `/portal/stations`, `/portal/sessions` | Nuxt pages; stations also shows live state from the triage service | migrated |
| `/portal/invoices`, `/portal/invoices/:id/dispute` | Nuxt pages + BFF `POST` (`server/api/invoices/`) | migrated: list plus an accessible dispute form (ADR 0003) |
| `/portal/triage`, `/portal/triage/:id` | Nuxt pages + BFF routes `server/api/triage/` over the triage service | new, Nuxt-native, no legacy page (ADR 0010) |
| `/api/v1/*` | legacy JSON API, consumed by the BFF through `shared/contracts` | deliberately stays |

`npm run migration:status` prints the progress from `docs/migration-routes.json` (the inventory; `-- --check` fails when it drifts from the repo).

Decision records: [0001 strangler migration](docs/adr/0001-strangler-migration.md), [0002 auth hand-over](docs/adr/0002-auth-hand-over.md), [0003 accessible dispute form](docs/adr/0003-accessible-dispute-form.md), [0004 login in Nuxt, CSRF, rate limiting](docs/adr/0004-login-in-nuxt.md), [0005 rollout and rollback](docs/adr/0005-rollout-and-rollback.md), [0006 i18n](docs/adr/0006-i18n.md), [0007 public shop and budgets](docs/adr/0007-public-shop-and-budgets.md), [0008 fault normalisation taxonomy](docs/adr/0008-fault-normalisation-taxonomy.md), [0009 triage service stack](docs/adr/0009-triage-service-stack.md), [0010 agent-in-the-loop triage](docs/adr/0010-agent-in-the-loop-triage.md). Working agreements: [CONTRIBUTING](CONTRIBUTING.md), [migration playbook](docs/migration-playbook.md), [accessibility checks](docs/accessibility-checks.md).

Rollback without a deploy: `NUXT_ROLLOUT="/portal/invoices=0"` sends everybody back to the legacy page for that route; `=50` serves half of the users from Nuxt (sticky per session). Details and limits in ADR 0005.

Gotcha: Playwright reuses servers already listening on its ports. A stale legacy process serving old endpoints makes tests fail confusingly; stop it, or move the whole stack: `NUXT_IGNORE_LOCK=1 E2E_APP_PORT=3100 E2E_LEGACY_PORT=8180 npx playwright test`.

## Fault triage

A back-office slice on top of the migrated portal: charging-station faults are normalised to one taxonomy, an agent drafts a ticket, an operator approves, edits or rejects it, and every step lands in an audit log (ADR 0008 to 0010). The browser never talks to the service; Nuxt server routes do.

| Path | What |
|---|---|
| `packages/fault-taxonomy/` | `@charge-portal/fault-taxonomy`: OCPP 1.6 `StatusNotification` schemas, four fictional vendor code tables, the canonical taxonomy, `normalise()` |
| `services/triage/` | `@charge-portal/triage`: NestJS + GraphQL (code-first, `schema.gql` committed) + PostgreSQL/TypeORM. Modules `faults`, `tickets`, `audit`, `drafting`, `telemetry`, `health`; [service README](services/triage/README.md) |
| `shared/contracts/triage.ts`, `shared/contracts/triage-rules.ts` | zod contracts for the BFF; zero-dependency form rules for the browser |
| `server/utils/triage.ts`, `server/api/triage/` | `fetchTriage` (token + `x-actor`, contract parsing, error mapping) and the BFF routes |
| `app/pages/portal/triage/`, `app/components/triage/` | queue and review screens, audit trail, state badges |
| `scripts/telemetry-simulator.mjs` | synthetic station telemetry (`npm run simulate:telemetry`) |

Routes: `/portal/triage` (queue, filter by state, `?station=<id>`), `/portal/triage/:id` (fault, draft, decision, audit trail), and on `/portal/stations` a live-state column plus a "Handlungsbedarf" region. BFF: `GET /api/triage/tickets`, `GET /api/triage/tickets/:id`, `POST /api/triage/tickets/:id/decision` (JSON body: approve, edit or reject), `GET /api/triage/stations/state`.

Start it (the credentials and the token are synthetic development values; `nuxt.config.ts` defaults to the same token):

```bash
docker compose up -d postgres                                  # PostgreSQL 16 on :5432
export TRIAGE_DATABASE_URL=postgres://triage:triage@localhost:5432/triage
export TRIAGE_INTERNAL_TOKEN=synthetic-dev-internal-token
npm run dev -w @charge-portal/triage                           # service on http://127.0.0.1:4100/graphql, migrations run at startup
npm run seed -w @charge-portal/triage                          # 12 synthetic OCPP faults -> draft tickets (every run adds 12 more)
npm run simulate:telemetry                                     # station telemetry every 5 s: st-002 heats up, st-003 repeats a lock fault, st-005 goes silent
npm run dev                                                    # second terminal: legacy + Nuxt
```

`docker compose up postgres triage` runs the service in a container instead (loopback only); the compose `nuxt` container is not pointed at it. Tests: the integration tests wipe the `public` schema of `TRIAGE_DATABASE_URL`, so use a separate database (`docker compose exec postgres createdb -U triage triage_test`) for `npm run check`; the service refuses to wipe a database named exactly `triage` unless `CI=true` or `TRIAGE_ALLOW_DB_RESET=1`. Playwright starts its own service against a throwaway `triage_e2e` database (`playwright.config.ts`). CI provides Postgres as a service container.

| Variable | Read by | Default | Purpose |
|---|---|---|---|
| `TRIAGE_DATABASE_URL`, `TRIAGE_INTERNAL_TOKEN` | service | required | PostgreSQL URL; shared secret expected as `x-internal-token` |
| `TRIAGE_PORT`, `TRIAGE_HOST` | service | `4100`, `127.0.0.1` | listen address |
| `TELEMETRY_INTERVAL_MS` | service, simulator | `5000` | expected sample interval; a station is offline after 3 intervals without a sample |
| `ANTHROPIC_API_KEY` | service | unset | enables Claude drafts; unset means the deterministic rules provider |
| `TRIAGE_DRAFT_MODEL`, `TRIAGE_DRAFT_TIMEOUT_MS` | service | `claude-sonnet-5-5`, `15000` | only used with a key |
| `NUXT_TRIAGE_ORIGIN`, `NUXT_TRIAGE_INTERNAL_TOKEN` | Nuxt server | `http://127.0.0.1:4100`, the synthetic dev token | where the BFF finds the service and the token it sends |
| `TRIAGE_ORIGIN`, `TRIAGE_INTERNAL_TOKEN` | simulator | `http://127.0.0.1:4100`, required | target and token of `npm run simulate:telemetry` |

The BFF sends the logged-in user's name from the legacy session as `x-actor`; that name ends up in the audit log. `docker-compose.yml` does not forward the Claude variables.

## Honest limits

- The "legacy monolith" is a small Node server rendering deliberately dated HTML. `legacy-php/` is a PHP twin with a Dockerfile and `docker-compose.yml`, **written but never executed** (no PHP or running Docker daemon was available); `E2E_LEGACY_ORIGIN=http://localhost:8080 npx playwright test --project=contract` is the check that tells whether it matches.
- Auth: in-memory sessions, one demo account. CSRF tokens and the login throttle are in process memory (single instance); legacy's own `/login` has no such protection and must not be reachable from the internet (ADR 0004).
- Accessibility: automated checks only (axe, contrast unit tests, keyboard tests). **No manual screen-reader pass has been done**; the checklist in `docs/accessibility-checks.md` is the plan, with every row marked "not performed".
- i18n covers all pages; validation messages from legacy stay German (ADR 0006).
- Rollout has no metrics dashboard or automatic rollback, and legacy pages do not share the Nuxt header (ADR 0005).
- Mobile: responsive with plain CSS and tested at 320/375 px in headless Chromium only; no real-device run. Wide tables scroll horizontally inside their region instead of reflowing into cards, so on a phone some columns need a sideways swipe (there is no scroll hint). No UI library was added; components are built on the project's own tokens.
- Design tokens are generated from `tokens/tokens.json`; a Figma/Tokens Studio sync into that file is not implemented.
- No visual-regression testing (screenshot baselines differ per OS and would be flaky between Windows and the Linux CI).
- Invoices are synthetic and the dispute is only recorded in memory (no payment, no PDF).
- Fault triage is a simulation. There is no OCPP WebSocket endpoint and no real charger: OCPP 1.6 `StatusNotification` messages and telemetry samples are JSON posted to the GraphQL API by `npm run seed` and `scripts/telemetry-simulator.mjs`. Vendors, codes and stations are fictional (ADR 0008).
- The triage service trusts a shared internal token plus an `x-actor` header set by the BFF; this is not end-user authentication, and the service must not be exposed publicly (ADR 0009). The default token is a synthetic value committed in `nuxt.config.ts` and `docker-compose.yml`. The decision route does not check a CSRF token; it relies on `SameSite=Lax` and accepting `application/json` only. Audit entries are append-only by construction in the code; the database has no trigger that would stop an UPDATE or DELETE.
- LLM drafting is optional and off by default (ADR 0010). The Claude provider has only been exercised with a fake client and a closed local port, **never against the live API**, and CI runs without a key. For the default model it sends `tool_choice: auto` plus an instruction because forcing the tool is reported to be rejected; that is unverified, and a failing call falls back to the rules provider. With a key, the station id, codes and the station's free-text `info` go to the Anthropic API. Draft text (cause, action) is English whatever the UI language; only the surrounding labels are translated.
- Live station state is fetched in the browser only, so it is empty in the server-rendered HTML and fills after hydration. It is read once per page visit and does not refresh. Reading it may record an `offline` alert in the service.
- The `?station=` filter of the ticket queue works on the already loaded tickets in the browser.
- The triage service needed two workarounds for npm hoisting: a root `overrides` entry and `services/triage/src/graphql/express5-apollo.driver.ts` (ADR 0009). The new screens have automated axe checks only, like the rest; no manual screen-reader pass.

## What this demonstrates

| Topic | Where it is shown here |
|---|---|
| Incremental migration of a server-rendered, monolith-coupled frontend to Nuxt | ADR 0001, route inventory + `migration:status`, [playbook](docs/migration-playbook.md) |
| Delivery risk control | Runtime rollout/rollback switch with sticky buckets (ADR 0005), legacy fallback pages, contract suite against the real backend |
| The riskiest slice first (auth) | Shared session cookie, server-side guard, then login/logout in Nuxt with CSRF + throttling (ADR 0002, 0004) |
| Contracts between frontend and backend | `shared/contracts/` (zod), BFF parsing, unit tests with invalid cases, `tests/e2e/contract.spec.ts` against live legacy |
| Frontend standards: accessibility, testing, performance, code quality | [CONTRIBUTING](CONTRIBUTING.md) table mapping each standard to its enforcement: ESLint (`--max-warnings 0`), coverage floor, axe per route, bundle budget, Lighthouse CI, strict TS |
| Reusable component library and design-system integration | `app/components/ds/` (Badge, Button, Alert, TextField, DataTable) consuming generated tokens, documented in Storybook, axe per story and tenant |
| White-label theming | `data-tenant` token overrides, AA contrast unit-tested and axe-checked per tenant |
| Vue, Nuxt, TypeScript | Nuxt 4, Vue 3 `<script setup>`, strict TS, `@nuxtjs/i18n` |
| Unit and E2E tests, WCAG | Vitest + Vue Test Utils, Playwright + axe (WCAG 2.2 AA tags), keyboard-only flows |
| Shared working agreements | CONTRIBUTING, PR template, playbook, ADRs that state value and limits |
| Decisions tied to user value | "User and business value" section in every ADR |
| A backend slice with an agent in the loop | `packages/fault-taxonomy` and `services/triage`: OCPP faults normalised to one taxonomy, drafted tickets, an operator decision, an append-only audit log, a deterministic drafter by default and an optional, validated Claude drafter (ADR 0008 to 0010) |
| AI in daily engineering with risks controlled | `AGENTS.md`: tests first, human review of every diff |

## Design system and performance

- `npm run storybook` starts Storybook (Vue 3 + Vite) with a toolbar to switch the white-label tenant. Stories live next to components (`*.stories.ts`).
- `tests/e2e/storybook.spec.ts` runs axe against every story of every component in every tenant theme, so a token change that breaks contrast fails before it reaches a page. `tests/unit/tokens.test.ts` checks the same contrast pairs numerically.
- `npm run budget` builds, prints the gzipped client JS total (informational: `JS_BUDGET_KB`, default 120) and then fails if any route's initial JS exceeds its entry in `scripts/route-budgets.json` (portal, triage and shop routes, ADR 0007; the triage pages are measured against a stand-in service, `scripts/lib/triage-stub.mjs`). It measures bundle size only; it is not a Lighthouse or Core Web Vitals check. **It currently exits 1** because `/shop/wallbox-home-7-4` is over its threshold: about 128.05 KB gz on main and 128.242 KB with the triage work, against 128.045 KB in `scripts/route-budgets.json` (ADR 0007 lists 128.0). That failure predates the triage work and no threshold was changed; the other routes pass, `/portal/stations` with about 0.7 KB of headroom.
- `npm run lighthouse` runs Lighthouse CI against the production build, logged in, for four routes (3 runs each, median asserted): performance >= 90, accessibility = 100, best practices >= 90, LCP <= 2.5 s, CLS <= 0.1, TBT <= 300 ms, on Lighthouse's default mobile emulation with simulated throttling. These are lab numbers on a demo app, not field data. It has **not been re-run since the design-system and i18n changes**.
- `.github/workflows/ci.yml` runs `npm run check` and then Lighthouse CI.

## Roadmap

1. Run the manual accessibility checklist with real assistive technology and record the results.
2. Execute and fix the PHP twin (`legacy-php/`) against `contract.spec.ts`.
3. Rollout metrics (error rate per variant) and automatic rollback.
4. Share header/navigation chrome between legacy and Nuxt pages.
5. Error codes in the dispute validation contract so legacy messages can be translated.
6. Triage: a first run of the Claude provider against the live API, service-to-service auth instead of the shared token, a database trigger for audit immutability, and refreshing live station state.
