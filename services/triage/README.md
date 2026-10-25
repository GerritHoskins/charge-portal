# @charge-portal/triage

Internal fault-triage service (NestJS + GraphQL + PostgreSQL). Only the Nuxt BFF talks to it. See ADR 0009 and 0010.

## Environment

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `TRIAGE_DATABASE_URL` | yes | | PostgreSQL connection URL |
| `TRIAGE_INTERNAL_TOKEN` | yes | | Shared secret the BFF sends as `x-internal-token` |
| `TRIAGE_PORT` / `TRIAGE_HOST` | no | `4100` / `127.0.0.1` | Listen address |
| `ANTHROPIC_API_KEY` | no | unset | Enables the Claude draft provider. Unset or blank: deterministic rules provider only |
| `TRIAGE_DRAFT_MODEL` | no | `claude-sonnet-5-5` | Model id used for drafts |
| `TRIAGE_DRAFT_TIMEOUT_MS` | no | `15000` | Upper bound (100 to 120000) for one Claude call, retries included |

## Draft providers

- Without `ANTHROPIC_API_KEY` the `RulesDraftProvider` drafts every ticket (provider `rules`).
- With the key, drafts come from Claude (provider `claude:<model>`). The model answers through the
  `submit_ticket_draft` tool, whose input schema is generated from the zod draft schema; the answer is
  validated with that schema and `taxonomyCode` must be in the taxonomy.
- A missing tool call, invalid or truncated output, an unknown `taxonomyCode`, a refusal, an API error or a
  timeout falls back to the rules provider. The draft's provider is then `rules (fallback: <reason>)` and one
  warning (reason only) is logged. The audit actor is `agent:<provider>`.
- The key and the prompt are never logged or stored. Tests use a fake client and never need the key or the network.
- Models that reject a forced `tool_choice` (Sonnet 5.5, Opus 5.5, Fable 5.1, Mythos 5.1) get `tool_choice: auto`
  plus an explicit instruction to call the tool; all other models get the tool forced.
