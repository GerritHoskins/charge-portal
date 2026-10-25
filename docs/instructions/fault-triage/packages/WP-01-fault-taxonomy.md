# WP-01 — `@charge-portal/fault-taxonomy`: OCPP schemas, vendor tables, `normalise()`

**Depends on:** WP-00.
**Execution status:** maintained in the designated progress log.
**Progress log:** `docs/progress/fault-triage/progress_log.md`

## Goal

A workspace package that parses OCPP 1.6 `StatusNotification` payloads from four fictional vendors
and normalises each fault into the canonical taxonomy of ADR 0008, with exhaustive tests.

## Read

- `docs/adr/0008-fault-normalisation-taxonomy.md` (the decision you implement).
- `shared/contracts/catalog.ts` header + `toShopProduct` (two-layer schema pattern), `shared/contracts/station.ts`.
- `tests/unit/station-contract.test.ts` (test pattern).

## Files you may change

Everything under `packages/fault-taxonomy/` (new), `package-lock.json`, the progress log.

## Design (implement exactly)

- Package `@charge-portal/fault-taxonomy`, `"type": "module"`, TypeScript source exported directly
  via `"exports": { ".": "./src/index.ts" }` (consumers are Vite/Nitro and Nest via tsx/ts-node; if
  Nest in WP-02 needs JS, WP-02 adds a build step, not this package). Own `tsconfig.json`,
  `vitest.config.ts` (coverage ≥ 95% lines on `src/**`), and scripts `test`, `typecheck`, `lint`
  (reuse root ESLint config), and `check` = typecheck + lint + test with coverage. zod as a
  dependency at the same major as the root.
- `src/ocpp.ts`: `ocppErrorCodeSchema` (the 16 OCPP 1.6 values in `context.md`),
  `ocppStatusSchema` (`Available, Preparing, Charging, SuspendedEVSE, SuspendedEV, Finishing,
  Reserved, Unavailable, Faulted`), `ocppStatusNotificationSchema` = `{ stationId, connectorId:
  int ≥ 0, errorCode, status, timestamp: iso datetime, info?: ≤50, vendorId?: ≤255,
  vendorErrorCode?: ≤50 }`.
- `src/taxonomy.ts`: `componentSchema`, `severitySchema`, `taxonomyCodeSchema` (regex
  `^[A-Z]{3}\.[A-Z_]+$` or literal `UNCLASSIFIED`), `faultClassSchema`, and a frozen `TAXONOMY`
  catalogue of ~15–20 classes (`CON.LOCK_FAILURE`, `CON.CABLE_DAMAGE`, `PWR.OVERCURRENT`,
  `PWR.MODULE_FAILURE`, `PWR.OVERVOLTAGE`, `PWR.UNDERVOLTAGE`, `GRD.GROUND_FAULT`,
  `MTR.METER_FAILURE`, `COM.EV_HANDSHAKE`, `COM.BACKEND_LINK`, `COM.WEAK_SIGNAL`,
  `RFD.READER_FAILURE`, `FWR.RESET_FAILURE`, `FWR.CRASH`, `THM.OVER_TEMPERATURE`,
  `THM.FAN_FAILURE`, `UNCLASSIFIED`). Each has component, severity, requiresSiteVisit; choose
  plausible values and document the reasoning briefly in a comment per area.
- `src/vendors/*.ts`: four fictional vendors (no real brands), each a zod-validated table:
  - `voltreon`: numeric codes as strings (`"1012"`).
  - `kestrel-ev`: prefixed codes (`"KST-E-0042"`).
  - `lumenwatt`: free-text phrases (`"Lock motor stalled"`), matched after trim + lower-case.
  - `orbis-power`: hex codes (`"0x1F04"`), matched case-insensitively.
  6–10 codes each, overlapping classes across vendors so the same class arrives in four spellings.
- `src/normalise.ts`: `normalise(raw: unknown)` → parses with `ocppStatusNotificationSchema`
  (throws `ZodError` on invalid input) and returns `{ fault: FaultClass, source: 'vendor-table' |
  'ocpp-default' | 'unclassified', raw }`. Precedence: vendor table → OCPP default map (`NoError`
  → returns `null` fault meaning "no fault"; `OtherError`/`InternalError` have **no** default) →
  `UNCLASSIFIED` with `severity: 'major'`, `requiresSiteVisit: true`.
- `src/fixtures.ts`: exported synthetic sample notifications per vendor (used by WP-03 and the
  simulator), including at least one unknown code per vendor.

## Acceptance criteria

- [ ] Tests written first and observed failing: schema accept/reject cases (unknown errorCode,
      vendorErrorCode > 50 chars, missing timestamp, negative connectorId), every table entry maps
      to a class in `TAXONOMY`, same class reached from all four vendor spellings, precedence order,
      free-text/hex case-insensitivity, `NoError` → no fault, unknown → `UNCLASSIFIED`.
- [ ] `npm run check -w @charge-portal/fault-taxonomy` passes; root `npm run lint` and
      `npm run typecheck` still pass.
- [ ] No real manufacturer names anywhere.
- [ ] Commit on `fault-triage/wp-01`; progress-log handoff recorded.

## Verification commands

`npm install`, `npm run check -w @charge-portal/fault-taxonomy`, `npm run lint`, `npm run typecheck`.

## Blockers and handoff

When blocked after two attempts on the same error, stop and report to the orchestrator.
