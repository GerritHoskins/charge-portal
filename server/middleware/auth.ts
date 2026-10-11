import { meResponseSchema } from '#shared/contracts/me'

// Auth guard for everything the Nuxt app serves under /portal and /api.
// Runs on the server before any page renders, so an unauthenticated request
// never receives portal HTML (a client-side guard would flash content first).
// The legacy backend remains the session owner: we only ask it who the cookie
// belongs to. `/login` and `/logout` are proxied to legacy and not guarded here.
export default defineEventHandler(async (event) => {
  const { pathname } = getRequestURL(event)
  const isApi = pathname.startsWith('/api/')
  if (!isApi && !pathname.startsWith('/portal')) return

  try {
    await fetchLegacy(event, '/api/v1/me', meResponseSchema)
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode
    if (status !== 401) throw error // outage or contract drift: surface it, don't bounce to login
    if (isApi) throw error
    return sendRedirect(event, `/login?next=${encodeURIComponent(pathname)}`, 302)
  }
})
