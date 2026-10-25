# WP-05 — Optional Claude draft provider with validated output and fallback

**Depends on:** WP-03.
**Execution status:** maintained in the designated progress log.
**Progress log:** `docs/progress/fault-triage/progress_log.md`

## Goal

When `ANTHROPIC_API_KEY` is set, drafts come from Claude; its output is validated with the same zod
schema as the rules provider, and any invalid output, timeout or API error falls back to the rules
provider with provenance recorded. Without the key, behaviour is unchanged.

## Read

- ADR 0010 decision 4. `services/triage/src/drafting/**`. Before writing code, read the Anthropic SDK
  docs for the TypeScript SDK (`@anthropic-ai/sdk`): use the Messages API with a **tool definition
  whose input schema is generated from the zod draft schema** (or structured output if available) so
  the model returns JSON, not prose. Default model `claude-sonnet-5-5`, overridable via
  `TRIAGE_DRAFT_MODEL`.

## Files you may change

`services/triage/src/drafting/**`, `services/triage/src/app.module.ts` (provider selection),
`services/triage/test/**`, `services/triage/package.json`, `package-lock.json`,
`services/triage/README.md` (new, short: env vars), the progress log.

## Design

- `ClaudeDraftProvider` takes an injected client interface (`createMessage(params)`) so tests pass a
  fake. Prompt includes: taxonomy catalogue (codes + meanings), the normalised fault, raw vendor
  codes, recent faults on the station. System prompt states the model drafts for a human operator and
  must pick `taxonomyCode` from the catalogue.
- Validate tool input with `ticketDraftInputSchema`; reject a `taxonomyCode` outside `TAXONOMY`.
- Timeout `TRIAGE_DRAFT_TIMEOUT_MS` (default 15000). On any failure: call `RulesDraftProvider`, set
  `provider` to `rules (fallback: <reason>)`, log a warning without the payload.
- `FallbackDraftProvider` composition chosen in the module factory: Claude-then-rules when the key
  is present, rules only otherwise. Audit actor for drafts becomes `agent:<provider>`.
- Never log or persist the API key. Never call the network in tests.

## Acceptance criteria

- [ ] Tests first with a fake client: valid tool output → draft with `provider: 'claude:<model>'`;
      prose-only response, schema-invalid input, unknown taxonomyCode, thrown error and timeout →
      rules fallback with reason; no key → rules provider wired; prompt contains the taxonomy codes.
- [ ] `npm run check -w @charge-portal/triage` passes with no `ANTHROPIC_API_KEY` set.
- [ ] Commit on `fault-triage/wp-05`; progress-log handoff recorded.

## Verification commands

`npm run check -w @charge-portal/triage` with `TRIAGE_DATABASE_URL=.../triage_wp05`
(create it first).

## Blockers and handoff

When blocked after two attempts on the same error, stop and report to the orchestrator.
