# ADR 0003: Invoices migration and the accessible dispute form

**Status:** accepted (demo)

## Context

`/portal/invoices` is the first migrated route that **writes**. A list page can be
wrong and be fixed; a form that silently drops a customer's complaint, or is unusable
with a keyboard or screen reader, cannot. It also removes the last legacy HTML page,
so the proxy table shrinks to login/logout.

## Decision

1. **Reads and writes both go through the BFF and the contract layer.** `GET /api/invoices`
   and `POST /api/invoices/:id/disputes` use `fetchLegacy`. Money crosses the boundary as
   integer cents (`amountCents`), formatted only in the page (`Intl`, `de-DE`, EUR), so
   float or pre-formatted amounts from legacy are rejected as contract drift (502).
2. **One input schema, three enforcement points.** `disputeInputSchema`
   (`shared/contracts/invoice.ts`) runs in the browser for instant feedback, in the BFF,
   and equivalently in legacy, which stays the authority (it re-validates, returns 422
   with per-field messages, and refuses disputes on non-open invoices with 409).
3. **A 422 is a user error, not an outage.** `fetchLegacy` passes a well-formed validation
   body through so the form can show it; any other failure is still 401/502.
4. **Form accessibility pattern** (tested with Playwright + axe, including in each tenant theme):
   - `novalidate` with our own validation, so messages are consistent and in German;
   - on a failed submit, focus moves to an **error summary** (`role="alert"`) whose links
     focus the offending control;
   - each error is also tied to its control (`aria-invalid`, `aria-describedby` with hint
     and error); the radio group is a `fieldset`/`legend` with the error on the group;
   - required state is stated in text, not colour alone; error colour is a token
     (`--color-error`) checked for contrast;
   - on success, focus moves to the confirmation heading, and the list page reflects the new status;
   - the whole flow is covered by a keyboard-only test.
5. **Writes accept JSON only** (legacy returns 415 otherwise). A cross-site HTML form
   cannot send that content type without a CORS preflight, which adds a basic CSRF
   barrier on top of `SameSite=Lax`. It is not a replacement for a CSRF token (see ADR 0002).
6. **State reset for tests** is a legacy endpoint that exists only when
   `LEGACY_ALLOW_RESET=1` (set by the Playwright config), so E2E runs are repeatable.

## Consequences

- No legacy HTML pages remain; the stand-in only owns sessions and the JSON API.
- The form works only with JavaScript (client-side submit). Progressive enhancement
  (a native `POST` fallback) is not implemented.
- The audit trail, idempotency keys and double-submit protection beyond a disabled
  button are not modelled; legacy's 409 prevents a second dispute on the same invoice.
