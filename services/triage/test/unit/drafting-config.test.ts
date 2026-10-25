import { describe, expect, it } from 'vitest'
import { loadDraftingConfig } from '../../src/drafting/drafting-config'

describe('loadDraftingConfig', () => {
  it('has no key, the default model and a 15 s timeout by default', () => {
    expect(loadDraftingConfig({})).toEqual({ apiKey: undefined, model: 'claude-sonnet-5-5', timeoutMs: 15000 })
  })

  it('treats blank values as unset', () => {
    expect(loadDraftingConfig({ ANTHROPIC_API_KEY: '  ', TRIAGE_DRAFT_MODEL: '', TRIAGE_DRAFT_TIMEOUT_MS: ' ' })).toEqual({
      apiKey: undefined,
      model: 'claude-sonnet-5-5',
      timeoutMs: 15000,
    })
  })

  it('reads the key, the model override and the timeout', () => {
    expect(
      loadDraftingConfig({ ANTHROPIC_API_KEY: ' synthetic-key ', TRIAGE_DRAFT_MODEL: 'claude-opus-5-5', TRIAGE_DRAFT_TIMEOUT_MS: '30000' }),
    ).toEqual({ apiKey: 'synthetic-key', model: 'claude-opus-5-5', timeoutMs: 30000 })
  })

  it.each(['abc', '0', '-5', '99', '1000000', '1.5'])('rejects TRIAGE_DRAFT_TIMEOUT_MS=%s', (value) => {
    expect(() => loadDraftingConfig({ TRIAGE_DRAFT_TIMEOUT_MS: value })).toThrow(/TRIAGE_DRAFT_TIMEOUT_MS/)
  })

  it('rejects a model id that cannot fit the provider field', () => {
    expect(() => loadDraftingConfig({ TRIAGE_DRAFT_MODEL: 'm'.repeat(200) })).toThrow(/TRIAGE_DRAFT_MODEL/)
  })

  it('never echoes the API key in an error', () => {
    let message = ''
    try {
      loadDraftingConfig({ ANTHROPIC_API_KEY: 'synthetic-secret-key', TRIAGE_DRAFT_TIMEOUT_MS: 'abc' })
    } catch (error) {
      message = (error as Error).message
    }
    expect(message).toMatch(/TRIAGE_DRAFT_TIMEOUT_MS/)
    expect(message).not.toContain('synthetic-secret-key')
  })
})
