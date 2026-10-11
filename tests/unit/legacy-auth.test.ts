import { describe, expect, it } from 'vitest'
// @ts-expect-error plain .mjs module without type declarations
import { clearCookie, createAuth, parseCookies, safeNext, SESSION_TTL_MS, sessionCookie } from '../../legacy/auth.mjs'

const users = [{ username: 'u', password: 'p', name: 'U', role: 'operator' }]

describe('safeNext (open-redirect guard)', () => {
  it.each(['/portal/stations', '/portal/sessions', '/portal/invoices/2026-01'])('keeps %s', (path) => {
    expect(safeNext(path)).toBe(path)
  })

  it.each([
    '//evil.example',
    'https://evil.example/portal/stations',
    '/\\evil.example',
    '/portal/../admin',
    '/portal/x?next=//evil.example',
    '/other',
    '',
    null,
    undefined,
  ])('falls back for %s', (value) => {
    expect(safeNext(value)).toBe('/portal/stations')
  })
})

describe('session auth', () => {
  it('logs in with valid credentials and resolves the session', () => {
    const auth = createAuth({ users })
    const id = auth.login('u', 'p')
    expect(id).toEqual(expect.any(String))
    expect(auth.lookup(id)).toEqual({ name: 'U', role: 'operator' })
  })

  it.each([
    ['wrong password', 'u', 'x'],
    ['unknown user', 'nobody', 'p'],
    ['missing fields', null, null],
  ])('rejects %s', (_label, username, password) => {
    expect(createAuth({ users }).login(username, password)).toBeNull()
  })

  it('expires sessions after the TTL', () => {
    let now = 1_000
    const auth = createAuth({ users, now: () => now })
    const id = auth.login('u', 'p')
    now += SESSION_TTL_MS - 1
    expect(auth.lookup(id)).not.toBeNull()
    now += 1
    expect(auth.lookup(id)).toBeNull()
  })

  it('logout invalidates the session server-side', () => {
    const auth = createAuth({ users })
    const id = auth.login('u', 'p')
    auth.logout(id)
    expect(auth.lookup(id)).toBeNull()
  })

  it('ignores unknown or empty session ids', () => {
    const auth = createAuth({ users })
    expect(auth.lookup('nope')).toBeNull()
    expect(auth.lookup(undefined)).toBeNull()
  })
})

describe('cookies', () => {
  it('sets HttpOnly and SameSite=Lax, adds Secure only when asked', () => {
    expect(sessionCookie('abc')).toContain('HttpOnly')
    expect(sessionCookie('abc')).toContain('SameSite=Lax')
    expect(sessionCookie('abc')).not.toContain('Secure')
    expect(sessionCookie('abc', { secure: true })).toContain('Secure')
  })

  it('clears with Max-Age=0', () => {
    expect(clearCookie()).toContain('Max-Age=0')
  })

  it('parses a cookie header', () => {
    expect(parseCookies('a=1; legacy_session=xyz; b=c=d')).toEqual({ a: '1', legacy_session: 'xyz', b: 'c=d' })
  })
})
