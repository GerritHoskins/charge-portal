// Invoice rules of the legacy backend. It is the authority: the BFF and the
// browser validate too, but only for faster feedback.
import { disputes, invoices } from './data.mjs'

export const REASONS = ['wrong-amount', 'not-my-session', 'duplicate', 'other']

export const validateDispute = (input) => {
  const fields = {}
  if (!REASONS.includes(input?.reason)) fields.reason = 'Bitte wählen Sie einen Grund.'
  const message = typeof input?.message === 'string' ? input.message.trim() : ''
  if (message.length < 10) fields.message = 'Bitte beschreiben Sie das Problem mit mindestens 10 Zeichen.'
  else if (message.length > 500) fields.message = 'Bitte höchstens 500 Zeichen.'
  return { fields, value: { reason: input?.reason, message } }
}

// Returns { status, body } so the HTTP layer stays trivial.
export const createDispute = (invoiceId, input) => {
  const invoice = invoices.find((i) => i.id === invoiceId)
  if (!invoice) return { status: 404, body: { error: 'not_found' } }
  if (invoice.status !== 'open') return { status: 409, body: { error: 'not_disputable' } }
  const { fields, value } = validateDispute(input)
  if (Object.keys(fields).length) return { status: 422, body: { error: 'validation', fields } }
  const dispute = { id: `di-${disputes.length + 1}`, invoiceId, ...value }
  disputes.push(dispute)
  invoice.status = 'disputed'
  return { status: 201, body: { data: { id: dispute.id, invoiceId, status: 'received' } } }
}
