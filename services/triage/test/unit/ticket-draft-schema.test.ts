import { describe, expect, it } from 'vitest'
import { ticketDraftInputSchema } from '../../src/drafting/draft-provider'

const valid = {
  taxonomyCode: 'PWR.OVERCURRENT',
  probableCause: 'A power component tripped.',
  suggestedAction: 'Inspect the power electronics.',
  requiresSiteVisit: true,
  confidence: 0.6,
  provider: 'rules',
}

describe('ticketDraftInputSchema', () => {
  it('accepts a valid draft', () => {
    expect(ticketDraftInputSchema.parse(valid)).toEqual(valid)
  })

  it('accepts UNCLASSIFIED as a taxonomy code', () => {
    expect(ticketDraftInputSchema.safeParse({ ...valid, taxonomyCode: 'UNCLASSIFIED' }).success).toBe(true)
  })

  it('rejects a taxonomy code outside the taxonomy', () => {
    expect(ticketDraftInputSchema.safeParse({ ...valid, taxonomyCode: 'ZZZ.MADE_UP' }).success).toBe(false)
  })

  it.each([-0.1, 1.1, Number.NaN])('rejects confidence %s', (confidence) => {
    expect(ticketDraftInputSchema.safeParse({ ...valid, confidence }).success).toBe(false)
  })

  it.each(['probableCause', 'suggestedAction', 'provider'] as const)('rejects an empty %s', (field) => {
    expect(ticketDraftInputSchema.safeParse({ ...valid, [field]: '   ' }).success).toBe(false)
  })

  it('rejects over-long free text', () => {
    expect(ticketDraftInputSchema.safeParse({ ...valid, probableCause: 'x'.repeat(2001) }).success).toBe(false)
  })

  it('rejects a missing or non-boolean requiresSiteVisit', () => {
    expect(ticketDraftInputSchema.safeParse({ ...valid, requiresSiteVisit: 'yes' }).success).toBe(false)
    const { requiresSiteVisit: _omitted, ...rest } = valid
    expect(ticketDraftInputSchema.safeParse(rest).success).toBe(false)
  })
})
