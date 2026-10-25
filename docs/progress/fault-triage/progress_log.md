# Fault Triage Progress

## Status
Current step: WP-01 in Review (branch fault-triage/wp-01, based on WP-00); other wave 1 packages pending
Completed steps: none (WP-00 and WP-01 awaiting orchestrator merge)
Next step: merge WP-00 and WP-01; continue wave 1

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

## WP-01 — Review
Branch `fault-triage/wp-01`, based on bb0a535 (WP-00). Checks were run from this worktree only (not test:e2e, budget or the full root check, per orchestrator instruction).

**What changed**
- `packages/fault-taxonomy/` (new workspace `@charge-portal/fault-taxonomy`, `"type": "module"`, `exports: { ".": "./src/index.ts" }`, zod ^4.6.6): `package.json`, `tsconfig.json`, `vitest.config.ts` (node env, coverage thresholds lines/functions/statements 95, branches 90 on `src/**`), `eslint.config.mjs` (imports the root config and drops its ignore-only entry, because the root ignores `packages/**`).
- `src/ocpp.ts` (raw OCPP 1.6 schemas), `src/taxonomy.ts` (enums, `faultClassSchema`, frozen `TAXONOMY` with 17 classes, per-area reasoning in comments), `src/vendors/{table,voltreon,kestrel-ev,lumenwatt,orbis-power,index}.ts` (8-9 codes per vendor, zod-validated at module load, 7 classes reachable from all four vendors), `src/normalise.ts`, `src/fixtures.ts`, `src/index.ts`.
- `tests/{ocpp,taxonomy,vendors,normalise,fixtures,index}.test.ts`: 192 tests.
- `package-lock.json`: workspace link and package entry only (+17 lines).

**Commands and results**
- `npm ci`: ok. `npm install` after adding the package: ok.
- Tests first: `npx vitest run` in the package before any `src/` existed: 6 files failed ("Cannot find module '../src/...'"), no tests ran. After implementation: 6 files, 192 tests passed.
- `npm run check -w @charge-portal/fault-taxonomy`: exit 0 (typecheck, lint, test with coverage). Coverage: statements 100%, branches 95% (19/20), functions 100%, lines 100%.
- Lint probe: a temporary `any` in `src/probe.ts` was reported by the package lint (so the package is actually linted); removed afterwards.
- `npm run lint` (root): exit 0. `npm run typecheck` (root): exit 0.
- `npm run check:workspaces` (root): exit 0 with the package present. This resolves the WP-00 open point (it failed with "No workspaces found" while no package existed).
- Root `npx vitest run`: 26 files, 381 tests passed (unchanged; root Vitest does not include the package tests).

**Decisions / deviations (for the reviewer)**
- `componentSchema` has a ninth value `unknown`, used only by `UNCLASSIFIED`. ADR 0008 lists eight components and has no component for the unknown case. Either amend the ADR text or choose another representation before WP-02 persists components.
- Vendor table lookups: `vendorId` is matched trimmed and case-insensitively; every vendor trims `vendorErrorCode`; kestrel-ev also upper-cases, lumenwatt lower-cases, orbis-power normalises to `0x` + upper-case hex. No fuzzy matching.
- Precedence is applied literally: a matching vendor code wins even when `errorCode` is `NoError`. Otherwise `NoError` returns `{ fault: null, source: 'ocpp-default' }`.
- `LocalListConflict` defaults to `COM.BACKEND_LINK` (local vs central authorisation list sync). `OtherError` and `InternalError` have no default.
- Timestamps accept offsets (`z.iso.datetime({ offset: true })`). Unknown extra keys on a notification are stripped by zod, so `raw` is the parsed notification.
- Source uses extensionless relative imports (`moduleResolution: Bundler`). Fine for Vite/Nitro/tsx; WP-02 may need a build step or `.ts` extensions if its Nest toolchain requires it.

**Open points**
- Not run here: test:e2e, budget, full root `npm run check`.
- No Codex consultation was needed.
