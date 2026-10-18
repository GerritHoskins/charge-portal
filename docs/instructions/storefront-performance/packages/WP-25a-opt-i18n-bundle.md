# WP-25a — Experiment: precompiled translation messages

**Depends on:** accepted WP-20 to WP-24 and retained WP-25 checkpoint `abad194`.
**Execution status:** maintained only in the progress log.
**Progress log:** `docs/progress/storefront-performance/progress_log.md`.

## Goal

Test whether precompiling the static DE/EN catalogues and removing the client message
compiler reduces initial JavaScript and the three recorded hard LCP misses. This is a
bounded experiment, not permission to change any performance threshold or dependency.
Human approved this scope on 2026-10-18 after WP-25 stopped at its hard gate.

## Read

- `AGENTS.md`, `docs/instructions/work-package-workflow.md`, `context.md`, `measure.md`.
- WP-25 resumption handoff and measurements in the progress log.
- `nuxt.config.ts` (i18n and client build settings).
- Existing locale tests in `tests/e2e/auth.spec.ts`, `shop-product.spec.ts`, `shop-cart.spec.ts`.
- `i18n/locales/de.json`, `en.json`, and `tests/unit/i18n-catalogues.test.ts` (read only).
- Installed `@nuxtjs/i18n` plugin/alias implementation, only the relevant bounded sections.
- Existing build-verification scripts and production server/test conventions as needed.

## Files you may change

- `nuxt.config.ts` (i18n bundle/precompilation configuration only, including an exact-DE/EN
  Nitro Rollup precompiler registration using the already installed i18n plugin if needed).
- `tests/e2e/auth.spec.ts`.
- `tests/e2e/shop-product.spec.ts`.
- `tests/e2e/shop-cart.spec.ts`.
- `scripts/assert-i18n-precompiled.mjs` (new build-artifact verification script).
- This package, `packages/README.md`, and the designated progress log.

## Constraints and exclusions

- Start with a failing artifact regression on a fresh baseline build; do not count a
  missing build directory or a broken checker as the required RED.
- Investigate the installed module's interaction between `experimental.optimizeMessageBundling`,
  `bundle.runtimeOnly`, and `bundle.dropMessageCompiler`. Do not drop the compiler while
  leaving raw string messages that require it. Verify both locale artifacts are precompiled.
- Installed i18n 10.6 documents a custom Nitro Rollup transform as the counterpart to
  disabling raw-message bundling. A config-only registration for exactly the two existing
  catalogue files is within the approved precompilation experiment; do not generalize the
  transform to other resources, edit installed modules, or add dependencies.
- After two failed registrations, human explicitly approved one final integration attempt:
  use Nitro's final `rollup:before` hook to replace its generic JSON plugin with the already
  installed equivalent excluding exactly the two locale files, allowing the i18n precompiler
  to handle them first. Keep this in `nuxt.config.ts` with the approved verifier/tests/docs;
  document transitive-plugin/API coupling, fail closed if the expected plugin is absent or
  ambiguous, and revert a broken or ineffective result. Do not try another unapproved variant.
- Preserve production SSR in DE/EN, browser detection, bidirectional locale switching,
  interpolation and any existing plural messages, formatting, SEO, cart, related links and
  hydration behavior. The current catalogues have no plural-choice messages; do not add
  artificial catalogue content or describe multiple interpolated counts as plural coverage.
- No catalogue edits, API/schema changes, response-compression hooks, dependencies, lockfiles,
  JS cap changes, Lighthouse assertion changes, RUM sampler edits, or CI wiring here.
- Serialize all builds, typechecks, browser servers and measurements: worktrees share caches.
  Use legacy port 18090, not the user's 8080/3001 servers; stop only owned processes.
- Preserve before/after reports. Compare all five-run spreads; do not infer simulated LCP
  from observed raw timing phases or claim a gain inside run-to-run noise.
- Revert an ineffective or broken candidate, preserving regression tests that remain valid
  and documenting the measured outcome. Do not declare the original full objective complete.
- Candidate-only verification commands below describe the experiment, not a promise to ship
  an optimization. If reverted, remove its checker with the candidate configuration, record
  its actual evidence, and verify the retained baseline/tests; do not ship a permanently
  failing checker or label a failed hard gate as a completed performance optimization.

## Acceptance criteria and verification

- `npm run build` and `node scripts/assert-i18n-precompiled.mjs` prove both production locale
  artifacts are compiled and client message-compiler implementation is absent. The checker
  must fail on the actual baseline artifact, not just inspect configuration option strings.
- New/extended tests cover production SSR for both locales and switching back and forth,
  including representative interpolated messages/counts and existing shop formatting/cart.
  Record the absence of plural-choice catalogue messages rather than claim plural coverage.
  Run focused Playwright tests against a freshly built production server; dev-only results
  do not establish runtime-only correctness. Record exact commands and actual exits.
- `E2E_LEGACY_PORT=18090 ROUTE_BUDGET_LEGACY_PORT=18090 npm run check` passes, including all
  unchanged route budgets. Record initial JS against the WP-25 baseline.
- `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` runs all 20 audits with unchanged
  hard assertions. Record representative metrics and five-run spreads. If any hard gate
  still fails, report it honestly and do not resume WP-25 CI wiring.
- Review the diff and record checks, measurements, kept/reverted outcome and next action.
  A retained candidate requires passing correctness checks and a measured target improvement
  beyond noise. A reverted experiment can be handed to human review with all baseline
  limitations explicit; a failing required gate is not verified full completion.
- Human acceptance is required before Done or resuming dependent WP-25 work.
