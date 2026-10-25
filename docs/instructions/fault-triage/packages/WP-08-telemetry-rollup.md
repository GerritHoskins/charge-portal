# WP-08 — Telemetry simulator and station-state rollup with alerts

**Depends on:** WP-01, WP-02.
**Execution status:** maintained in the designated progress log.
**Progress log:** `docs/progress/fault-triage/progress_log.md`

## Goal

A small simulator streams synthetic station telemetry every few seconds; the triage service rolls
samples up into a per-station state (`ok | degraded | needs-visit | offline`) with alerts, so raw
signal becomes "Station st-003 needs a visit". No real hardware.

## Read

- ADR 0008, `packages/context.md`, `legacy/data.mjs` (station ids), WP-02 handoff,
  `packages/fault-taxonomy/src/index.ts` exports.

## Files you may change

`services/triage/src/telemetry/**` (new), `services/triage/src/app.module.ts` (register module only),
`services/triage/src/migrations/**` (new migration only), `services/triage/schema.gql`,
`services/triage/test/**`, `scripts/telemetry-simulator.mjs` (new), `tests/unit/telemetry-simulator.test.ts`
(new), root `package.json` (`simulate:telemetry` script only), the progress log.

## Design

- Sample: `{ stationId, at, status (OCPP status), temperatureC, powerKw, faultClass? }`, validated
  with zod (schema in the telemetry module; reuse taxonomy schemas for `faultClass`).
- Pure function `rollupStationState(prev: StationState | null, sample, now): StationState` in
  `telemetry/rollup.ts`. Rules (constants exported, unit tested at each boundary):
  - `needs-visit` if the latest fault class has `requiresSiteVisit`, **or** ≥ 3 faults of the same
    `taxonomyCode` within 30 minutes, **or** `temperatureC ≥ 70` for 3 consecutive samples.
  - `degraded` if a minor/major fault without site visit is active, or `temperatureC ≥ 60`.
  - `offline` is computed at read time: no sample for 3 × interval (`TELEMETRY_INTERVAL_MS`,
    default 5000) → `offline` regardless of stored state.
  - `ok` otherwise; recovery to `ok` requires a non-faulted status and no rule above firing.
  - Each transition adds an `Alert { id, stationId, kind, message, raisedAt, clearedAt? }`; message is
    a short English sentence (UI translates by `kind`).
- Persistence: `station_state` (one row per station, upsert) and `station_alert` tables.
- GraphQL: `ingestTelemetry(sample: JSON!): StationState`, `stationStates: [StationState!]!`
  (with active alerts), `stationState(stationId: ID!)`.
- `scripts/telemetry-simulator.mjs`: Node script, no new deps; `--interval`, `--stations`
  (default st-001..st-005, matching the legacy seed), `--seed` for a deterministic PRNG, `--once`;
  posts GraphQL mutations to `TRIAGE_ORIGIN` with `x-internal-token`. Scenario: st-003 develops a
  recurring connector-lock fault, st-005 stops reporting, st-002 heats up; others stay healthy.
  Faults are sent as OCPP notifications to `ingestFault` too (from WP-01 fixtures) so tickets appear.
  Export the pure sample generator for the unit test.

## Acceptance criteria

- [ ] Tests first: rollup unit tests at every threshold boundary (2 vs 3 faults, 59/60/69/70 °C,
      consecutive vs interrupted hot samples, offline at 3× interval, recovery); integration test
      (`triage_wp08`) ingesting a sequence → `needs-visit` with alert, then recovery clears it;
      simulator unit test: same seed → same sample sequence, scenario reaches needs-visit for st-003.
- [ ] `npm run check -w @charge-portal/triage`, root `npm run lint`, `npm run typecheck`,
      `npx vitest run tests/unit/telemetry-simulator.test.ts` pass.
- [ ] Commit on `fault-triage/wp-08`; progress-log handoff recorded.

## Verification commands

`docker exec fault-triage-postgres createdb -U triage triage_wp08`; service check with
`TRIAGE_DATABASE_URL=.../triage_wp08`; `npx vitest run tests/unit/telemetry-simulator.test.ts`.

## Blockers and handoff

When blocked after two attempts on the same error, stop and report to the orchestrator.
