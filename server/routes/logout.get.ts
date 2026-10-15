// Logout is POST-only (state change, CSRF-protected). A GET, e.g. a stale link or a typed
// URL, changes nothing and just lands on the login page.
export default defineEventHandler((event) => sendRedirect(event, '/login', 303))
