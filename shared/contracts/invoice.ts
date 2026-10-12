import { z } from 'zod'

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

export const disputeReasonSchema = z.enum(['wrong-amount', 'not-my-session', 'duplicate', 'other'])

export const DISPUTE_MESSAGE_MIN = 10
export const DISPUTE_MESSAGE_MAX = 500

// Input rules live in one place and run in the browser (instant feedback), the
// BFF and the legacy backend (which stays the authority).
export const disputeInputSchema = z.object({
  reason: disputeReasonSchema,
  message: z
    .string()
    .trim()
    .min(DISPUTE_MESSAGE_MIN, `Bitte beschreiben Sie das Problem mit mindestens ${DISPUTE_MESSAGE_MIN} Zeichen.`)
    .max(DISPUTE_MESSAGE_MAX, `Bitte höchstens ${DISPUTE_MESSAGE_MAX} Zeichen.`),
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
export type DisputeReason = z.infer<typeof disputeReasonSchema>
export type DisputeInput = z.infer<typeof disputeInputSchema>
export type DisputeResponse = z.infer<typeof disputeResponseSchema>
