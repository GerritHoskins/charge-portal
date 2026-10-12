import { type LoginResult, parseLegacyLogin } from '#shared/contracts/login'

// Raw (status + Set-Cookie) calls to the legacy session owner. Redirects are not followed:
// following legacy's 302 would swallow its Set-Cookie (see ADR 0002).
const callLegacy = async (path: string, body: URLSearchParams, cookie?: string) => {
  const { legacyOrigin } = useRuntimeConfig()
  const response = await $fetch.raw(`${legacyOrigin}${path}`, {
    method: 'POST',
    body,
    headers: cookie ? { cookie } : {},
    redirect: 'manual',
    retry: 0,
    ignoreResponseError: true,
  })
  return { status: response.status, setCookies: response.headers.getSetCookie() }
}

export const legacyLogin = async (username: string, password: string): Promise<LoginResult> => {
  try {
    const { status, setCookies } = await callLegacy('/login', new URLSearchParams({ username, password }))
    return parseLegacyLogin(status, setCookies)
  } catch {
    return { kind: 'unavailable' }
  }
}

// Ends the session in legacy's store (a copied cookie must be dead afterwards) and returns
// the cookie-clearing headers to pass on. Throws 502 if legacy cannot confirm.
export const legacyLogout = async (cookie: string | undefined): Promise<string[]> => {
  try {
    const { status, setCookies } = await callLegacy('/logout', new URLSearchParams(), cookie)
    if (status === 302) return setCookies
  } catch {
    // falls through to the 502 below
  }
  throw createError({ statusCode: 502, statusMessage: 'Legacy backend unreachable' })
}

// Pass legacy's Set-Cookie headers on to the browser untouched: Nuxt never mints sessions.
export const relaySetCookies = (event: Parameters<typeof appendResponseHeader>[0], setCookies: string[]) => {
  for (const cookie of setCookies) appendResponseHeader(event, 'set-cookie', cookie)
}
