# WP-07 — Back-office triage screens with axe E2E

**Depends on:** WP-06.
**Execution status:** maintained in the designated progress log.
**Progress log:** `docs/progress/fault-triage/progress_log.md`

## Goal

Operators see a queue of draft tickets at `/portal/triage`, open one at `/portal/triage/[id]`, and
approve, edit or reject it; the audit trail is visible; the screens pass axe and work by keyboard.

## Read

- ADR 0010 decision 5. `app/pages/portal/invoices/index.vue` and
  `app/pages/portal/invoices/[id]/dispute.vue` (list + accessible form patterns, ADR 0003),
  `app/components/ds/*` (props only), `i18n/locales/de.json` structure, `tests/e2e/portal.spec.ts`,
  `tests/e2e/invoices.spec.ts`, `playwright.config.ts`, `docs/migration-routes.json`,
  `scripts/migration-status.mjs`, `app/layouts/default.vue` (navigation), `shared/contracts/triage.ts`.

## Files you may change

`app/pages/portal/triage/**` (new), `app/components/triage/**` (new, with `.stories.ts`),
`app/layouts/default.vue` (nav link only), `i18n/locales/de.json`, `i18n/locales/en.json`,
`docs/migration-routes.json` (add `nuxt-native` entries citing ADR 0010), `playwright.config.ts`
(add the triage service + Postgres env to `webServer`), `services/triage/src/seed/**` (new: a
`seed` script that ingests the WP-01 fixtures for E2E), `services/triage/package.json` (seed script),
`tests/e2e/triage.spec.ts` (new), the progress log. `tokens/tokens.json` only if a needed token is
missing (then regenerate with `npm run tokens`).

## Design

- Queue: `DsDataTable` with station, taxonomy code + human label, severity (via `DsStatusBadge`-style
  badge with text, never colour alone), site-visit yes/no as text, provider, created time; link per
  row to the review screen. Filter by state (draft default).
- Review: fault panel (raw OCPP + vendor codes, normalised class, source), draft panel
  (probable cause, suggested action, taxonomy, site visit, confidence as percent text, provider),
  three actions. Edit uses `DsTextField`s + a taxonomy `<select>` with a visible label; reject opens
  a required reason field with inline error linked by `aria-describedby` and an error summary
  focused on submit (follow ADR 0003). After a decision, a polite live-region message and the
  audit trail (ordered list: time, actor, action, changed fields) update. Decided tickets render
  read-only.
- `useFetch` / `$fetch` against `/api/triage/*` only; send the CSRF token the way the dispute form
  does.
- Playwright: the triage service runs with a fresh database per run (`triage_e2e`, recreated by a
  setup step) seeded by the seed script.

## Acceptance criteria

- [ ] E2E written first (`tests/e2e/triage.spec.ts`): queue lists seeded drafts; approve flow; edit
      flow changes cause and shows "edited" in the audit trail; reject without reason shows an
      accessible error and does not submit; with reason → rejected; axe (wcag2a..wcag22aa) on queue
      and review in default and both tenants; keyboard-only completion of approve.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run migration:status -- --check`
      pass; `npx playwright test tests/e2e/triage.spec.ts` passes (this package runs alone, so E2E
      is allowed).
- [ ] Commit on `fault-triage/wp-07`; progress-log handoff recorded.

## Verification commands

`npx playwright test tests/e2e/triage.spec.ts`, `npm run lint`, `npm run typecheck`,
`npm run test:coverage`, `npm run migration:status -- --check`.

## Blockers and handoff

When blocked after two attempts on the same error, stop and report to the orchestrator.
