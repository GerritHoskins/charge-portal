// Only same-site portal paths are valid post-login targets (blocks open redirects such
// as `//evil.example` or `https://evil.example`). Mirrors legacy/auth.mjs: now that
// Nuxt performs the post-login redirect itself, it needs its own guard.
export const DEFAULT_NEXT = '/portal/stations'

export const safeNext = (value: unknown): string =>
  typeof value === 'string' && /^\/portal\/[A-Za-z0-9/_-]*$/.test(value) ? value : DEFAULT_NEXT
