import { z } from 'zod'

// What the browser form posts to Nuxt. Length caps bound the work done per request.
export const loginBodySchema = z.object({
  username: z.string().min(1).max(128),
  password: z.string().min(1).max(256),
  _csrf: z.string().min(1).max(256),
  next: z.string().max(256).optional(),
})

export const logoutBodySchema = z.object({ _csrf: z.string().min(1).max(256) })

export type LoginResult =
  | { kind: 'ok'; setCookies: string[] }
  | { kind: 'invalid' }
  | { kind: 'unavailable' }

const SESSION_COOKIE = /^legacy_session=[^;\s]+/

// Contract of legacy `POST /login` (form-encoded, redirects not followed):
//   302 + Set-Cookie: legacy_session=<id>  -> logged in
//   401                                    -> credentials rejected
// Anything else (a 302 without the cookie, a 200, a 5xx) is drift or an outage and must
// never be mistaken for either answer: it must not log anyone in, nor count as a wrong password.
export const parseLegacyLogin = (status: number, setCookies: string[]): LoginResult => {
  if (status === 401) return { kind: 'invalid' }
  if (status === 302 && setCookies.some((cookie) => SESSION_COOKIE.test(cookie))) return { kind: 'ok', setCookies }
  return { kind: 'unavailable' }
}
