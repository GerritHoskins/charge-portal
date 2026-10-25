# ADR 0010: Agent-in-the-loop triage with operator approval and an audit log

**Status:** proposed

## Context

A normalised fault (ADR 0008) still needs a decision: what probably happened, and what to do about
it. Drafting that ticket is repetitive work with a lot of context (fault class, recent faults on the
station, telemetry), which suits an automated drafter. Deciding whether to send a technician costs
money and must stay with an accountable person. The design goal is a workflow that does real work,
not a chat window.

## Decision

1. **The agent drafts; an operator decides.** Every ingested fault produces a `TicketDraft` with
   `probableCause`, `taxonomyCode`, `suggestedAction`, `requiresSiteVisit`, `confidence` and the
   `provider` that produced it. Nothing leaves `draft` without an operator action.
2. **Three operator actions.** `approve` (accept as drafted), `edit` (change fields, then approve;
   state `edited`) and `reject` (requires a non-empty reason). `approved`, `edited` and `rejected`
   are terminal.
3. **Append-only audit log.** Each draft creation and each decision writes an `AuditEntry` with the
   action, the actor (operator from the session, or `agent:<provider>` for drafts), `before` and
   `after` snapshots and a timestamp, in the same transaction as the state change. There are no
   update or delete paths for audit entries in code; the edit diff is reconstructable from the entry.
4. **Pluggable `DraftProvider`.** Interface `draft(fault, context): Promise<TicketDraftInput>`.
   - `RulesDraftProvider` (default): deterministic, derived from the taxonomy class and recent fault
     history. Used in tests, CI and whenever no API key is configured.
   - `ClaudeDraftProvider` (optional): enabled only when `ANTHROPIC_API_KEY` is set. Its output must
     parse against the same zod schema; invalid output, timeouts or API errors fall back to the rules
     provider and the fallback is recorded in the draft's `provider` field. The model may not change
     `taxonomyCode` to a value outside the taxonomy.
5. **The operator sees provenance.** The review screen shows the provider, the raw fault codes, the
   normalised class and the audit trail, so a decision is made on evidence, not on prose alone.

## Consequences

- The system is useful without any LLM; the model improves draft quality but is never required.
- Every automated suggestion and human override is traceable, which allows measuring how often
  drafts are accepted unchanged per provider and per taxonomy class.
- Tests never call the network: the Claude client is injected and mocked.
- Model output is untrusted input, treated like an upstream response: validated, bounded, and
  replaceable by the deterministic path.

## User and business value

Operators spend their time deciding instead of typing, and every decision is recorded with who made
it and what changed. This is the developer-tool pattern of "agent proposes, human approves, log
everything" applied to an operations back office.
