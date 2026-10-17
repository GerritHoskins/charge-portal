# Agent rules for this repo

Applies to any AI coding assistant working here.

- **Work-package execution:** follow `docs/instructions/work-package-workflow.md` for bounded tasks, context management, status, and handoffs. Load only the selected package and relevant context.
- **Codex advisor for Qwen:** when blocked, stuck, or needing a second opinion, consult Codex through the configured advisor connection before escalating a technical issue to the user. Follow the consultation and fallback procedure in that workflow; advisor recommendations do not grant additional authority.

- **Tests first for behaviour changes.** Write or update the failing test, then the code. `npm run check` must pass before a change is done.
- **Contracts are the boundary.** Never read legacy responses without parsing them via `shared/contracts/*`. A new legacy endpoint needs a schema and a contract test with an invalid case.
- **Accessibility is a requirement, not polish.** New migrated routes need an axe E2E check; status and meaning are never conveyed by colour alone.
- **Components use tokens only** (`var(--…)` from `tokens.css`), no hard-coded colours or spacing.
- **Migration changes touch `routeRules` deliberately.** Removing a proxy line requires the replacement page and its tests in the same commit.
- **A human reviews every diff.** AI output is a draft: read it, run it, and do not merge generated code you cannot explain.
- All data is synthetic. Do not add real operator data, credentials or third-party branding.
