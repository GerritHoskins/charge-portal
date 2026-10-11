# ADR 0002: Auth hand-over, legacy stays the session owner

**Status:** accepted (demo)

## Context

Once a monolith and a new frontend share one origin, users must not log in twice, and
neither side may render protected data for an anonymous request. Auth is also the
riskiest thing to move: a mistake is a security incident, not a visual bug.

## Decision

1. **The legacy backend owns sessions** (`legacy/auth.mjs`). It issues an opaque,
   server-side session id in an `HttpOnly; SameSite=Lax` cookie (`Secure` via
   `COOKIE_SECURE=1`). Nuxt never mints, signs or parses a session; it forwards the
   cookie and asks `GET /api/v1/me` who it belongs to (contract: `shared/contracts/me.ts`).
2. **Login and logout stay legacy pages**, proxied by `routeRules` on the same origin
   (`/login`, `/logout`). Moving them is a later, separate migration step.
3. **The Nuxt guard runs on the server** (`server/middleware/auth.ts`) for `/portal/**`
   and `/api/**`, before any page renders. Anonymous page requests get a 302 to
   `/login?next=…`; anonymous API calls get 401. A client-side route guard would
   have flashed protected content first.
4. **Outages are not logouts.** Only a 401 from legacy redirects to login; a legacy
   outage or contract drift surfaces as 502, so users are not bounced into a login
   loop during an incident.
5. **`next=` is allow-listed** (`safeNext`): only `/portal/<safe chars>` paths are
   accepted, which blocks open redirects (`//evil.example`, absolute URLs, `..`).
6. **Server-side logout.** `POST /logout` deletes the session in the store, so a copied
   cookie is dead afterwards. This is tested explicitly, not just cookie deletion in the browser.

## Things that bit during implementation

- The Nitro proxy **follows redirects by default**. Proxying `POST /login` swallowed
  legacy's 302 and its `Set-Cookie` and then re-requested the target from legacy
  (404). Fix: `fetchOptions: { redirect: 'manual' }` on the `/login` and `/logout` rules.
- A hypothesis I tested and **disproved**: that SSR `useFetch('/api/…')` drops the
  browser's cookies and needs `useRequestFetch()`. In this Nuxt version relative-URL
  `useFetch` already forwards them, so no wrapper is needed.

## Consequences

- Every Nuxt request to `/portal` or `/api` costs one extra call to legacy (`/me`).
  Acceptable for the demo. Options when it matters: short-lived in-memory cache keyed
  by session id, or moving session verification into a shared token.
- Sessions live in legacy process memory (lost on restart, single instance only).
  A real system would use a shared store.
- Logout is a `POST` guarded only by `SameSite=Lax`. A real system should add a CSRF token.
- Demo credentials (`demo` / `demo-password`) are synthetic and public by design.

## Not decided yet

Moving login/logout into Nuxt; SSO; rate limiting and lockout on `/login`; CSRF tokens.
