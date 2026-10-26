# WP-29 — Keep portal-only translations out of the shop's locale payload

**Depends on:** accepted WP-28 (`1243c22`), WP-02; follows the fault-triage merge (PR #6).
**Execution status:** maintained in the designated progress log.
**Progress log:** `docs/progress/storefront-performance/progress_log.md`.

## Goal

`/shop/c/wallboxes?connector=ccs` passes its unchanged 2600 ms LCP gate in CI again. The shop's
`/_i18n/<hash>/<locale>/messages.json` no longer carries the `triage.*` and `stations.live.*`
strings. Those strings load only with the portal pages that use them. No threshold, budget,
Lighthouse or Playwright config change.

## Context (measured 2026-10-26 on clean builds; progress log "CCS listing LCP diagnosis")

- The last green shop Lighthouse run is `2761e64` (run 40200768193, 2026-10-25, after the runner image migration).
  The first main run to reach it after PR #6 (`1243c22`) failed. Toolchain versions are identical.
- The shop loads the whole locale. PR #6 grew the German payload from 4,385 B to 10,023 B transfer
  (body 4,133 → 9,771 B, uncompressed): `triage` is 4,806 B and `stations.live` ~730 B. The shop uses `shop`/`common`.
- Offline Lantern replay reproduces 40/40 reports exactly. `messages.json` is the terminal LCP node in 39/40
  runs (document → entry JS → messages.json). At 10 KB it often needs one more simulated 150 ms round trip.
  Same-trace counterfactual: `main` traces with the old size have median 2,705 → 2,649 ms, and runs under
  2600 ms go from 4 → 10 of 20. The +172 B entry chunk has no effect.
- WP-25b's reverted candidate showed the same pattern: larger locale payload, LCP ~2,709 ms.
- Only `app/pages/portal/triage/index.vue`, `app/pages/portal/triage/[id].vue` and
  `app/pages/portal/stations/index.vue` use these keys. The triage components take labels as props.
  `nav.triage` (layout) stays global.
- Route-budget headroom on `main`: `/portal/triage*` 122.882 of 130.9 KB, `/portal/stations` 115.949 of 119.5 KB.
  Moving strings into page chunks costs JS there. Measure it, and do not raise budgets.

## Read

- `AGENTS.md` and `docs/instructions/work-package-workflow.md`.
- `nuxt.config.ts` (i18n block), `i18n/locales/de.json` and `en.json` (`triage`, `stations.live`).
- The three pages above; `tests/unit/i18n-catalogues.test.ts`, `tests/unit/triage-i18n.test.ts`.
- `tests/e2e/triage.spec.ts`, `tests/e2e/stations-state.spec.ts` (locale and axe checks to keep green).
- `tests/e2e/shop-compression.spec.ts` lines 50–60 (production-detection pattern).
- Installed `@nuxtjs/i18n` 10.6.0 / `vue-i18n` 11.4.14: local-scope `useI18n({ useScope: 'local', messages })`
  and root fallback behaviour only (bounded reads).

## Files you may change

- `i18n/locales/de.json`, `i18n/locales/en.json`: remove `triage` and `stations.live` only.
- New scoped catalogues, e.g. `i18n/scoped/triage.{de,en}.json`, `i18n/scoped/stations-live.{de,en}.json`.
  Key paths stay identical (`triage.*`, `stations.live.*`), so template calls do not change.
- The three portal pages above: switch to local-scope `useI18n` with the scoped messages.
- `tests/unit/i18n-catalogues.test.ts`, `tests/unit/triage-i18n.test.ts`: read the global + scoped catalogues.
- `tests/unit/shop-locale-scope.test.ts` (new) and `tests/e2e/shop-locale-payload.spec.ts` (new).
- This package, its row in `packages/README.md`, and the progress log.

## Constraints and exclusions

- No change to `lighthouserc*.cjs`, `scripts/route-budgets.json`, budget/Lighthouse scripts, Playwright config,
  dependencies or lockfile. No compression change (diagnosis option 2 is a separate decision). No ADR 0007 re-baseline.
- Other portal namespaces (`stations`, `sessions`, `invoices`, `dispute`, `login`) stay global. Moving them is a
  possible follow-up, not this package.
- DE/EN parity, placeholder parity and contract-value coverage (`triage-i18n` test) keep their strength.
  Do not weaken a check to make the move pass.
- Locale switching keeps working on the triage and stations pages (both languages available in scope).
- Root-fallback warnings from local scope (global keys such as `stations.status.*` used on the same page) must not
  appear in production output or fail tests. Verify this rather than assume it.

## Acceptance criteria

- [ ] Global `de.json`/`en.json` have no `triage` or `stations.live` keys. Scoped catalogues hold them with the same paths.
- [ ] The production `/_i18n/<hash>/de/messages.json` body for a shop route is at most **4,400 B**
      (pre-PR6 body 4,133 B; proposed cap, human to confirm). EN follows the same rule.
- [ ] Triage queue/review and stations pages render the same text in DE and EN, the existing axe E2E checks pass,
      and no raw keys show (contract values covered for both locales).
- [ ] New unit + production E2E tests were observed failing on current `main` before the change and pass after.
- [ ] `npm run budget` exits 0 with unchanged budgets. Record before/after for `/portal/triage*` and `/portal/stations`.
- [ ] `npm run check` passes. `npm run lighthouse:shop` is recorded before/after. Linux PR CI shop Lighthouse
      is authoritative (local Windows shop LCP fails on unchanged code).
- [ ] Diff inspected and the progress-log handoff recorded; ready for human review.

## Verification commands

- `npx vitest run tests/unit/shop-locale-scope.test.ts tests/unit/i18n-catalogues.test.ts tests/unit/triage-i18n.test.ts`
- `npm run build`, then the production server and
  `npx playwright test tests/e2e/shop-locale-payload.spec.ts tests/e2e/triage.spec.ts tests/e2e/stations-state.spec.ts --workers=1`
- `npm run budget`, `npm run check`, `npm run lighthouse:shop`

## Blockers and handoff

Follow the shared workflow. If local scope cannot avoid root-fallback warnings or budget overruns, stop and
record the evidence; do not switch to the compression option without a human decision. Human acceptance is
required for Done.
