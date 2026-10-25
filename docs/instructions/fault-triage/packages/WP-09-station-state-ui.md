# WP-09 — Station state and alerts in the portal

**Depends on:** WP-06, WP-07, WP-08.
**Execution status:** maintained in the designated progress log.
**Progress log:** `docs/progress/fault-triage/progress_log.md`

## Goal

`/portal/stations` shows each station's live state and active alerts from the triage service next to
the existing legacy station data, so an operator sees "st-003 needs a visit" without reading telemetry.

## Read

- WP-06, WP-07 and WP-08 handoffs. `app/pages/portal/stations/index.vue`, `server/utils/triage.ts`,
  `shared/contracts/triage.ts`, `tests/e2e/portal.spec.ts`, `tests/e2e/triage.spec.ts`,
  `services/triage/schema.gql` (station state part).

## Files you may change

`shared/contracts/triage.ts` (station-state schemas), `tests/unit/triage-contract.test.ts`,
`server/api/triage/stations/state.get.ts` (new), `app/pages/portal/stations/index.vue`,
`app/components/triage/**`, `i18n/locales/de.json`, `en.json`, `services/triage/src/seed/**`
(seed telemetry for E2E), `tests/e2e/stations-state.spec.ts` (new), `tests/e2e/portal.spec.ts`
(only if existing stations assertions must change), the progress log.

## Design

- Contract `stationStateSchema` (`stationId`, `state`, `updatedAt`, `alerts: alertSchema[]`) and
  `stationStateListResponseSchema`; invalid cases in the contract test.
- BFF `GET /api/triage/stations/state` via `fetchTriage`. If the triage service is unavailable,
  the stations page still renders legacy data and shows a non-blocking `DsAlert` ("live state
  unavailable"); the existing stations E2E must keep passing.
- Page: add a "Live state" column (badge with text + icon, never colour alone) and an alerts region
  above the table listing `needs-visit` and `offline` stations first, each linking to the station's
  draft tickets in `/portal/triage?station=<id>` (add the query filter to the triage queue if it is
  a small change within `app/pages/portal/triage/index.vue`; otherwise omit the link and note it).
- Alert messages translated by `kind` in i18n, not displayed from the service's English text.

## Acceptance criteria

- [ ] Tests first: contract tests; E2E with seeded telemetry → st-003 shows "needs visit" and
      appears in the alert region; triage service down → page renders with the unavailable alert;
      axe on the stations page in default and both tenants.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage`, and
      `npx playwright test tests/e2e/stations-state.spec.ts tests/e2e/portal.spec.ts` pass
      (this package runs alone).
- [ ] Commit on `fault-triage/wp-09`; progress-log handoff recorded.

## Verification commands

As in the acceptance criteria.

## Blockers and handoff

When blocked after two attempts on the same error, stop and report to the orchestrator.
