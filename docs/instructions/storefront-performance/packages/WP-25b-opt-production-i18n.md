# WP-25b — Experiment: compact production locale ASTs

**Depends on:** accepted WP-25a at `2f0c200` and retained WP-25 checkpoint `abad194`.
**Execution status:** maintained only in the progress log.
**Progress log:** `docs/progress/storefront-performance/progress_log.md`.

## Goal

Test production-mode precompilation without WP-25a's development metadata/Vite lifecycle.
Use compact locale ASTs and format-versioned internal message URLs to remove the client
compiler safely, then measure all unchanged hard gates. Human approved this bounded WP
on 2026-10-18; it is not a promise that compiler removal will fix the remaining LCP misses.

## Read

- `AGENTS.md`, `docs/instructions/work-package-workflow.md`, `context.md`, `measure.md`.
- WP-25/25a handoffs and measurements in the progress log; current `nuxt.config.ts`.
- Existing auth/shop-product/shop-cart locale regressions and production test conventions.
- Read-only `i18n/locales/de.json`, `en.json`, `tests/unit/i18n-catalogues.test.ts`.
- Relevant installed `@intlify/bundle-utils` exports/generator and Nitro final Rollup hook;
  `@nuxtjs/i18n` resource loading, runtime-only flags and `serverRoutePrefix` options.
- Unchanged cache tests/middleware only when needed to verify invariants or diagnose failures.

## Files you may change

- `nuxt.config.ts` (exact-file production locale build configuration and message URL version).
- `scripts/assert-i18n-precompiled.mjs` (new candidate artifact verifier).
- Existing `tests/e2e/auth.spec.ts`, `shop-product.spec.ts`, `shop-cart.spec.ts`.
- This package, `packages/README.md`, and the designated progress log.

## Constraints

- Tests first: build a fresh baseline and observe the verifier/browser URL regression fail
  for actual raw messages/compiler/default URL, not a missing file or broken checker.
- Use installed `generateJSON` with production JIT options in a real exact-file Rollup
  transform. Its public export and internal-annotated option shape are version-coupled;
  document that risk. No Vite adapter, fake lifecycle/configuration, `any` or suppressed errors.
- Compile only the resolved DE/EN JSON files. Nitro's final `rollup:before` hook may replace
  its single top-level generic JSON plugin with the installed equivalent excluding exactly
  those files; fail closed if that integration point is absent or ambiguous. Generator
  errors must fail the build rather than silently return raw strings.
- Keep runtime-only/compiler-drop flags paired with verified compiled server delivery.
  Set a format-versioned `serverRoutePrefix` (for example `/_i18n/compiled-v1`) and verify
  actual browser requests use it rather than legacy raw-message URLs. Do not claim a real
  warm-browser upgrade test if only URL-isolation invariants were checked.
- Preserve DE/EN SSR, browser detection, bidirectional switching, interpolation/formatting,
  SEO, cart, no-refetch, accessibility, API contracts and cache safety. The catalogues have
  no plural-choice messages; multiple `{n}` counts are not grammatical-plural coverage.
- No other source files, catalogue edits, dependencies/lockfiles, cache-test edits, response
  compression, RUM sampler, JS caps, Lighthouse thresholds, route rules or CI wiring changes.
- One exclusive runtime/build lease: shared worktree dependency/cache state means all
  builds/typechecks/servers/measurements must be serialized. Assigned app/legacy ports are
  3000/18090; never target the user's 8080/3001 servers. Production runtime uses
  `NUXT_LEGACY_ORIGIN=http://localhost:18090` (not build-time `LEGACY_ORIGIN`).
- Preserve old reports and any stale owned dev cache in recoverable unique local backups;
  verify exact paths and stop owned servers before moving cache. Never weaken cache tests
  to hide mixed build-generation HTML. No destructive cleanup.
- If correctness or final performance gates fail, stop and revert the candidate config/
  checker, keeping only valid regressions and measured evidence. Do not retry an unchanged
  command or start another approach after the workflow's bounded consultation limit.

## Verification and handoff

- `npm run build`; candidate `node scripts/assert-i18n-precompiled.mjs`: follow exact locale
  loader keys, `$`-safe distinct identifiers and all message paths. Reject raw/malformed ASTs,
  development location metadata, missing/duplicate locales and empty client chunks. Compare
  actual translated values/interpolation with both source catalogues even without `loc.source`;
  check source-proven compiler tokenizer properties absent from emitted client JavaScript.
  Include small negative controls in the verifier, not unapproved extra test files.
- Run selected existing/new Playwright locale tests against a fresh production server,
  including actual versioned message endpoint ASTs, both SSR languages, roundtrip switching,
  cart counts, product formatting/no-refetch and unchanged cache invariants. Record exact
  commands, temporary production configuration purpose and actual exits; no lost command text.
- `E2E_LEGACY_PORT=18090 ROUTE_BUDGET_LEGACY_PORT=18090 npm run check` must pass, including
  all seven unchanged route caps. Record HTML/locale resource and actual transfer bytes.
- `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop`: all 20 audits, same hard thresholds.
  Baseline is WP-25's retained runtime in `.lighthouseci-shop-wp25-after/`, not reverted WP-25a.
  Record selected median-run metrics plus all five-run spreads, no simulated/observed timing
  conflation. Preserve JSON/HTML/manifest in a unique local backup; filesystem-only upload
  after an assertion failure may be used to recover the manifest, never a remote upload.
- A retained optimization needs correctness and all hard gates passing plus improvement
  beyond observed noise. Otherwise revert and recheck the retained source, documenting the
  baseline's existing LCP failures. Candidate-only verifier is removed with a reverted config;
  do not ship a permanently failing checker or claim failed performance as full completion.
- Primary review and human acceptance are required before Done or resuming WP-25 CI wiring.
  WP-27 and the full objective remain incomplete until their actual requirements are met.
