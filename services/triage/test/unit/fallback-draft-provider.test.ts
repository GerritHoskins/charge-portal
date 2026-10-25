import { describe, expect, it, vi } from 'vitest'
import { ClaudeDraftProvider } from '../../src/drafting/claude-draft-provider'
import { DraftProviderError, type DraftProvider, ticketDraftInputSchema } from '../../src/drafting/draft-provider'
import { DraftingService } from '../../src/drafting/drafting.service'
import { FallbackDraftProvider } from '../../src/drafting/fallback-draft-provider'
import { RulesDraftProvider } from '../../src/drafting/rules-draft-provider'
import { makeFault } from '../helpers/fault-factory'
import { answering, fakeClient, modelDraft, toolUseResponse } from '../helpers/fake-claude-client'

const context = { recentFaults: [] }
const claudeDraft = { ...modelDraft, provider: 'claude:claude-sonnet-5-5' }

function setup(primary: DraftProvider) {
  const logger = { warn: vi.fn() }
  const rules = new RulesDraftProvider()
  const rulesSpy = vi.spyOn(rules, 'draft')
  return { provider: new FallbackDraftProvider(primary, rules, logger), logger, rulesSpy }
}

describe('FallbackDraftProvider', () => {
  it('returns the primary draft and leaves the rules provider alone', async () => {
    const { provider, logger, rulesSpy } = setup({ draft: vi.fn().mockResolvedValue(claudeDraft) })
    await expect(provider.draft(makeFault(), context)).resolves.toEqual(claudeDraft)
    expect(rulesSpy).not.toHaveBeenCalled()
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('falls back to the rules draft and records the reason in provider', async () => {
    const fault = makeFault()
    const { provider, rulesSpy } = setup({ draft: vi.fn().mockRejectedValue(new DraftProviderError('timeout')) })
    const draft = await provider.draft(fault, context)
    expect(rulesSpy).toHaveBeenCalledWith(fault, context)
    expect(draft.provider).toBe('rules (fallback: timeout)')
    expect(draft.taxonomyCode).toBe(fault.taxonomyCode)
    expect(ticketDraftInputSchema.safeParse(draft).success).toBe(true)
  })

  it('treats an unexpected error as a fallback reason too', async () => {
    const { provider } = setup({ draft: vi.fn().mockRejectedValue(new TypeError('boom')) })
    expect((await provider.draft(makeFault(), context)).provider).toBe('rules (fallback: unexpected-error)')
  })

  it('logs one warning with the reason and no fault data, prompt or secret', async () => {
    const fault = makeFault({ vendorErrorCode: 'SECRET-VENDOR-CODE', raw: { info: 'SECRET-INFO' } })
    const failure = new DraftProviderError('invalid-output', 'confidence, probableCause')
    const { provider, logger } = setup({ draft: vi.fn().mockRejectedValue(failure) })
    await provider.draft(fault, context)
    expect(logger.warn).toHaveBeenCalledTimes(1)
    const message = String(logger.warn.mock.calls[0][0])
    expect(message).toContain('invalid-output')
    expect(message).toContain('confidence, probableCause')
    for (const secret of ['SECRET-VENDOR-CODE', 'SECRET-INFO', fault.stationId, fault.id]) expect(message).not.toContain(secret)
  })

  it('keeps provider within the 100 characters the draft schema allows', async () => {
    const { provider } = setup({ draft: vi.fn().mockRejectedValue(new DraftProviderError('x'.repeat(300))) })
    const draft = await provider.draft(makeFault(), context)
    expect(draft.provider.length).toBeLessThanOrEqual(100)
    expect(draft.provider.startsWith('rules (fallback: ')).toBe(true)
    expect(ticketDraftInputSchema.safeParse(draft).success).toBe(true)
  })

  it('lets a failure of the rules provider itself through', async () => {
    const rules = new RulesDraftProvider()
    vi.spyOn(rules, 'draft').mockRejectedValue(new Error('rules failed'))
    const provider = new FallbackDraftProvider({ draft: vi.fn().mockRejectedValue(new DraftProviderError('timeout')) }, rules, { warn: vi.fn() })
    await expect(provider.draft(makeFault(), context)).rejects.toThrow('rules failed')
  })
})

describe('Claude provider behind the fallback and the drafting service (fake client)', () => {
  const claude = (client: ReturnType<typeof answering>['client']) => new ClaudeDraftProvider(client, { model: 'claude-sonnet-5-5', timeoutMs: 50 })
  const draftVia = (client: ReturnType<typeof answering>['client']) => {
    const { provider } = setup(claude(client))
    return new DraftingService(provider).draft(makeFault(), context)
  }

  it('valid tool output becomes a claude draft', async () => {
    const draft = await draftVia(answering(toolUseResponse(modelDraft)).client)
    expect(draft.provider).toBe('claude:claude-sonnet-5-5')
  })

  it.each([
    ['prose only', answering({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Send a technician.' }] }), 'no-tool-call'],
    ['schema-invalid input', answering(toolUseResponse({ ...modelDraft, confidence: 3 })), 'invalid-output'],
    ['an unknown taxonomyCode', answering(toolUseResponse({ ...modelDraft, taxonomyCode: 'NOPE.NOPE' })), 'unknown-taxonomy-code'],
    ['a thrown error', fakeClient(() => Promise.reject(new Error('network down'))), 'api-error'],
    ['a timeout', fakeClient(() => new Promise(() => {})), 'timeout'],
  ])('%s falls back to the rules draft', async (_name, { client }, reason) => {
    const draft = await draftVia(client)
    expect(draft.provider).toBe(`rules (fallback: ${reason})`)
    expect(draft.probableCause.length).toBeGreaterThan(0)
  })
})
