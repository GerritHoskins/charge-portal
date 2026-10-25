import { TAXONOMY } from '@charge-portal/fault-taxonomy'
import { z } from 'zod'

/** The ticket fields an operator may change, in the order `changedFields` lists them in the audit entry. */
export const EDITABLE_FIELDS = ['probableCause', 'suggestedAction', 'taxonomyCode', 'requiresSiteVisit'] as const
export type EditableField = (typeof EDITABLE_FIELDS)[number]

const taxonomyCodes = Object.keys(TAXONOMY) as [string, ...string[]]

// GraphQL clients may send an explicit null for an optional input field; it means "not provided".
const optional = <T extends z.ZodType>(schema: T) => schema.nullish().transform((value) => value ?? undefined)

/**
 * The input of `editTicket`: any of the editable fields, at least one. Text is trimmed and bounded like
 * a drafted ticket (ticketDraftInputSchema); `taxonomyCode` must be a class of the taxonomy.
 */
export const ticketEditSchema = z
  .strictObject({
    probableCause: optional(z.string().trim().min(1).max(2000)),
    suggestedAction: optional(z.string().trim().min(1).max(2000)),
    taxonomyCode: optional(z.enum(taxonomyCodes)),
    requiresSiteVisit: optional(z.boolean()),
  })
  .transform((input) => {
    const provided: Partial<{
      probableCause: string
      suggestedAction: string
      taxonomyCode: string
      requiresSiteVisit: boolean
    }> = {}
    if (input.probableCause !== undefined) provided.probableCause = input.probableCause
    if (input.suggestedAction !== undefined) provided.suggestedAction = input.suggestedAction
    if (input.taxonomyCode !== undefined) provided.taxonomyCode = input.taxonomyCode
    if (input.requiresSiteVisit !== undefined) provided.requiresSiteVisit = input.requiresSiteVisit
    return provided
  })
  .refine((provided) => Object.keys(provided).length > 0, {
    message: `Provide at least one of: ${EDITABLE_FIELDS.join(', ')}`,
  })

export type TicketEdit = z.output<typeof ticketEditSchema>

/** The reason of `rejectTicket`: trimmed first, then 3 to 500 characters. */
export const rejectReasonSchema = z.string().trim().min(3).max(500)
