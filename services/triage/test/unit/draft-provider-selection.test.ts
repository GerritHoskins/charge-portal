import { Test } from '@nestjs/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDraftProvider } from '../../src/drafting/create-draft-provider'
import { DRAFT_PROVIDER, type DraftProvider } from '../../src/drafting/draft-provider'
import { DraftingModule } from '../../src/drafting/drafting.module'
import { FallbackDraftProvider } from '../../src/drafting/fallback-draft-provider'
import { RulesDraftProvider } from '../../src/drafting/rules-draft-provider'
import { CLAUDE_CLIENT } from '../../src/drafting/claude-client'
import { makeFault } from '../helpers/fault-factory'
import { answering, modelDraft, toolUseResponse } from '../helpers/fake-claude-client'

afterEach(() => vi.unstubAllEnvs())

describe('createDraftProvider', () => {
  const rules = new RulesDraftProvider()
  const config = { model: 'claude-sonnet-5-5', timeoutMs: 1000 }

  it('without an API key it returns the rules provider itself', () => {
    expect(createDraftProvider({ ...config, apiKey: undefined }, null, rules)).toBe(rules)
  })

  it('with a key and a client it tries Claude first, then rules', async () => {
    const { client, createMessage } = answering(toolUseResponse(modelDraft))
    const provider = createDraftProvider({ ...config, apiKey: 'synthetic-key' }, client, rules)
    expect(provider).toBeInstanceOf(FallbackDraftProvider)
    const draft = await provider.draft(makeFault(), { recentFaults: [] })
    expect(draft.provider).toBe('claude:claude-sonnet-5-5')
    expect(createMessage).toHaveBeenCalledTimes(1)
  })

  it('rejects a key without a client: that is a wiring error, not a silent fallback', () => {
    expect(() => createDraftProvider({ ...config, apiKey: 'synthetic-key' }, null, rules)).toThrow(/client/i)
  })
})

describe('DraftingModule provider selection', () => {
  async function activeProvider(env: Record<string, string | undefined>, fake?: ReturnType<typeof answering>) {
    for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value)
    const builder = Test.createTestingModule({ imports: [DraftingModule] })
    if (fake) builder.overrideProvider(CLAUDE_CLIENT).useValue(fake.client)
    const moduleRef = await builder.compile()
    return moduleRef.get<DraftProvider>(DRAFT_PROVIDER)
  }

  it('wires the rules provider when ANTHROPIC_API_KEY is not set', async () => {
    const provider = await activeProvider({ ANTHROPIC_API_KEY: undefined })
    expect(provider).toBeInstanceOf(RulesDraftProvider)
  })

  it('wires the rules provider when ANTHROPIC_API_KEY is blank', async () => {
    expect(await activeProvider({ ANTHROPIC_API_KEY: '   ' })).toBeInstanceOf(RulesDraftProvider)
  })

  it('wires Claude-then-rules when ANTHROPIC_API_KEY is set (client replaced by a fake: no network)', async () => {
    const fake = answering(toolUseResponse(modelDraft))
    const provider = await activeProvider({ ANTHROPIC_API_KEY: 'synthetic-key', TRIAGE_DRAFT_MODEL: 'claude-opus-4-8' }, fake)
    expect(provider).toBeInstanceOf(FallbackDraftProvider)
    const draft = await provider.draft(makeFault(), { recentFaults: [] })
    expect(draft.provider).toBe('claude:claude-opus-4-8')
  })
})
