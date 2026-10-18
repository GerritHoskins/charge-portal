# WP-25d — Experiment: compressed HTML and deferred startup telemetry

**Depends on:** accepted WP-25c at `5d3d024`, recorded at `5747de4`.
**Execution status:** maintained only in the progress log.
**Progress log:** `docs/progress/storefront-performance/progress_log.md`.

## Goal

Measure one aggregate optimization: gzip public-shop HTML after the internal cache, and
defer initial noncritical telemetry transport without delaying observers or changing values.
Human explicitly approved WP-25d on 2026-10-18 after previously choosing diagnosis only.
After the original 128 KB product JS gate rejected 128.045 KB and triggered rollback,
the human explicitly accepted 128.045 KB and requested completion. This supersedes that
size rejection only: restore the same candidate, set only that route's cap to 128.045 KB,
and finish correctness and Lighthouse verification. No unrun check is a passing check.
After all twenty audits, the human also explicitly accepted 2.50–2.60 seconds and requested
completion. Apply 2600 ms only to `/shop/c/wallboxes?connector=ccs`; other routes retain 2500 ms,
with every other Lighthouse threshold and the median-run method unchanged.
No estimated savings are an additive guarantee; retain only if correctness, all other
budgets and all twenty hard Lighthouse audits pass with a gain beyond observed noise.

## Read

- `AGENTS.md`, `docs/instructions/work-package-workflow.md`, `context.md`, `measure.md`.
- WP-25/25c handoffs, baseline `.lighthouseci-shop-wp25-after/`, current diagnostic archive.
- `server/plugins/shop-cache-safety.ts`, relevant installed Nitro/H3 cache and response hooks.
- `app/components/ShopVitals.client.vue`, `app/composables/useShopEvents.ts`, existing
  shop-vitals/events/cache E2Es, contracts, unit conventions and current seven route caps.

## Files you may change

- `server/plugins/shop-html-compression.ts` (new), `server/utils/shop-html-compression.ts` (new).
- `server/plugins/shop-cache-safety.ts` (encoding Vary safety, including conditional 304).
- `app/utils/shop-telemetry-transport.ts` (new), `app/components/ShopVitals.client.vue`,
  `app/composables/useShopEvents.ts`.
- New `tests/unit/shop-html-compression.test.ts`, `shop-telemetry-transport.test.ts`.
- New `tests/e2e/shop-compression.spec.ts`, `shop-telemetry-transport.spec.ts`;
  existing `tests/e2e/shop-vitals.spec.ts`, `shop-events.spec.ts` if additional assertions needed.
- This package, `packages/README.md`, and the designated progress log.
- `scripts/route-budgets.json`: only the explicitly accepted product cap, 128 to 128.045 KB.
- `lighthouserc.shop.cjs`: only the explicitly accepted filtered-route LCP cap, with exact
  per-route assertion coverage; all other thresholds and collection settings unchanged.
- Temporary `.wp25d.production.config.mts` and `.wp25d-production.mjs` for verification only;
  remove before handoff. Unique local measurement archives remain unstaged.

## Constraints and behavior

- Tests first: prepare regressions and observe actual baseline uncompressed wire responses
  and immediate telemetry fail before editing product code. Missing-module errors alone
  do not prove a behavior regression. Primary serializes baseline/runtime/test commands.
- Compression is server-only, gzip using installed Node built-ins, for eligible public-shop
  HTML only. No API, locale JSON, external payload JSON, portal, static asset, stream, range,
  already encoded, error or no-body response compression. No dependency/Nuxt-config/route-rule
  edits; only the explicit Lighthouse policy exception above is permitted.
- Compress after the internal cache snapshots the identity body. Update Content-Length to
  actual compressed bytes, preserve decompressed bytes/charset/status/cookies/weak validators,
  negotiate encoding including q=0/wildcard/identity, and never double-compress.
