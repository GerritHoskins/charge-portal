import { describe, expect, it } from 'vitest'
import { createCsrf } from '../../server/utils/csrf-token'

const csrf = createCsrf('test-secret')

describe('csrf token (signed double submit)', () => {
  it('accepts the token that was issued when cookie and form value match', () => {
    const token = csrf.issue()
    expect(csrf.verify(token, token)).toBe(true)
  })

  it('issues a different token every time', () => {
    expect(csrf.issue()).not.toBe(csrf.issue())
  })

  it.each([
    ['missing cookie', undefined, 'x'],
    ['missing form value', 'x', undefined],
    ['empty values', '', ''],
  ])('rejects %s', (_label, cookie, submitted) => {
    expect(csrf.verify(cookie, submitted)).toBe(false)
  })

  it('rejects a form value that differs from the cookie', () => {
    expect(csrf.verify(csrf.issue(), csrf.issue())).toBe(false)
  })

  it('rejects a token that was not signed by us (cookie injection)', () => {
    const forged = 'attacker-nonce.deadbeef'
    expect(csrf.verify(forged, forged)).toBe(false)
  })

  it('rejects a token signed with another secret', () => {
    const other = createCsrf('another-secret').issue()
    expect(csrf.verify(other, other)).toBe(false)
  })

  it('rejects tokens without a signature part', () => {
    expect(csrf.verify('nodot', 'nodot')).toBe(false)
  })
})
