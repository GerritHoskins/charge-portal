import { z } from 'zod'
import { DISPUTE_MESSAGES, DISPUTE_MESSAGE_MAX, DISPUTE_MESSAGE_MIN, DISPUTE_REASONS } from './dispute-rules'

export { DISPUTE_MESSAGE_MAX, DISPUTE_MESSAGE_MIN }

export const invoiceStatusSchema = z.enum(['open', 'paid', 'disputed'])

export const invoiceSchema = z.object({
  id: z.string(),
  number: z.string(),
  issuedAt: z.iso.datetime(),
  amountCents: z.number().int().nonnegative(),
  currency: z.literal('EUR'),
  status: invoiceStatusSchema,
})

export const invoiceListResponseSchema = z.object({ data: z.array(invoiceSchema) })

export const disputeReasonSchema = z.enum(DISPUTE_REASONS, { error: DISPUTE_MESSAGES.reason })

// Input rules live in one place and run in the browser (instant feedback), the
// BFF and the legacy backend (which stays the authority).
export const disputeInputSchema = z.object({
  reason: disputeReasonSchema,
  message: z
    .string()
    .trim()
    .min(DISPUTE_MESSAGE_MIN, DISPUTE_MESSAGES.tooShort)
    .max(DISPUTE_MESSAGE_MAX, DISPUTE_MESSAGES.tooLong),
})

export const disputeResponseSchema = z.object({
  data: z.object({ id: z.string(), invoiceId: z.string(), status: z.literal('received') }),
})

// 422 body from legacy: field name -> message.
export const validationErrorSchema = z.object({
  error: z.literal('validation'),
  fields: z.record(z.string(), z.string()),
})

export type Invoice = z.infer<typeof invoiceSchema>
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>
export type { DisputeReason } from './dispute-rules'
export type DisputeInput = z.infer<typeof disputeInputSchema>
export type DisputeResponse = z.infer<typeof disputeResponseSchema>
