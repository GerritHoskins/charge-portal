import { describe, expect, it } from 'vitest'
import { safeNext } from '#shared/auth/safe-next'
import { loginBodySchema, parseLegacyLogin } from '#shared/contracts/login'

describe('legacy login contract', () => {
  it('a 302 with a legacy_session cookie is a successful login', () => {
    expect(parseLegacyLogin(302, ['legacy_session=abc; Path=/; HttpOnly'])).toEqual({
      kind: 'ok',
      setCookies: ['legacy_session=abc; Path=/; HttpOnly'],
    })
  })

  it('a 401 is rejected credentials, not an outage', () => {
    expect(parseLegacyLogin(401, [])).toEqual({ kind: 'invalid' })
  })

  it.each([
    ['302 without any cookie (contract drift)', 302, []],
    ['302 with an unrelated cookie', 302, ['other=1; Path=/']],
    ['302 with an empty session cookie', 302, ['legacy_session=; Max-Age=0']],
    ['a 500', 500, []],
    ['a 200 (legacy rendered the form again)', 200, []],
  ])('treats %s as unavailable', (_label, status, cookies) => {
    expect(parseLegacyLogin(status, cookies)).toEqual({ kind: 'unavailable' })
  })
})

describe('login body', () => {
  it('accepts a form post', () => {
    expect(loginBodySchema.safeParse({ username: 'demo', password: 'x', _csrf: 't', next: '/portal/sessions' }).success).toBe(true)
  })

  it.each([
    ['missing username', { password: 'x', _csrf: 't' }],
    ['empty password', { username: 'demo', password: '', _csrf: 't' }],
    ['oversized username', { username: 'u'.repeat(129), password: 'x', _csrf: 't' }],
    ['non-string password (array from a repeated field)', { username: 'demo', password: ['a', 'b'], _csrf: 't' }],
  ])('rejects %s', (_label, body) => {
    expect(loginBodySchema.safeParse(body).success).toBe(false)
  })
})

describe('safeNext (open-redirect guard, Nuxt side)', () => {
  it.each(['/portal/stations', '/portal/invoices/2026-01'])('keeps %s', (path) => {
    expect(safeNext(path)).toBe(path)
  })

  it.each(['//evil.example', 'https://evil.example/portal/x', '/\\evil.example', '/portal/../admin', '/other', '', null, undefined, ['/portal/a']])(
    'falls back for %s',
    (value) => {
      expect(safeNext(value)).toBe('/portal/stations')
    },
  )
})
