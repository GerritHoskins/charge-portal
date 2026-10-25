import { describe, expect, it } from 'vitest'
import {
  auditEntrySchema,
  mutationTicketDataSchema,
  ticketDecisionInputSchema,
  ticketDetailResponseSchema,
  ticketDetailSchema,
  ticketListResponseSchema,
  ticketQueryDataSchema,
  ticketStateSchema,
  ticketSummarySchema,
  ticketsQueryDataSchema,
  triageValidationErrorSchema,
} from '#shared/contracts/triage'

const faultClass = { taxonomyCode: 'PWR.OVERCURRENT', component: 'power-electronics', severity: 'major', requiresSiteVisit: true }

const summary = {
  id: '3f0c2a8e-6a55-4a5e-9a3c-0d1f6f1d2b10',
  faultId: '9b1d7c0a-1d2e-4c7b-8f3a-5e6d7c8b9a01',
  stationId: 'st-003',
  state: 'draft',
  taxonomyCode: 'PWR.OVERCURRENT',
  probableCause: 'Overcurrent on the power stage.',
  suggestedAction: 'Inspect the contactor.',
  requiresSiteVisit: true,
  confidence: 0.9,
  provider: 'rules',
  rejectReason: null,
  createdAt: '2026-10-25T10:00:00.000Z',
  decidedAt: null,
  decidedBy: null,
  fault: faultClass,
}

const faultDetail = {
  ...faultClass,
  id: summary.faultId,
  stationId: 'st-003',
  connectorId: 1,
  ocppErrorCode: 'OverCurrentFailure',
  vendorId: 'voltreon',
  vendorErrorCode: 'E-117',
  source: 'vendor-table',
  occurredAt: '2026-10-25T09:59:58.000Z',
  receivedAt: '2026-10-25T10:00:00.000Z',
}

const auditCreated = {
  id: '6a1f0c52-3d77-4f0e-bb2e-2f9d8a0c1e11',
  ticketId: summary.id,
  action: 'draft-created',
  actor: 'agent:rules',
  before: null,
  after: { state: 'draft', taxonomyCode: 'PWR.OVERCURRENT' },
  at: '2026-10-25T10:00:00.000Z',
}

const detail = { ...summary, fault: faultDetail, audit: [auditCreated] }

describe('triage contract: ticket state', () => {
  it.each(['draft', 'approved', 'edited', 'rejected'])('accepts %s', (state) => {
    expect(ticketStateSchema.safeParse(state).success).toBe(true)
  })

  it('rejects an unknown state', () => {
    expect(ticketStateSchema.safeParse('archived').success).toBe(false)
  })
})

describe('triage contract: ticket summary and list', () => {
  it('accepts a well-formed summary and list envelope', () => {
    expect(ticketSummarySchema.safeParse(summary).success).toBe(true)
    expect(ticketListResponseSchema.safeParse({ data: [summary] }).success).toBe(true)
  })

  it('accepts a decided ticket', () => {
    const decided = { ...summary, state: 'rejected', rejectReason: 'Duplicate', decidedAt: '2026-10-25T11:00:00.000Z', decidedBy: 'Demo Operator' }
    expect(ticketSummarySchema.safeParse(decided).success).toBe(true)
  })

  it('rejects an unknown state (service drift)', () => {
    expect(ticketSummarySchema.safeParse({ ...summary, state: 'archived' }).success).toBe(false)
  })

  it('rejects confidence above 1', () => {
    expect(ticketSummarySchema.safeParse({ ...summary, confidence: 1.2 }).success).toBe(false)
  })

  it('rejects negative confidence', () => {
    expect(ticketSummarySchema.safeParse({ ...summary, confidence: -0.1 }).success).toBe(false)
  })

  it('rejects an unknown component or severity', () => {
    expect(ticketSummarySchema.safeParse({ ...summary, fault: { ...faultClass, component: 'toaster' } }).success).toBe(false)
    expect(ticketSummarySchema.safeParse({ ...summary, fault: { ...faultClass, severity: 'apocalyptic' } }).success).toBe(false)
  })

  it('rejects a malformed taxonomy code', () => {
    expect(ticketSummarySchema.safeParse({ ...summary, taxonomyCode: 'overcurrent' }).success).toBe(false)
  })

  it('accepts UNCLASSIFIED', () => {
    expect(ticketSummarySchema.safeParse({ ...summary, taxonomyCode: 'UNCLASSIFIED' }).success).toBe(true)
  })

  it('rejects a timestamp that is not ISO 8601', () => {
    expect(ticketSummarySchema.safeParse({ ...summary, createdAt: 'yesterday' }).success).toBe(false)
  })

  it('rejects a list without the data envelope', () => {
    expect(ticketListResponseSchema.safeParse([summary]).success).toBe(false)
  })
})

