import { randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import { createCsrf } from './csrf-token'

export const CSRF_COOKIE = 'csrf_token'

let csrf: ReturnType<typeof createCsrf> | undefined
const tokens = (): ReturnType<typeof createCsrf> => {
  if (csrf) return csrf
  const { csrfSecret } = useRuntimeConfig()
  if (!csrfSecret && !import.meta.dev) {
    // Safe single-instance fallback; tokens simply stop validating after a restart and are
    // re-issued on the next page load. Set NUXT_CSRF_SECRET for multiple instances.
    console.warn('[csrf] NUXT_CSRF_SECRET is not set, using a per-process secret')
  }
  // Dev rebuilds Nitro on every edit; a fixed public secret keeps open forms valid there.
  csrf = createCsrf(csrfSecret || (import.meta.dev ? 'dev-only-csrf-secret' : randomBytes(32).toString('hex')))
  return csrf
}

const setCsrfCookie = (event: H3Event, token: string) => {
  setCookie(event, CSRF_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: useRuntimeConfig().cookieSecure,
    path: '/',
    maxAge: 12 * 60 * 60,
  })
  event.context.csrfToken = token
}

// Called for HTML page requests: reuse a valid token, otherwise mint one. The token is
// handed to the page through `event.context` (see app/composables/useCsrfToken.ts).
export const ensureCsrfToken = (event: H3Event): string => {
  const current = getCookie(event, CSRF_COOKIE)
  if (current && tokens().verify(current, current)) {
    event.context.csrfToken = current
    return current
  }
  return rotateCsrfToken(event)
}

// New token after a privilege change (login, logout), so a token that was visible
// before the change cannot be replayed afterwards.
export const rotateCsrfToken = (event: H3Event): string => {
  const token = tokens().issue()
  setCsrfCookie(event, token)
  return token
}

export const isValidCsrf = (event: H3Event, submitted: string | undefined): boolean =>
  tokens().verify(getCookie(event, CSRF_COOKIE), submitted)
