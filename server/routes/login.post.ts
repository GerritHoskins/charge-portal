import { DEFAULT_NEXT, safeNext } from '#shared/auth/safe-next'
import { loginBodySchema } from '#shared/contracts/login'

// Browser form post. Order matters: CSRF first (so a forged cross-site post cannot burn
// the victim's attempt budget), then throttle, then the actual credential check in legacy.
// Failures redirect back to the form (303) with an error code instead of rendering here.
export default defineEventHandler(async (event) => {
  const raw = await readBody(event).catch(() => undefined)
  const next = safeNext(raw?.next)
  const back = (error: string) => sendRedirect(event, `/login?error=${error}${next === DEFAULT_NEXT ? '' : `&next=${encodeURIComponent(next)}`}`, 303)

  if (!isValidCsrf(event, typeof raw?._csrf === 'string' ? raw._csrf : undefined)) return back('csrf')
  const body = loginBodySchema.safeParse(raw)
  if (!body.success) return back('invalid')
  const { username, password } = body.data

  const ip = getRequestIP(event, { xForwardedFor: useRuntimeConfig().trustProxy }) ?? 'unknown'
  const throttle = loginThrottle.check(ip, username)
  if (!throttle.allowed) {
    setResponseHeader(event, 'retry-after', throttle.retryAfterSec)
    return back('rate_limited')
  }

  const result = await legacyLogin(username, password)
  if (result.kind === 'unavailable') throw createError({ statusCode: 502, statusMessage: 'Legacy backend unreachable' })
  if (result.kind === 'invalid') {
    loginThrottle.recordFailure(ip, username)
    return back('invalid')
  }

  loginThrottle.recordSuccess(ip, username)
  relaySetCookies(event, result.setCookies)
  rotateCsrfToken(event)
  return sendRedirect(event, next, 303)
})