describe('triage contract: ticket detail', () => {
  it('accepts a well-formed detail', () => {
    expect(ticketDetailSchema.safeParse(detail).success).toBe(true)
    expect(ticketDetailResponseSchema.safeParse({ data: detail }).success).toBe(true)
  })

  it('rejects a detail without the audit array', () => {
    const { audit: _audit, ...withoutAudit } = detail
    expect(ticketDetailSchema.safeParse(withoutAudit).success).toBe(false)
  })

  it('rejects a detail whose fault lacks the raw codes', () => {
    const { ocppErrorCode: _code, ...withoutCode } = faultDetail
    expect(ticketDetailSchema.safeParse({ ...detail, fault: withoutCode }).success).toBe(false)
  })

  it('rejects an unknown OCPP error code or fault source', () => {
    expect(ticketDetailSchema.safeParse({ ...detail, fault: { ...faultDetail, ocppErrorCode: 'Kaboom' } }).success).toBe(false)
    expect(ticketDetailSchema.safeParse({ ...detail, fault: { ...faultDetail, source: 'guess' } }).success).toBe(false)
  })

  it('accepts a fault without vendor codes', () => {
    const plain = { ...faultDetail, vendorId: null, vendorErrorCode: null, source: 'ocpp-default' }
    expect(ticketDetailSchema.safeParse({ ...detail, fault: plain }).success).toBe(true)
  })

  it('does not pass the raw OCPP payload on to the browser', () => {
    const parsed = ticketDetailSchema.parse({ ...detail, fault: { ...faultDetail, raw: { secret: 1 } } })
    expect(parsed.fault).not.toHaveProperty('raw')
  })
})

describe('triage contract: audit entry', () => {
  it('accepts an entry without before (draft-created)', () => {
    expect(auditEntrySchema.safeParse(auditCreated).success).toBe(true)
  })

  it('accepts changedFields inside after for an edit', () => {
    const edited = {
      ...auditCreated,
      action: 'edited',
      actor: 'Demo Operator',
      before: { probableCause: 'a' },
      after: { probableCause: 'b', changedFields: ['probableCause'] },
    }
    expect(auditEntrySchema.safeParse(edited).success).toBe(true)
  })

  it('rejects a changedFields entry that is not an editable field', () => {
    const edited = { ...auditCreated, action: 'edited', after: { changedFields: ['confidence'] } }
    expect(auditEntrySchema.safeParse(edited).success).toBe(false)
  })

  it('rejects an unknown action', () => {
    expect(auditEntrySchema.safeParse({ ...auditCreated, action: 'deleted' }).success).toBe(false)
  })

  it('rejects an entry without after', () => {
    const { after: _after, ...withoutAfter } = auditCreated
    expect(auditEntrySchema.safeParse(withoutAfter).success).toBe(false)
  })

  it('rejects a blank actor', () => {
    expect(auditEntrySchema.safeParse({ ...auditCreated, actor: '' }).success).toBe(false)
  })
})

describe('triage contract: GraphQL result shapes', () => {
  it('accepts the tickets query data', () => {
    expect(ticketsQueryDataSchema.safeParse({ tickets: [summary] }).success).toBe(true)
    expect(ticketsQueryDataSchema.safeParse({ tickets: 'none' }).success).toBe(false)
  })

  it('accepts a ticket or null', () => {
    expect(ticketQueryDataSchema.safeParse({ ticket: detail }).success).toBe(true)
    expect(ticketQueryDataSchema.safeParse({ ticket: null }).success).toBe(true)
    expect(ticketQueryDataSchema.safeParse({ ticket: { ...detail, audit: undefined } }).success).toBe(false)
  })

  it.each(['approveTicket', 'editTicket', 'rejectTicket'] as const)('accepts the %s mutation data', (name) => {
    expect(mutationTicketDataSchema(name).safeParse({ [name]: detail }).success).toBe(true)
    expect(mutationTicketDataSchema(name).safeParse({ [name]: null }).success).toBe(false)
    expect(mutationTicketDataSchema(name).safeParse({ other: detail }).success).toBe(false)
  })
})

