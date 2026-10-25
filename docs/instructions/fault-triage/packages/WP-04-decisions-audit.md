# WP-04 — Operator decisions and the append-only audit log

**Depends on:** WP-03.
**Execution status:** maintained in the designated progress log.
**Progress log:** `docs/progress/fault-triage/progress_log.md`

## Goal

Operators can approve, edit-and-approve or reject a draft ticket through GraphQL; each decision and
its audit entry are written atomically, terminal states are enforced, and audit entries cannot be
changed through the service.

## Read

- ADR 0010 decisions 2 and 3; WP-03 handoff. `services/triage/src/tickets/**`, `audit/**`.

## Files you may change

`services/triage/src/{tickets,audit}/**`, `services/triage/src/migrations/**` (only if needed),
`services/triage/schema.gql`, `services/triage/test/**`, the progress log.

## Design

- Mutations: `approveTicket(id)`, `editTicket(id, input: TicketEditInput)` (any of probableCause,
  suggestedAction, taxonomyCode, requiresSiteVisit; at least one field, validated with zod;
  taxonomyCode must exist in `TAXONOMY`), `rejectTicket(id, reason)` (trimmed, 3–500 chars).
- The actor comes from the GraphQL context (`x-actor`, set by WP-02's guard); missing actor →
  `FORBIDDEN`. Never take the actor from mutation arguments.
- Use one `DataSource.transaction` per decision; lock the ticket row (`pessimistic_write`); a ticket
  not in `draft` → `CONFLICT`-style error (`extensions.code: 'TICKET_ALREADY_DECIDED'`).
- Audit entry: `before` = ticket snapshot before, `after` = snapshot after; for `edited` add
  `changedFields: string[]` inside `after` metadata or a separate column (decide, document).
- `AuditService` exposes only `append` and `listForTicket`; add a test that asserts no update/delete
  method exists on it.

## Acceptance criteria

- [ ] Tests first (integration against `triage_wp04`): approve → `approved` + entry; edit →
      `edited`, changed fields recorded, unchanged fields untouched; reject without/short reason →
      validation error, no state change; second decision → `TICKET_ALREADY_DECIDED`; concurrent
      approve + reject → exactly one succeeds; failure inside the transaction leaves neither ticket
      change nor audit entry; missing actor → `FORBIDDEN`.
- [ ] `npm run check -w @charge-portal/triage` passes; `schema.gql` updated.
- [ ] Commit on `fault-triage/wp-04`; progress-log handoff recorded.

## Verification commands

`docker exec fault-triage-postgres createdb -U triage triage_wp04`; `npm run check -w @charge-portal/triage`
with `TRIAGE_DATABASE_URL=.../triage_wp04`.

## Blockers and handoff

When blocked after two attempts on the same error, stop and report to the orchestrator.
