import { TAXONOMY } from '@charge-portal/fault-taxonomy'
import { z } from 'zod'
import type { Fault } from '../faults/fault.entity'

/** Injection token for the active DraftProvider (ADR 0010, decision 4). */
export const DRAFT_PROVIDER = Symbol('DRAFT_PROVIDER')

const taxonomyCodes = Object.keys(TAXONOMY) as [string, ...string[]]

/**
 * What every provider must return, rules-based or model-based. A model's output is untrusted input
 * (ADR 0010): it is parsed with this schema, and `taxonomyCode` can only be a class of the taxonomy.
 */
export const ticketDraftInputSchema = z.object({
  taxonomyCode: z.enum(taxonomyCodes),
  probableCause: z.string().trim().min(1).max(2000),
  suggestedAction: z.string().trim().min(1).max(2000),
  requiresSiteVisit: z.boolean(),
  confidence: z.number().min(0).max(1),
  /** Who produced the draft; the audit actor is `agent:<provider>`. */
  provider: z.string().trim().min(1).max(100),
})

export type TicketDraftInput = z.infer<typeof ticketDraftInputSchema>

export interface DraftContext {
  /** Faults on the same station shortly before `fault`, newest first. May include other classes. */
  recentFaults: Fault[]
}

export interface DraftProvider {
  draft(fault: Fault, context: DraftContext): Promise<TicketDraftInput>
}