describe('triage contract: decision input', () => {
  it('accepts approve', () => {
    expect(ticketDecisionInputSchema.safeParse({ action: 'approve' }).success).toBe(true)
  })

  it('accepts an edit with one or more fields', () => {
    expect(ticketDecisionInputSchema.safeParse({ action: 'edit', probableCause: 'Loose terminal.' }).success).toBe(true)
    expect(
      ticketDecisionInputSchema.safeParse({
        action: 'edit',
        probableCause: 'Loose terminal.',
        suggestedAction: 'Re-torque.',
        taxonomyCode: 'PWR.OVERCURRENT',
        requiresSiteVisit: false,
      }).success,
    ).toBe(true)
  })

  it('accepts an edit that only changes requiresSiteVisit to false', () => {
    expect(ticketDecisionInputSchema.safeParse({ action: 'edit', requiresSiteVisit: false }).success).toBe(true)
  })

  it('accepts a reject with a reason of 3 to 500 characters', () => {
    expect(ticketDecisionInputSchema.safeParse({ action: 'reject', reason: 'Duplicate' }).success).toBe(true)
    expect(ticketDecisionInputSchema.safeParse({ action: 'reject', reason: 'x'.repeat(500) }).success).toBe(true)
  })

  it('rejects an edit with no fields', () => {
    expect(ticketDecisionInputSchema.safeParse({ action: 'edit' }).success).toBe(false)
  })

  it('rejects an edit with only blank text', () => {
    expect(ticketDecisionInputSchema.safeParse({ action: 'edit', probableCause: '   ' }).success).toBe(false)
  })

  it('rejects an edit with an unknown taxonomy code', () => {
    expect(ticketDecisionInputSchema.safeParse({ action: 'edit', taxonomyCode: 'XXX.NOPE' }).success).toBe(false)
  })

  it('rejects an edit with over-long text', () => {
    expect(ticketDecisionInputSchema.safeParse({ action: 'edit', suggestedAction: 'x'.repeat(2001) }).success).toBe(false)
  })

  it('rejects a reject without a reason', () => {
    expect(ticketDecisionInputSchema.safeParse({ action: 'reject' }).success).toBe(false)
  })

  it('rejects a reason that is too short (after trimming) or too long', () => {
    expect(ticketDecisionInputSchema.safeParse({ action: 'reject', reason: '  ab  ' }).success).toBe(false)
    expect(ticketDecisionInputSchema.safeParse({ action: 'reject', reason: 'x'.repeat(501) }).success).toBe(false)
  })

  it('rejects an unknown action', () => {
    expect(ticketDecisionInputSchema.safeParse({ action: 'escalate' }).success).toBe(false)
    expect(ticketDecisionInputSchema.safeParse({}).success).toBe(false)
  })

  it('rejects unknown keys, in particular an actor', () => {
    expect(ticketDecisionInputSchema.safeParse({ action: 'approve', actor: 'someone-else' }).success).toBe(false)
    expect(ticketDecisionInputSchema.safeParse({ action: 'reject', reason: 'Duplicate', actor: 'x' }).success).toBe(false)
  })

  it('trims text', () => {
    const parsed = ticketDecisionInputSchema.parse({ action: 'reject', reason: '  Duplicate  ' })
    expect(parsed).toEqual({ action: 'reject', reason: 'Duplicate' })
  })
})

describe('triage contract: validation error body', () => {
  it('accepts issues with dotted string paths', () => {
    const body = { error: 'validation', issues: [{ path: 'reason', message: 'Too short', code: 'too_small' }] }
    expect(triageValidationErrorSchema.safeParse(body).success).toBe(true)
  })

  it('rejects a body without issues', () => {
    expect(triageValidationErrorSchema.safeParse({ error: 'validation' }).success).toBe(false)
  })
})
