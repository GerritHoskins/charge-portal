# ADR 0010: Agent-in-the-loop triage with operator approval and an audit log

**Status:** accepted (2026-10-25)

## Context

A normalised fault (ADR 0008) still needs a decision: what probably happened, and what to do about
it. Drafting that ticket is repetitive work with a lot of context (fault class, recent faults on the
station, telemetry), which suits an automated drafter. Deciding whether to send a technician costs
money and must stay with an accountable person. The design goal is a workflow that does real work,
not a chat window.

## Decision

1. **The agent drafts; an operator decides.** Every ingested fault that reports a fault (not `NoError`)
   produces a ticket in state `draft` with `probableCause`, `taxonomyCode`, `suggestedAction`,
   `requiresSiteVisit`, `confidence` (0 to 1) and the `provider` that produced it
   (`ticketDraftInputSchema`). The provider runs before the database transaction opens, so a slow model
   never holds one; then fault, ticket and the first audit entry are written together. Nothing leaves
   `draft` without an operator action.
2. **Three operator actions.** `approve` (accept as drafted; state `approved`), `edit` (change
   `probableCause`, `suggestedAction`, `taxonomyCode` or `requiresSiteVisit`, then approve; state
   `edited`) and `reject` (requires a reason of 3 to 500 characters after trimming; state `rejected`).
   `approved`, `edited` and `rejected` are terminal: a second decision fails with
   `TICKET_ALREADY_DECIDED`, also under concurrent requests (row lock). An edit that changes nothing is
   refused (`BAD_USER_INPUT`, issue code `no_change`) because an `edited` ticket with an empty diff
   would misstate provenance; the operator approves instead. An edit does not recompute
   `requiresSiteVisit` when the class changes, and keeps `confidence` and `provider` (still the
   agent's). No operator, no decision: the actor comes from the BFF's `x-actor` header and a missing or
   blank one is `FORBIDDEN`.
3. **Append-only audit log.** Each draft creation and each decision writes an `AuditEntry` in the same
   transaction as the state change (a failing audit write rolls the decision back). Fields: `action`
   (`draft-created`, `approved`, `edited`, `rejected`), `actor`, `before`, `after` and `at`.
   - Actor: the operator's name from the session, or `agent:<provider>` for drafts, for example
     `agent:rules`, `agent:claude:<model>` or `agent:rules (fallback: <reason>)`.
   - `before` and `after` are snapshots of the ticket's decidable fields (`state`, `taxonomyCode`,
     `probableCause`, `suggestedAction`, `requiresSiteVisit`, `confidence`, `provider`,
     `rejectReason`); `before` is `null` for `draft-created`.
   - For `edited`, `changedFields` is stored inside `after` (the submitted fields whose value differs
     from the draft, in the order `probableCause`, `suggestedAction`, `taxonomyCode`,
     `requiresSiteVisit`), not in a separate column. Anything comparing `after` with a ticket snapshot
     must ignore that key.
   - There are no update or delete paths for audit entries in code (`AuditService` can only record and
     read, a test pins that surface) and the GraphQL API has no audit mutation. The database does not
     enforce this: there is no trigger, only CHECK constraints on `action` and a non-blank `actor`. A
     trigger would be a small follow-up migration.
4. **Pluggable `DraftProvider`.** Interface `draft(fault, context): Promise<TicketDraftInput>`, where
   the context holds the station's faults of the preceding 24 hours. `DraftingService` validates every
   provider's output against the same zod schema; `taxonomyCode` can only be a class of the taxonomy.
   - `RulesDraftProvider` (default, provider `rules`): deterministic, English text templates per
     component. Confidence is 0.9 for a vendor-table match, 0.6 for an OCPP default and 0.3 for
     `UNCLASSIFIED`. When the same `taxonomyCode` has occurred three or more times on the station in
     the 24 hours up to and including this fault, `requiresSiteVisit` is set and the cause and action
     say so. Used in tests, CI and whenever no API key is configured.
   - `ClaudeDraftProvider` (optional, provider `claude:<model>`): enabled only when `ANTHROPIC_API_KEY`
     is set (`TRIAGE_DRAFT_MODEL`, default `claude-sonnet-5-5`; `TRIAGE_DRAFT_TIMEOUT_MS`, default
     15000, covering the whole call). Without a key no client is created.
     - Structured output through one tool, `submit_ticket_draft`, whose input schema is generated from
       the zod draft schema (without `provider`). The prompt contains the taxonomy catalogue, the
       normalised fault with its raw OCPP and vendor codes, up to ten recent faults of the station and
       the station's free-text `info`, marked as untrusted data. It is sent to the Anthropic API.
     - Tool choice: the model families Sonnet 5.5, Opus 5.5, Fable 5.1 and Mythos 5.1 are reported to
       reject a forced tool choice with HTTP 400, so they get `tool_choice: auto`, an explicit
       instruction to call the tool, and `output_config.effort: medium`; any other model gets the tool
       forced. **This has not been verified against the live API.** A model outside that list that also
       rejects forcing would fall back with `api-error-400` visible in `provider`.
     - `provider` is set by the code after the model's fields are parsed, so the model cannot name
       itself. A `taxonomyCode` outside the taxonomy is rejected.
     - Fallback: any failure (`timeout`, `api-error[-<status>]`, `refusal`, `truncated`, `no-tool-call`,
       `unknown-taxonomy-code`, `invalid-output`, `unexpected-error`) hands the fault to the rules
       provider, and the draft's `provider` becomes `rules (fallback: <reason>)` (at most 100
       characters). One warning is logged with the reason only. Keys, prompts and model output are
       never logged or stored.
5. **The operator sees provenance.** The review screen shows the provider, the raw fault codes, the
   normalised class and the audit trail, so a decision is made on evidence, not on prose alone. The
   draft text itself is English whatever the UI language; only the labels around it are translated.

## Consequences

- The system is useful without any LLM; the model improves draft quality but is never required.
- Every automated suggestion and human override is traceable. The data would allow measuring how often
  drafts are accepted unchanged per provider and per taxonomy class; no report for that exists.
- Tests never call the network: the Claude client is injected and faked, the SDK is driven through a
  stub `fetch`, and the integration tests delete `ANTHROPIC_API_KEY` from their environment. CI has no
  key, so the Claude provider is not exercised against the real API anywhere.
- Model output is untrusted input, treated like an upstream response: validated, bounded, and
  replaceable by the deterministic path.
- `docker-compose.yml` does not forward the Claude variables; they must be added when drafts from
  Claude are wanted in compose.

## User and business value

Operators spend their time deciding instead of typing, and every decision is recorded with who made
it and what changed. This is the developer-tool pattern of "agent proposes, human approves, log
everything" applied to an operations back office.
