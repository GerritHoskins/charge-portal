import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetDatabase } from '../integration/setup'

describe('integration test database reset', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('refuses to wipe the development database named "triage" outside CI', async () => {
    vi.stubEnv('CI', '')
    vi.stubEnv('TRIAGE_ALLOW_DB_RESET', '')
    await expect(resetDatabase('postgres://triage:triage@localhost:5432/triage')).rejects.toThrow(/Refusing to wipe/)
  })
})