- Preserve every existing Vary token and ensure Accept-Encoding on relevant identity/gzip
  and conditional 304 responses. A pre-cache hook may be needed because H3's 304 path skips
  beforeResponse. Keep existing cache cookie/locale/origin safety and eight cache tests intact.
- Telemetry observers, metric calculation, endpoint/schema, values and event creation stay
  unchanged. Snapshot already-serialized bodies at call time. Share the sendBeacon/keepalive
  fallback, keep credentials omitted on fetch, and preserve route/tab attribution and order.
- Use a normal browser-wide startup settling window (250 ms after document load), followed
  by idle delivery with a bounded fallback. It is not a debounce or Lighthouse-specific path.
  Queued records must flush on visibility hidden/pagehide and before immediate user-action
  events; late metric callbacks after lifecycle flush must still send. Subsequent ordinary
  records send normally once startup opens. No duplicate flush, stranded queue or timer leak.
- No Lighthouse/user-agent/test detection, observer delay, dropped sample, re-labelled metric,
  model parameter/graph manipulation, artificial metric data or timing-method change. No
  threshold change beyond the two explicit human exceptions above.
- Product initial JS has only 0.360 KB gzip spare; deduplicate existing transport code and
  measure all seven caps. No dependency/lockfile, CI, RUM sampler, contract, image,
  CSS, page/layout, unrelated test or generated snapshot changes. The later explicit human
  acceptance permits only the two route-specific exceptions above; other caps stay unchanged.
- Fresh GPT-6 Luna high subagents may implement disjoint server/client files and review.
  Parent owns docs, integration, commits and all runtime/test/build operations unless a
  specific lease is transferred. Shared dependencies/cache prohibit overlapping heavy work.
- Ports are app 3000/legacy 18090; production uses NUXT_LEGACY_ORIGIN=http://localhost:18090.
  Never target user ports 8080/3001. Hidden owned processes only; stop exact verified PIDs.
  Preserve unrelated changes, prior reports and stale caches in unique recoverable backups.
- Bounded technical corrections follow the shared consultation limit. Final hard-gate or
  correctness failure means stop and revert the aggregate candidate; no new approach or
  threshold relaxation. Candidate-only tests/helpers must not remain permanently failing.

## Verification and handoff

- Actual baseline RED and passing unit tests for encoding/body/header safeguards plus queue
  timing, fallback, order, attribution, hidden/pagehide, immediate action and late callbacks.
- Raw-wire production tests must prove body decompression equals identity bytes, real wire
  savings, content lengths, cached miss/hit/304 negotiation/Vary, locale/session isolation and
  non-target routes unchanged. Run unchanged cache and telemetry ingestion/funnel E2Es too.
- Production browser transport tests must demonstrate startup delivery is deferred, observer
  data remains real, quick navigation/exit flushes records, and fallback/delivery remain valid.
- `E2E_LEGACY_PORT=18090 ROUTE_BUDGET_LEGACY_PORT=18090 npm run check` must pass, including build
  and all seven caps. Read actual output and record exact commands/exits; no assertion weakening.
- With no competing heavy work, `LIGHTHOUSE_LEGACY_PORT=18090 npm run lighthouse:shop` must
  complete all twenty audits with error-level assertions and the explicit filtered exception.
  Other thresholds stay unchanged. Compare to retained WP-25
  runtime, not reverted i18n candidates. Preserve report JSON/HTML/manifest in a unique backup;
  filesystem-only upload may recover a missing manifest after assertion failure.
- Record all selected median-run metrics and five-run spreads, actual HTML/locale/total transfer
  and JS. Label aggregate effect, simulated versus observed, estimates versus actual bytes,
  and noise honestly. Do not attribute a combined effect to either component individually.
- If final gates fail, remove candidate source/invalid candidate-only tests, recheck retained
  source with full check and focused production regressions, and document unresolved hard LCP.
- Remove temporary files, stop owned servers, independently inspect the diff. Review only
  after required checks; Done only after human acceptance. WP-25 CI wiring and WP-27 remain
  separate unfinished work; no automatic claim that the complete objective is achieved.
