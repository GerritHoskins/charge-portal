# Fault Triage Progress

## Status
Current step: WP-00 in Review (branch fault-triage/wp-00); other wave 1 packages pending
Completed steps: none (WP-00 awaiting orchestrator merge)
Next step: merge WP-00; continue wave 1

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

## WP-00 — Review
Branch `fault-triage/wp-00`, based on 360b489. Checks were run from this worktree only (not test:e2e, budget or the full check, per orchestrator instruction).

**What changed**
- `package.json`: `"workspaces": ["packages/*", "services/*"]`; new script `check:workspaces` = `npm run check --workspaces --if-present`; the root `check` runs it right after `typecheck`.
- `package-lock.json`: only the root `workspaces` entry added (4 lines).
- `eslint.config.mjs`: `packages/**` and `services/**` added to the global ignores (each workspace will own its config).
- `packages/.gitkeep`, `services/.gitkeep`: placeholders.
- `tests/unit/workspaces.test.ts` (new): asserts the workspaces array, the `check:workspaces` script, and that `check` runs it directly after `typecheck`.
- `vitest.config.ts`, `tsconfig.json`, `.gitignore`: unchanged. Vitest already includes only `tests/unit/**`; the Nuxt typecheck only follows the `.nuxt/` project references.

**Commands and results**
- `npm ci`: ok.
- `npx vitest run tests/unit/workspaces.test.ts` before the change: 3 failed (`workspaces` undefined). After: 3 passed.
- `npm install`: ok; the lockfile diff is the 4-line workspaces entry.
- `npm run check:workspaces`: **exit 1, "npm error No workspaces found!"** while `packages/` and `services/` contain no `package.json` (npm 11.1.0; CI uses node 24, same npm major). With one throwaway workspace package (removed afterwards) it exits 0. See open points.
- `npm run lint`: exit 0. `npm run typecheck`: exit 0.
- `npm run test:coverage`: exit 0; 26 files, 381 tests passed; statements 95.86%, branches 90.94%, functions 98.88%, lines 96.22%.
- Exclusion probe (temporary files under `packages/` with an `any` and a failing test, removed afterwards): lint exit 0, vitest still 26 files, typecheck exit 0.

**Open points**
- The spec calls `check:workspaces` a no-op while no workspaces exist, but npm 11 fails with "No workspaces found" when the globs match no `package.json`. The script is kept verbatim as specified. Until the first workspace package (WP-01, `packages/fault-taxonomy`) is merged, the root `npm run check` fails at `check:workspaces`. Merge WP-01 before running the full check, or decide on a tolerant script.
- Not run here: test:e2e, budget, full `npm run check`.
