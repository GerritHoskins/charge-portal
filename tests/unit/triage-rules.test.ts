import { describe, expect, it } from 'vitest'
import { TAXONOMY } from '@charge-portal/fault-taxonomy'
import {
  EDIT_FIELDS,
  FIELD_ERRORS,
  REASON_MAX,
  REASON_MIN,
  TAXONOMY_CODES,
  TEXT_MAX,
  buildEdit,
  errorFromIssueCode,
  validateEdit,
  validateReason,
} from '#shared/contracts/triage-rules'
import { editableFieldSchema, ticketDecisionInputSchema } from '#shared/contracts/triage'

const draft = {
  probableCause: 'Lock motor stalled.',
  suggestedAction: 'Replace the lock.',
  taxonomyCode: 'CON.LOCK_FAILURE',
  requiresSiteVisit: true,
}

describe('constants', () => {
  it('lists exactly the taxonomy codes (the browser copy must not drift from the package)', () => {
    expect([...TAXONOMY_CODES].sort()).toEqual(Object.keys(TAXONOMY).sort())
  })

  it('lists exactly the editable fields of the contract', () => {
    expect([...EDIT_FIELDS].sort()).toEqual([...editableFieldSchema.options].sort())
  })
})

describe('validateReason', () => {
  it('accepts a trimmed reason within bounds', () => {
    expect(validateReason('  Duplikat von T-1  ')).toEqual({ value: 'Duplikat von T-1', fields: {} })
  })

  it.each([undefined, null, 42, '', '   '])('asks for a reason when given %j', (input) => {
    expect(validateReason(input)).toEqual({ fields: { reason: 'required' } })
  })

  it.each(['ab', ' ab '])('says a reason of %j is too short', (input) => {
    expect(validateReason(input)).toEqual({ fields: { reason: 'tooShort' } })
  })

  it('says an over-long reason is too long', () => {
    expect(validateReason('x'.repeat(REASON_MAX + 1))).toEqual({ fields: { reason: 'tooLong' } })
  })

  it('accepts the exact bounds', () => {
    expect(validateReason('x'.repeat(REASON_MIN)).value).toBeDefined()
    expect(validateReason('x'.repeat(REASON_MAX)).value).toBeDefined()
  })
})

describe('buildEdit / validateEdit', () => {
  it('sends only the changed fields and trims text', () => {
    const result = validateEdit(draft, { ...draft, probableCause: '  Lock jammed.  ' })
    expect(result).toEqual({ value: { action: 'edit', probableCause: 'Lock jammed.' }, fields: {} })
  })

  it('treats whitespace-only differences as no change', () => {
    expect(buildEdit(draft, { ...draft, suggestedAction: '  Replace the lock.  ' })).toEqual({})
  })

  it('reports a change of every editable field', () => {
    const edited = { probableCause: 'a', suggestedAction: 'b', taxonomyCode: 'PWR.OVERCURRENT', requiresSiteVisit: false }
    expect(Object.keys(buildEdit(draft, edited)).sort()).toEqual([...EDIT_FIELDS].sort())
  })

  it('asks for a change when nothing differs', () => {
    expect(validateEdit(draft, draft)).toEqual({ fields: { probableCause: 'noChange' } })
  })

  it('flags empty and over-long text per field', () => {
    const result = validateEdit(draft, { ...draft, probableCause: '   ', suggestedAction: 'x'.repeat(TEXT_MAX + 1) })
    expect(result).toEqual({ fields: { probableCause: 'required', suggestedAction: 'tooLong' } })
  })

  it('rejects a taxonomy code outside the taxonomy', () => {
    expect(validateEdit(draft, { ...draft, taxonomyCode: 'NOPE.NOPE' })).toEqual({ fields: { taxonomyCode: 'unknownClass' } })
  })
})

describe('errorFromIssueCode', () => {
  it.each([
    ['too_small', 'tooShort'],
    ['too_big', 'tooLong'],
    ['no_change', 'noChange'],
    ['invalid_value', 'unknownClass'],
    ['custom', 'invalid'],
    ['something_new', 'invalid'],
  ])('maps the service code %s to %s', (code, expected) => {
    expect(errorFromIssueCode(code)).toBe(expected)
  })

  it('only ever returns a known error', () => {
    for (const code of ['too_small', 'too_big', 'no_change', 'invalid_value', 'x']) {
      expect(FIELD_ERRORS).toContain(errorFromIssueCode(code))
    }
  })
})

// The browser rules must never be stricter or looser than the contract the BFF enforces.
describe('agreement with ticketDecisionInputSchema', () => {
  const reasons = ['', ' ', 'ab', 'abc', ' abc ', 'x'.repeat(REASON_MAX), 'x'.repeat(REASON_MAX + 1)]
  it.each(reasons)('reason %j', (reason) => {
    const mine = validateReason(reason).value !== undefined
    expect(ticketDecisionInputSchema.safeParse({ action: 'reject', reason }).success).toBe(mine)
  })

  const texts = ['', ' ', 'ok', ' ok ', 'x'.repeat(TEXT_MAX), 'x'.repeat(TEXT_MAX + 1)]
  it.each(texts)('edit text %j', (text) => {
    const mine = validateEdit(draft, { ...draft, probableCause: text }).value !== undefined
    expect(ticketDecisionInputSchema.safeParse({ action: 'edit', probableCause: text }).success).toBe(mine)
  })

  it.each(['PWR.OVERCURRENT', 'UNCLASSIFIED', 'NOPE.NOPE', ''])('taxonomy code %j', (taxonomyCode) => {
    const mine = validateEdit(draft, { ...draft, taxonomyCode }).value !== undefined
    expect(ticketDecisionInputSchema.safeParse({ action: 'edit', taxonomyCode }).success).toBe(mine)
  })

  it('a value built by validateEdit always passes the contract', () => {
    const value = validateEdit(draft, {
      probableCause: 'new',
      suggestedAction: 'new',
      taxonomyCode: 'PWR.OVERCURRENT',
      requiresSiteVisit: false,
    }).value
    expect(ticketDecisionInputSchema.safeParse(value).success).toBe(true)
  })
})
