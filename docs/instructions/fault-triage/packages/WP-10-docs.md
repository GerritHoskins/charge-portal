# WP-10 — README stack section and ADR status

**Depends on:** all previous packages.
**Execution status:** maintained in the designated progress log.
**Progress log:** `docs/progress/fault-triage/progress_log.md`

## Goal

The README describes the mono-repo, the triage service and how to run it, and names only tools that
the repository now actually uses; ADRs 0008–0010 reflect what was built.

## Read

- The whole fault-triage progress log, ADRs 0008–0010, `README.md` (structure and any "Honest
  limits"/stack/evaluation sections), root `package.json`, `services/triage/README.md`.

## Files you may change

`README.md`, `docs/adr/0008-*.md`, `docs/adr/0009-*.md`, `docs/adr/0010-*.md` (correct details to
match the implementation; keep status `proposed` — acceptance is the human's), the progress log.

## Constraints

- Every claim must point at code that exists in this branch. No invented metrics.
- Add: workspace layout, how to start Postgres/service/simulator, the env vars, the new routes
  (`/portal/triage`, `/api/triage/*`), honest limits (simulated OCPP over JSON, no real devices,
  internal-token service auth, LLM drafting optional and off by default).

## Acceptance criteria

- [ ] `npm run lint` passes; links in README resolve to existing files (check with a quick script or by hand).
- [ ] Commit on `fault-triage/wp-10`; progress-log handoff recorded.
