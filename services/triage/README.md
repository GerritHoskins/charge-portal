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

## Seed data and end-to-end runs

`src/seed` ingests the synthetic WP-01 fixtures (12 faults, one draft ticket each) through the GraphQL API, so the tickets
are drafted by the real service. It is built as `dist/seed.js`:

- `npm run seed -w @charge-portal/triage`: seed a running service (`TRIAGE_INTERNAL_TOKEN`, `TRIAGE_PORT`).
- `npm run seed:reset -w @charge-portal/triage`: empty the tables first (`TRIAGE_DATABASE_URL`).
- `npm run e2e:serve -w @charge-portal/triage`: build, drop and recreate the database, then start the service. The Playwright
  `webServer` runs this against `triage_e2e`; the E2E spec calls `resetTriageData` and `seedFaults` before every test.

The destructive helpers (`recreateDatabase`, `resetTriageData`) refuse every database whose name does not end in `_e2e`.
