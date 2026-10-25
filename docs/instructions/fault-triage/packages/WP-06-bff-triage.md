# WP-06 — BFF: `fetchTriage`, triage contracts and `/api/triage/*`

**Depends on:** WP-04.
**Execution status:** maintained in the designated progress log.
**Progress log:** `docs/progress/fault-triage/progress_log.md`

## Goal

The Nuxt BFF exposes the triage service to pages through contract-checked REST routes; GraphQL stays
server-side, the operator identity comes from the session, and contract violations become 502.

## Read

- ADR 0009 decisions 5 and 6. `server/utils/legacy.ts` (whole file), `server/api/stations.get.ts`,
  `server/api/invoices/[id]/disputes.post.ts` (mutating route pattern), `server/utils/legacy-auth.ts`
  and `server/api/me.get.ts` (how the current user is resolved), `nuxt.config.ts` `runtimeConfig`,
  `shared/contracts/station.ts`, `tests/unit/station-contract.test.ts`, `services/triage/schema.gql`.

## Files you may change

`server/utils/triage.ts` (new), `server/api/triage/**` (new), `shared/contracts/triage.ts` (new),
`tests/unit/triage-contract.test.ts` (new), `tests/unit/triage-bff.test.ts` (new),
`nuxt.config.ts` (`runtimeConfig.triageOrigin`, `runtimeConfig.triageInternalToken` only),
`.env.example` if it exists, the progress log.

## Design

- `fetchTriage(event, query, variables, schema)`: POST `{ query, variables }` to
  `${triageOrigin}/graphql` with `x-internal-token` and `x-actor` (operator id from the session; no
  session → 401 before calling). GraphQL `errors`: `BAD_USER_INPUT` → 422 with issues,
  `TICKET_ALREADY_DECIDED` → 409, not found → 404, anything else → 502. `data` parsed with `schema`;
  failure → 502 "Triage response violates contract" (same wording style as `fetchLegacy`).
- Contracts: `ticketStateSchema`, `faultClassSummarySchema`, `ticketSummarySchema`,
  `ticketDetailSchema` (ticket + fault raw codes + normalised class + audit entries),
  `auditEntrySchema`, `ticketDecisionInputSchema` (discriminated union on `action`:
  `approve` | `edit` with fields | `reject` with reason 3–500), list envelopes `{ data: [...] }`.
- Routes: `GET /api/triage/tickets?state=draft` → list; `GET /api/triage/tickets/[id]` → detail;
  `POST /api/triage/tickets/[id]/decision` → body parsed with `ticketDecisionInputSchema` (422 on
  invalid, no upstream call), returns the updated detail. Existing auth and CSRF middleware apply
  unchanged; do not add these paths to the public allowlist.

## Acceptance criteria

- [ ] Tests first: contract tests with a `valid` fixture and invalid cases (unknown state, missing
      audit array, reject without reason, edit with no fields, confidence > 1); BFF unit tests with a
      stubbed `$fetch` covering header forwarding, no-session 401, each error mapping, contract
      violation → 502, and that the actor is never read from the request body.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` pass (90% floor on `shared/**`).
- [ ] Commit on `fault-triage/wp-06`; progress-log handoff recorded.

## Verification commands

`npx vitest run tests/unit/triage-contract.test.ts tests/unit/triage-bff.test.ts`, `npm run lint`,
`npm run typecheck`, `npm run test:coverage`.

## Blockers and handoff

When blocked after two attempts on the same error, stop and report to the orchestrator.
