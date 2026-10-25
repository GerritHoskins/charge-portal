# WP-03 — Fault ingest and rules-based ticket drafts

**Depends on:** WP-01, WP-02.
**Execution status:** maintained in the designated progress log.
**Progress log:** `docs/progress/fault-triage/progress_log.md`

## Goal

`ingestFault(notification: JSON!)` normalises an OCPP notification with
`@charge-portal/fault-taxonomy`, persists the fault, drafts a ticket with the deterministic
`RulesDraftProvider`, and writes a `draft-created` audit entry, all in one transaction.

## Read

- ADR 0008 and ADR 0010 (decision 1, 3, 4). WP-01 and WP-02 handoffs in the progress log.
- `packages/fault-taxonomy/src/index.ts` exports; `services/triage/src/app.module.ts`, health module.

## Files you may change

`services/triage/src/{faults,tickets,audit,drafting}/**` (new), `services/triage/src/app.module.ts`,
`services/triage/src/migrations/**`, `services/triage/schema.gql`, `services/triage/test/**`,
`services/triage/package.json` (add the workspace dependency), `package-lock.json`, the progress log.

## Design

- Entities: `Fault` (id uuid, stationId, connectorId, ocppErrorCode, vendorId, vendorErrorCode,
  taxonomyCode, component, severity, requiresSiteVisit, source, raw jsonb, occurredAt, receivedAt),
  `Ticket` (id, faultId FK, stationId, state `draft|approved|edited|rejected`, taxonomyCode,
  probableCause text, suggestedAction text, requiresSiteVisit, confidence numeric 0–1, provider,
  rejectReason null, createdAt, decidedAt null, decidedBy null), `AuditEntry` (id, ticketId FK,
  action `draft-created|approved|edited|rejected`, actor, before jsonb null, after jsonb, at).
  One migration.
- `drafting/draft-provider.ts`: `DRAFT_PROVIDER` injection token and interface
  `draft(fault, context: { recentFaults: Fault[] }): Promise<TicketDraftInput>`;
  `ticketDraftInputSchema` (zod) validates every provider's output.
- `RulesDraftProvider`: per component a cause/action template; if the same `taxonomyCode` occurred
  on the station ≥ 3 times in the last 24 h, escalate (suggest site visit, note recurrence in the
  cause). Confidence: 0.9 for `vendor-table`, 0.6 for `ocpp-default`, 0.3 for `unclassified`.
- `NoError` notifications (normaliser returns no fault) are acknowledged and not persisted.
- GraphQL: `ingestFault(notification: JSON!): IngestResult` (`{ ticket?: Ticket, ignored: boolean }`),
  `tickets(state: TicketState): [Ticket!]!`, `ticket(id: ID!): Ticket` with nested `fault` and
  `audit: [AuditEntry!]!` (ordered by `at`). Invalid notifications → GraphQL error with code
  `BAD_USER_INPUT` and the zod issues.

## Acceptance criteria

- [ ] Tests first: unit tests for `RulesDraftProvider` (per source confidence, recurrence escalation,
      output passes the schema); integration tests against `triage_wp03`: ingest each WP-01 vendor
      fixture → ticket in `draft` with matching taxonomyCode and one `draft-created` audit entry
      (actor `agent:rules`); invalid payload → `BAD_USER_INPUT`, nothing persisted; `NoError` → ignored.
- [ ] `npm run check -w @charge-portal/triage` passes; `schema.gql` updated.
- [ ] Commit on `fault-triage/wp-03`; progress-log handoff recorded.

## Verification commands

`docker exec fault-triage-postgres createdb -U triage triage_wp03`, then with
`TRIAGE_DATABASE_URL=postgres://triage:triage@localhost:5432/triage_wp03`:
`npm run check -w @charge-portal/triage`.

## Blockers and handoff

When blocked after two attempts on the same error, stop and report to the orchestrator.
