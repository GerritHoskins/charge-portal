# Migration playbook

How to move one route from the legacy monolith to Nuxt, in the order that keeps risk low. The decisions behind it
are in the ADRs; the checks are in `CONTRIBUTING.md`.

## 1. Choose the next route

Order by risk and user value, not by page count: read-only lists first, billing-affecting writes last, auth in between
(ADR 0001, 0002, 0003, 0004 followed exactly this order). Look at `npm run migration:status` for what is left.

## 2. Write the contract first

- Describe the legacy JSON in `shared/contracts/<thing>.ts` (zod). Money as integer cents, timestamps ISO-8601.
- Add a unit test with a valid and **an invalid** payload, and extend `tests/e2e/contract.spec.ts` so the schema is run
  against the real backend. If legacy does not offer JSON yet, adding a read-only `/api/v1/...` endpoint is step zero.

## 3. Build behind the rollout switch

- BFF handler in `server/api/` using `fetchLegacy` (401 -> login, drift/outage -> 502, 422 passes through).
- Page from design-system components; strings in both catalogues; tokens only.
- Add the route to `docs/migration-routes.json`. Keep (or add) the legacy fallback page so rollback works.
- Deploy with `NUXT_ROLLOUT="<route>=0"`: the code is live but nobody is on it.

## 4. Verify before exposure

`npm run check` green, including axe, keyboard test and the contract suite. Open the page as a rolled-out user
(`NUXT_ROLLOUT="<route>=100"` locally) and compare it to the legacy page side by side for data parity.

## 5. Roll out in steps

`=0` -> `=10` -> `=50` -> `=100` (or remove the entry), watching `x-served-by` and the error rate between steps.
Any regression: set the route back to `=0`. Nobody needs a deploy for that. Wait for a quiet period at 100% before step 6.

## 6. Decommission

Remove the legacy page and its fallback, delete the `NUXT_ROLLOUT` entry, update the inventory and write the ADR
(what was decided, the user/business value, and what is still not handled). Removing the fallback is the point of no
easy return, so it is its own change.

## What this playbook does not cover

Real traffic metrics and automatic rollback, shared layout chrome between legacy and Nuxt pages, and data migration.
They belong in the first production-grade iteration.
