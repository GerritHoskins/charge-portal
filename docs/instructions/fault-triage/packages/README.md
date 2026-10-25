# Fault triage: work packages

The plan in `../instructions.md` is split into 11 packages. Each names the files to read, the files it
may change, and the commands that prove it is done. Shared repo facts are in `context.md`.

## How to run one package

Packages run in agent waves (human decision 2026-10-25). Each agent works in its own git worktree on
branch `fault-triage/wp-NN`, branched from `feat/fault-triage` after the previous wave was merged.
Prompt skeleton:

```text
You are working in <worktree path> on branch fault-triage/wp-NN.
Read, in this order:
1. AGENTS.md and docs/instructions/work-package-workflow.md
2. docs/instructions/fault-triage/packages/context.md
3. docs/instructions/fault-triage/packages/WP-NN-<name>.md
4. docs/progress/fault-triage/progress_log.md (Status and prerequisite handoffs only)
Do WP-NN and nothing else. Tests first. Run the package's verification commands (not the full
npm run check unless the package says so), inspect the diff, write the handoff into the progress
log, set the package to Review, and commit on your branch. Do not push.
```

## Order and dependencies

| WP | Title | Depends on | Wave |
|---|---|---|---|
| 00 | [npm workspaces scaffold](WP-00-workspaces.md) | — | 1 |
| 01 | [Fault taxonomy package](WP-01-fault-taxonomy.md) | 00 | 2 |
| 02 | [Triage service skeleton](WP-02-triage-service-skeleton.md) | 00 | 2 |
| 03 | [Fault ingest and rules drafts](WP-03-fault-ingest-drafts.md) | 01, 02 | 3 |
| 08 | [Telemetry simulator and rollup](WP-08-telemetry-rollup.md) | 01, 02 | 3 |
| 04 | [Decisions and audit log](WP-04-decisions-audit.md) | 03 | 4 |
| 05 | [Claude draft provider](WP-05-claude-draft-provider.md) | 03 | 4 |
| 06 | [BFF triage routes and contracts](WP-06-bff-triage.md) | 04 | 5 |
| 07 | [Triage back-office UI](WP-07-triage-ui.md) | 06 | 6 |
| 09 | [Station state in the portal](WP-09-station-state-ui.md) | 06, 07, 08 | 7 |
| 10 | [README and ADR details](WP-10-docs.md) | all | 8 |

Packages in the same wave run in parallel and must not run E2E, `budget` or the full `npm run check`
(port clashes); the orchestrator runs the full check serially after each merge. WP-07 and WP-09 run
alone and may run their own E2E specs.

## Review points

The human reviews the integrated branch at the end (per-package acceptance waived for this
initiative). Look closely at:

- **WP-04**: decisions and audit entries are atomic; no update/delete path for audit entries.
- **WP-05**: no API key logged or persisted; model output validated; tests never hit the network.
- **WP-06**: the actor comes from the session, never from the request body; no new public routes.
- **WP-07 / WP-09**: status never by colour alone; axe passes in both tenants.
