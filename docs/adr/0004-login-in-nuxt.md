# ADR 0004: Login and logout in Nuxt, with CSRF tokens and rate limiting

**Status:** accepted (demo). Supersedes decision 2 of ADR 0002 and its "logout guarded only by SameSite" consequence.

## Context

The routing table was down to `/login` and `/logout`, proxied to legacy. Moving them is the
last strangler step, and the moment to close two gaps ADR 0002 listed as "not decided":
CSRF tokens and rate limiting on `/login`.

## Decision

1. **Nuxt owns the pages and the form handlers, legacy still owns the session.** `app/pages/login.vue`
   renders the form; `server/routes/login.post.ts` and `logout.post.ts` verify, throttle, then call
   legacy's existing `POST /login` / `POST /logout` (redirects not followed) and relay its `Set-Cookie`.
   Nuxt still never mints or parses a session (ADR 0002, decision 1). Legacy's wire contract is
   `shared/contracts/login.ts`: `302` + `legacy_session` cookie = success, `401` = bad credentials, anything
   else = unavailable (502). Drift is never read as "logged in" nor counted as a wrong password.
2. **CSRF: signed double-submit token** (`server/utils/csrf-token.ts`). `server/middleware/csrf.ts` issues
   `csrf_token` (`HttpOnly; SameSite=Strict`, `Secure` via `COOKIE_SECURE=1`) on HTML page requests; the same
   value is rendered into the forms as `_csrf`. A post must present cookie and field that match **and** carry our
   HMAC signature, so a planted cookie (sibling subdomain) cannot be paired with a forged field. The token is
   rotated on login and logout. Login/logout are plain HTML form posts and keep working before hydration.
   CSRF is checked **first**, so a forged post cannot burn the victim's attempt budget.
3. **Rate limiting only counts failures**, in two independent fixed windows (15 min): 5 per ip+username and
   20 per ip. Over the limit the handler does not call legacy at all and redirects with `error=rate_limited`
   and a `Retry-After` header. The per-user limit is deliberately keyed with the ip: a global per-account lockout
   lets anyone lock the real user out.
4. **Failures redirect (303) to `/login?error=<code>`** instead of rendering from the POST, so reload does not
   re-submit and the page stays a plain Nuxt page. Codes map to German messages client-side; they carry no data.
5. `routeRules` is now empty. Legacy's own `/login` form still exists on :8080 and must not be reachable from
   the internet (see Consequences).

## Consequences

- **Legacy's login endpoint has none of these protections.** Anyone who can reach it directly bypasses CSRF and
  throttling. In a real deployment legacy must be network-internal (only Nuxt may call it); this is a deployment
  requirement, not enforced in code.
- The throttle and the fallback CSRF secret are in process memory: single instance only, and tokens issued
  before a restart stop validating (the next page load re-issues one). For several instances set
  `NUXT_CSRF_SECRET` and move the throttle to a shared store behind the same `createRateLimiter` interface.
- The client ip comes from the socket. Behind a reverse proxy set `NUXT_TRUST_PROXY=true` (and only if the proxy
  overwrites `X-Forwarded-For`), otherwise every user shares the proxy's ip and the 20/ip limit hits everyone.
- A distributed attack (many ips against one account) is slowed, not stopped; that needs MFA or account-level
  alerts, out of scope here.
- Throttled responses are `303`, not `429`, because the target is a browser form. An API client would want `429`.

## User and business value

The entry point of the product is now part of the new frontend (same look, language and accessibility as the rest),
and credential guessing and forged logout/login requests are blocked. Removing the last proxy rule means the team
can stop reasoning about two request paths for the front door.
