import type { Ticket } from './ticket.entity'

/**
 * The part of a ticket that audit entries record in `before` and `after`: everything a decision can
 * change. Identity and timestamps are on the entry itself. Reused by every writer of audit entries so
 * the snapshots stay comparable.
 */
export function ticketSnapshot(ticket: Ticket): Record<string, unknown> {
  return {
    state: ticket.state,
    taxonomyCode: ticket.taxonomyCode,
    probableCause: ticket.probableCause,
    suggestedAction: ticket.suggestedAction,
    requiresSiteVisit: ticket.requiresSiteVisit,
    confidence: ticket.confidence,
    provider: ticket.provider,
    rejectReason: ticket.rejectReason,
  }
}
