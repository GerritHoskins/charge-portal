# Fault Triage Progress

## Status
Current step: package docs written; wave 1 (WP-00) next
Completed steps: none
Next step: WP-00

## Decisions
- 2026-10-25: Human chose a pluggable `DraftProvider`: deterministic rules provider by default,
  Claude provider only when `ANTHROPIC_API_KEY` is set (ADR 0010).
- 2026-10-25: Human chose npm workspaces with Nuxt staying at the repo root
  (`packages/*`, `services/*`) (ADR 0009).
- 2026-10-25: Human chose real PostgreSQL via Docker for integration tests, locally and in CI.
- 2026-10-25: Human chose to write work-package docs first, then execute them.
- 2026-10-25: Human assigned the packages to Sonnet 5.5 (high effort) agents, in parallel where
  dependencies allow. Agents commit only to `fault-triage/wp-NN`; the orchestrator merges into
  `feat/fault-triage`; nothing is pushed.
- 2026-10-25: Human explicitly waived the workflow's per-package human acceptance for this
  initiative ("omit workflow's per-package human acceptance and run all waves through"). The
  orchestrator reviews and merges between waves; the human reviews the integrated result.
- 2026-10-25: Human assigned ADR number 0008 to fault normalisation. The deferred, unstarted
  storefront WP-27 now uses the next free ADR number instead of 0008.

## Package handoffs
<!-- One section per package: ## WP-NN — status, what changed, commands run with results, open points. -->
