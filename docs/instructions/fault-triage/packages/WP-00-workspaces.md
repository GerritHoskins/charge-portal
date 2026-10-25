# WP-00 — npm workspaces scaffold with no behaviour change

**Depends on:** none.
**Execution status:** maintained in the designated progress log.
**Progress log:** `docs/progress/fault-triage/progress_log.md`

## Goal

The repository is an npm-workspaces mono-repo (`packages/*`, `services/*`) with the Nuxt app still
at the root, and everything that passed before still passes.

## Read

- `AGENTS.md`, `docs/instructions/work-package-workflow.md`, `packages/context.md`.
- `package.json`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`, `.github/workflows/ci.yml`.

## Files you may change

`package.json`, `package-lock.json`, `vitest.config.ts`, `eslint.config.mjs`, `tsconfig.json` (only
to exclude `packages/**` and `services/**` if needed), `.gitignore`, `packages/.gitkeep`,
`services/.gitkeep`, `tests/unit/workspaces.test.ts` (new), the progress log.

## Constraints and exclusions

- No new runtime dependencies. No app, server or shared code changes.
- Root Vitest and ESLint must not pick up files under `packages/` or `services/` (each workspace
  will own its own config); the Nuxt typecheck must not include them either.
- Add a root script `check:workspaces` = `npm run check --workspaces --if-present` and append it to
  the root `check` script after `typecheck`. With no workspaces yet it is a no-op.

## Acceptance criteria

- [ ] `tests/unit/workspaces.test.ts` reads root `package.json` and asserts the `workspaces` array and
      that `check` invokes `check:workspaces`; it failed before the change.
- [ ] `npm install` succeeds and `package-lock.json` is updated consistently.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` pass.
- [ ] Commit on `fault-triage/wp-00`; progress-log handoff recorded.

## Verification commands

`npx vitest run tests/unit/workspaces.test.ts`, `npm run check:workspaces`, `npm run lint`,
`npm run typecheck`, `npm run test:coverage`.

## Blockers and handoff

When blocked after two attempts on the same error, stop and report the blocker to the orchestrator
with what you tried. Record the handoff in the progress log.
