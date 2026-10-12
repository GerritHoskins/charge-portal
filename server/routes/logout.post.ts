import { logoutBodySchema } from '#shared/contracts/login'

// Logout is state-changing, so it needs the same CSRF proof as login: without it any
// site could sign the user out with a hidden form post.
export default defineEventHandler(async (event) => {
  const body = logoutBodySchema.safeParse(await readBody(event).catch(() => undefined))
  if (!body.success || !isValidCsrf(event, body.data._csrf)) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid CSRF token' })
  }

  const setCookies = await legacyLogout(getRequestHeader(event, 'cookie'))
  relaySetCookies(event, setCookies)
  rotateCsrfToken(event)
  return sendRedirect(event, '/login', 303)
})
