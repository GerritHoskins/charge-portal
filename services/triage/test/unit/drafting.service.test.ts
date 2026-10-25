import { describe, expect, it, vi } from 'vitest'
import type { DraftProvider } from '../../src/drafting/draft-provider'
import { DraftingService, InvalidDraftError } from '../../src/drafting/drafting.service'
import { makeFault } from '../helpers/fault-factory'

const goodDraft = {
  taxonomyCode: 'PWR.OVERCURRENT',
  probableCause: 'A power component tripped.',
  suggestedAction: 'Inspect the power electronics.',
  requiresSiteVisit: true,
  confidence: 0.6,
  provider: 'stub',
}

function serviceFor(output: unknown) {
  const provider: DraftProvider = { draft: vi.fn().mockResolvedValue(output) }
  return { service: new DraftingService(provider), provider }
}

describe('DraftingService', () => {
  it('passes the fault and context to the provider and returns the validated draft', async () => {
    const { service, provider } = serviceFor(goodDraft)
    const fault = makeFault()
    const context = { recentFaults: [makeFault()] }
    await expect(service.draft(fault, context)).resolves.toEqual(goodDraft)
    expect(provider.draft).toHaveBeenCalledWith(fault, context)
  })

  it('rejects provider output that violates the schema, naming the fields but not the values', async () => {
    const { service } = serviceFor({ ...goodDraft, confidence: 7, taxonomyCode: 'LEAKY-SECRET' })
    const error = await service.draft(makeFault(), { recentFaults: [] }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(InvalidDraftError)
    const { message } = error as InvalidDraftError
    expect(message).toContain('confidence')
    expect(message).toContain('taxonomyCode')
    expect(message).not.toContain('LEAKY-SECRET')
  })

  it('rejects non-object provider output', async () => {
    const { service } = serviceFor(undefined)
    await expect(service.draft(makeFault(), { recentFaults: [] })).rejects.toBeInstanceOf(InvalidDraftError)
  })
})
