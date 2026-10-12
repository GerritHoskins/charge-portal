import { beforeEach, describe, expect, it } from 'vitest'
// @ts-expect-error plain .mjs stand-in, no types
import { invoices, resetInvoices } from '../../legacy/data.mjs'
// @ts-expect-error plain .mjs stand-in, no types
import { createDispute, validateDispute } from '../../legacy/invoices.mjs'

const ok = { reason: 'duplicate', message: 'Die Rechnung kam doppelt an.' }

describe('legacy dispute rules (the authority)', () => {
  beforeEach(() => resetInvoices())

  it('records a dispute and marks the invoice as disputed', () => {
    const res = createDispute('inv-0042', ok)
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ invoiceId: 'inv-0042', status: 'received' })
    expect(invoices.find((i: { id: string }) => i.id === 'inv-0042').status).toBe('disputed')
  })

  it('refuses a second dispute for the same invoice', () => {
    createDispute('inv-0042', ok)
    expect(createDispute('inv-0042', ok).status).toBe(409)
  })

  it('refuses to dispute a paid invoice', () => {
    expect(createDispute('inv-0041', ok).status).toBe(409)
  })

  it('404s an unknown invoice', () => {
    expect(createDispute('nope', ok).status).toBe(404)
  })

  it('returns per-field messages and does not change state on invalid input', () => {
    const res = createDispute('inv-0042', { reason: 'x', message: 'kurz' })
    expect(res.status).toBe(422)
    expect(Object.keys(res.body.fields).sort()).toEqual(['message', 'reason'])
    expect(invoices.find((i: { id: string }) => i.id === 'inv-0042').status).toBe('open')
  })

  it('does not trust non-string messages', () => {
    expect(validateDispute({ reason: 'other', message: 12345678901 }).fields.message).toBeTruthy()
  })
})
