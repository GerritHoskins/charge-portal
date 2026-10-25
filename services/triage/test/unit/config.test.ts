import { describe, expect, it } from 'vitest'
import { loadConfig } from '../../src/config'

const valid = {
  TRIAGE_DATABASE_URL: 'postgres://triage:triage@localhost:5432/triage_test',
  TRIAGE_INTERNAL_TOKEN: 'synthetic-internal-token',
}

describe('loadConfig', () => {
  it('applies defaults for port and host', () => {
    expect(loadConfig(valid)).toEqual({
      port: 4100,
      host: '127.0.0.1',
      databaseUrl: valid.TRIAGE_DATABASE_URL,
      internalToken: valid.TRIAGE_INTERNAL_TOKEN,
    })
  })

  it('reads TRIAGE_PORT and TRIAGE_HOST', () => {
    expect(loadConfig({ ...valid, TRIAGE_PORT: '4200', TRIAGE_HOST: '0.0.0.0' })).toMatchObject({ port: 4200, host: '0.0.0.0' })
  })

  it('refuses to start without TRIAGE_INTERNAL_TOKEN', () => {
    expect(() => loadConfig({ TRIAGE_DATABASE_URL: valid.TRIAGE_DATABASE_URL })).toThrow(/TRIAGE_INTERNAL_TOKEN/)
  })

  it('rejects a blank TRIAGE_INTERNAL_TOKEN', () => {
    expect(() => loadConfig({ ...valid, TRIAGE_INTERNAL_TOKEN: '  ' })).toThrow(/TRIAGE_INTERNAL_TOKEN/)
  })

  it('refuses to start without TRIAGE_DATABASE_URL', () => {
    expect(() => loadConfig({ TRIAGE_INTERNAL_TOKEN: valid.TRIAGE_INTERNAL_TOKEN })).toThrow(/TRIAGE_DATABASE_URL/)
  })

  it('rejects an invalid port', () => {
    expect(() => loadConfig({ ...valid, TRIAGE_PORT: 'abc' })).toThrow(/TRIAGE_PORT/)
    expect(() => loadConfig({ ...valid, TRIAGE_PORT: '70000' })).toThrow(/TRIAGE_PORT/)
  })

  it('does not echo the token in the error message', () => {
    let message = ''
    try {
      loadConfig({ ...valid, TRIAGE_PORT: 'abc' })
    } catch (error) {
      message = (error as Error).message
    }
    expect(message).toMatch(/TRIAGE_PORT/)
    expect(message).not.toContain(valid.TRIAGE_INTERNAL_TOKEN)
  })
})
