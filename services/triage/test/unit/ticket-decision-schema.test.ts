import { describe, expect, it } from 'vitest'
import { EDITABLE_FIELDS, rejectReasonSchema, ticketEditSchema } from '../../src/tickets/ticket-decision.schema'

describe('ticketEditSchema', () => {
  it('lists the editable fields in a fixed order', () => {
    expect(EDITABLE_FIELDS).toEqual(['probableCause', 'suggestedAction', 'taxonomyCode', 'requiresSiteVisit'])
  })

  it.each([
    ['probableCause', { probableCause: 'Contactor welded' }],
    ['suggestedAction', { suggestedAction: 'Replace the contactor' }],
    ['taxonomyCode', { taxonomyCode: 'PWR.OVERCURRENT' }],
    ['requiresSiteVisit', { requiresSiteVisit: false }],
  ])('accepts a single field: %s', (_name, input) => {
    expect(ticketEditSchema.safeParse(input).success).toBe(true)
  })

  it('trims text fields', () => {
    expect(ticketEditSchema.parse({ probableCause: '  cause  ' })).toEqual({ probableCause: 'cause' })
  })

  it('treats null (an explicit GraphQL null) like an absent field', () => {
    expect(ticketEditSchema.parse({ probableCause: null, requiresSiteVisit: true })).toEqual({ requiresSiteVisit: true })
  })

  it('keeps false as a value', () => {
    expect(ticketEditSchema.parse({ requiresSiteVisit: false })).toEqual({ requiresSiteVisit: false })
  })

  it.each([
    ['an empty input', {}],
    ['only nulls', { probableCause: null, taxonomyCode: null }],
    ['a blank probableCause', { probableCause: '   ' }],
    ['a blank suggestedAction', { suggestedAction: '' }],
    ['an over-long probableCause', { probableCause: 'x'.repeat(2001) }],
    ['an over-long suggestedAction', { suggestedAction: 'x'.repeat(2001) }],
    ['a taxonomyCode outside the taxonomy', { taxonomyCode: 'PWR.MADE_UP' }],
    ['a lower-case taxonomyCode', { taxonomyCode: 'pwr.overcurrent' }],
    ['a non-boolean requiresSiteVisit', { requiresSiteVisit: 'yes' }],
    ['an unknown key', { probableCause: 'ok', state: 'approved' }],
  ])('rejects %s', (_name, input) => {
    expect(ticketEditSchema.safeParse(input).success).toBe(false)
  })

  it('accepts UNCLASSIFIED, a taxonomy member', () => {
    expect(ticketEditSchema.safeParse({ taxonomyCode: 'UNCLASSIFIED' }).success).toBe(true)
  })
})

describe('rejectReasonSchema', () => {
  it('trims the reason', () => {
    expect(rejectReasonSchema.parse('  Duplicate of an open ticket  ')).toBe('Duplicate of an open ticket')
  })

  it('accepts exactly 3 and exactly 500 characters', () => {
    expect(rejectReasonSchema.safeParse('abc').success).toBe(true)
    expect(rejectReasonSchema.safeParse('x'.repeat(500)).success).toBe(true)
  })

  it.each([
    ['empty', ''],
    ['whitespace only', '     '],
    ['two characters', 'ab'],
    ['two characters padded with spaces', '   ab   '],
    ['501 characters', 'x'.repeat(501)],
    ['not a string', 42],
  ])('rejects %s', (_name, value) => {
    expect(rejectReasonSchema.safeParse(value).success).toBe(false)
  })

  it('measures the length after trimming', () => {
    expect(rejectReasonSchema.safeParse(` ${'x'.repeat(500)} `).success).toBe(true)
  })
})
