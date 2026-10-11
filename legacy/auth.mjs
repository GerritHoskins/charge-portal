// Session auth for the legacy stand-in. The legacy backend stays the single
// owner of sessions; the Nuxt app never mints or signs anything, it only
// forwards the browser's cookie and asks `/api/v1/me` who it belongs to.
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'

export const COOKIE = 'legacy_session'
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000

// Demo accounts only. Synthetic credentials for a public demo repo.
export const DEMO_USERS = [{ username: 'demo', password: 'demo-password', name: 'Demo Operator', role: 'operator' }]

const digest = (value) => createHash('sha256').update(String(value)).digest()
const safeEqual = (a, b) => timingSafeEqual(digest(a), digest(b))

// Only same-site portal paths are valid post-login targets (blocks open
// redirects such as `//evil.example` or `https://evil.example`).
export const safeNext = (value) =>
  typeof value === 'string' && /^\/portal\/[A-Za-z0-9/_-]*$/.test(value) ? value : '/portal/stations'

export const parseCookies = (header = '') =>
  Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([name, value]) => name && value !== undefined)
      .map(([name, ...rest]) => [name, rest.join('=')]),
  )

export const sessionCookie = (id, { secure = false, maxAgeMs = SESSION_TTL_MS } = {}) =>
  [`${COOKIE}=${id}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${Math.floor(maxAgeMs / 1000)}`, ...(secure ? ['Secure'] : [])].join('; ')

export const clearCookie = ({ secure = false } = {}) => sessionCookie('', { secure, maxAgeMs: 0 })

export const createAuth = ({ users = DEMO_USERS, now = Date.now } = {}) => {
  const store = new Map()

  return {
    login(username, password) {
      // Always compare, so response time does not reveal whether the user exists.
      const user = users.find((u) => safeEqual(u.username, username))
      const passwordOk = safeEqual(user?.password ?? '', password ?? '')
      if (!user || !passwordOk) return null
      const id = randomUUID()
      store.set(id, { name: user.name, role: user.role, expiresAt: now() + SESSION_TTL_MS })
      return id
    },
    lookup(id) {
      const entry = id ? store.get(id) : undefined
      if (!entry) return null
      if (entry.expiresAt <= now()) {
        store.delete(id)
        return null
      }
      return { name: entry.name, role: entry.role }
    },
    logout(id) {
      store.delete(id)
    },
  }
}
