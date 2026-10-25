import { describe, expect, it } from 'vitest'
import { Ticket, TicketState } from '../../src/tickets/ticket.entity'
import { ticketSnapshot } from '../../src/tickets/ticket-snapshot'

describe('ticketSnapshot', () => {
  it('captures the decision-relevant fields as plain JSON', () => {
    const ticket = Object.assign(new Ticket(), {
      id: 'b0f8c7a2-7c8e-4a4b-9a0e-5f1f7d2f1a11',
      faultId: 'c1e9d8b3-8d9f-4b5c-8b1f-6a2a8e3a2b22',
      stationId: 'st-001',
      state: TicketState.draft,
      taxonomyCode: 'PWR.OVERCURRENT',
      probableCause: 'cause',
      suggestedAction: 'action',
      requiresSiteVisit: true,
      confidence: 0.6,
      provider: 'rules',
      rejectReason: null,
      createdAt: new Date('2026-10-25T12:00:00Z'),
      decidedAt: null,
      decidedBy: null,
    })
    expect(ticketSnapshot(ticket)).toEqual({
      state: 'draft',
      taxonomyCode: 'PWR.OVERCURRENT',
      probableCause: 'cause',
      suggestedAction: 'action',
      requiresSiteVisit: true,
      confidence: 0.6,
      provider: 'rules',
      rejectReason: null,
    })
  })
})
