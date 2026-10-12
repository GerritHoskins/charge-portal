// Dispute input rules without any dependency, so the browser bundle does not
// ship zod just to validate one form. The zod schema in invoice.ts is built
// from the same constants and messages, and a unit test checks both agree.
export const DISPUTE_REASONS = ['wrong-amount', 'not-my-session', 'duplicate', 'other'] as const
export type DisputeReason = (typeof DISPUTE_REASONS)[number]

export const DISPUTE_MESSAGE_MIN = 10
export const DISPUTE_MESSAGE_MAX = 500

export const DISPUTE_MESSAGES = {
  reason: 'Bitte wählen Sie einen Grund.',
  tooShort: `Bitte beschreiben Sie das Problem mit mindestens ${DISPUTE_MESSAGE_MIN} Zeichen.`,
  tooLong: `Bitte höchstens ${DISPUTE_MESSAGE_MAX} Zeichen.`,
} as const

export interface DisputeValidation {
  value?: { reason: DisputeReason; message: string }
  fields: Record<string, string>
}

export const validateDispute = (input: { reason: unknown; message: unknown }): DisputeValidation => {
  const fields: Record<string, string> = {}
  const reason = DISPUTE_REASONS.find((r) => r === input.reason)
  if (!reason) fields.reason = DISPUTE_MESSAGES.reason
  const message = typeof input.message === 'string' ? input.message.trim() : ''
  if (message.length < DISPUTE_MESSAGE_MIN) fields.message = DISPUTE_MESSAGES.tooShort
  else if (message.length > DISPUTE_MESSAGE_MAX) fields.message = DISPUTE_MESSAGES.tooLong
  return reason && !fields.message ? { value: { reason, message }, fields } : { fields }
}
