# WP-25c — Diagnose the remaining simulated LCP failures

**Depends on:** human-accepted WP-25b at `304c87b`; retained WP-25 runtime.
**Execution status:** maintained only in the progress log.
**Progress log:** `docs/progress/storefront-performance/progress_log.md`.

## Goal

Explain, from saved reports and controlled current-runtime trace/network captures, which
inputs drive the unresolved LCP gate and the simulated/observed timing disagreement.
Produce one evidence-backed, narrowly scoped next optimization proposal, or document why
the evidence cannot yet identify one. This is diagnosis, not implementation or a gate waiver.
Human accepted WP-25b and permitted the next bounded LCP investigation on 2026-10-18.

## Read

- `AGENTS.md`, `docs/instructions/work-package-workflow.md`, `context.md`, `measure.md`.
- WP-25/25a/25b handoffs, exact gates and actual reports in their preserved local backups.
- `scripts/lighthouse.mjs`, `lighthouserc.shop.cjs`, package scripts and installed Lighthouse/
  LHCI CLI asset-saving, simulation and network-estimation code relevant to the discrepancy.
- Shop SSR image markup/styles and client imports only as needed to explain a measured path.

## Files you may change

- This package, `packages/README.md`, and the designated progress log.
- Temporary `.wp25c-capture.mjs` solely to run controlled diagnostics; remove before handoff.
- Unique local diagnostic output under `.lighthouseci-shop-wp25c-diagnostics/`, not product
  source and not staged for Git. Preserve all earlier report/cache archives.

## Constraints

- No product code/configuration, existing scripts/tests, dependencies, lockfiles, route rules,
  headers, caches, CI, image quality/markup, CSS, thresholds or timing-method changes.
- Do not reintroduce either reverted i18n candidate. Current accepted runtime is the subject.
- One fresh production build, then at most five fresh-browser captures each for unfiltered
  listing and product (ten total). Use the existing four categories, mobile defaults,
  simulated throttling and installed Playwright Chromium as the existing shop command.
  Save JSON/HTML reports, raw trace/devtools log assets and Lantern network estimates under
  distinct run prefixes. If capture cannot be performed, record the actual failure instead
  of claiming raw traces were preserved. Do not overwrite earlier evidence.
- Direct CLI collection is diagnostic, not a successful `lighthouse:shop` hard-gate run.
  Compare resolved settings/versions to the authoritative baseline. Hard failures remain
  failures even if observed trace timings or diagnostic opportunity estimates are lower.
- Label LHCI-selected representatives separately from independent metric medians; separate
  unfiltered/filtered URLs from cold/warm cache claims. Separate simulated LCP/phase estimates
  from trace-observed LCP and resource transfer from locally compressed estimates.
- No causal conclusion from one timing or opportunity estimate. Compare all five runs and
  relevant request starts, priorities, bytes, dependency paths and estimator inputs. Explain
  uncertainty and whether differences exceed the observed spread.
- Read-only parallel analysis is allowed with fresh GPT-6 Luna high agents. Primary owns
  integration; only one runtime/build lease may be active across shared dependencies/cache.
- Assigned app/legacy ports are 3000/18090, runtime `NUXT_LEGACY_ORIGIN=http://localhost:18090`.
  Never target user ports 8080/3001. Hidden owned processes only; verify exact PIDs and stop
  them after capture. Preserve unrelated changes and recoverable cache/report backups.
- Follow the shared bounded consultation limit for repeated technical failures. No speculative
  capture retries, custom model tuning or new optimization approach is authorized here.

## Verification and handoff

- Verify branch/HEAD, clean product source, correct build and owned ports before capture.
- Record exact commands, CLI settings/version comparisons, actual exits, output inventory,
  relevant per-run simulated/observed values and the source evidence behind any explanation.
- Independently review the interpretation and proposed smallest next scope. If evidence
  remains ambiguous, state it and propose a targeted follow-up rather than inventing a fix.
- Remove temporary instrumentation; confirm only package/index/progress documentation differs.
- Run `E2E_LEGACY_PORT=18090 ROUTE_BUDGET_LEGACY_PORT=18090 npm run check`; record actual exit.
  No behavior change is made, so a failing-before behavior test is not applicable.
- Human acceptance is required for Done. Any subsequent optimization needs its own bounded
  scope decision. WP-25 CI wiring and WP-27 remain incomplete until the original hard gates
  and deliverables actually pass; this diagnostic package does not substitute for them.
