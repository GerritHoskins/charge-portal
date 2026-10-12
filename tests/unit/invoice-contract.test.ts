import { describe, expect, it } from 'vitest'
import { disputeInputSchema, invoiceListResponseSchema } from '#shared/contracts/invoice'

const valid = { id: 'inv-1', number: 'RE-1', issuedAt: '2026-10-01T00:00:00Z', amountCents: 4210, currency: 'EUR', status: 'open' }

describe('invoice contract', () => {
  it('accepts a well-formed legacy response', () => {
    expect(invoiceListResponseSchema.safeParse({ data: [valid] }).success).toBe(true)
  })

  it('rejects float cents (legacy money-format drift)', () => {
    expect(invoiceListResponseSchema.safeParse({ data: [{ ...valid, amountCents: 42.1 }] }).success).toBe(false)
  })

  it('rejects an amount sent as a formatted string', () => {
    expect(invoiceListResponseSchema.safeParse({ data: [{ ...valid, amountCents: '42,10' }] }).success).toBe(false)
  })

  it('rejects another currency and unknown statuses', () => {
    expect(invoiceListResponseSchema.safeParse({ data: [{ ...valid, currency: 'USD' }] }).success).toBe(false)
    expect(invoiceListResponseSchema.safeParse({ data: [{ ...valid, status: 'void' }] }).success).toBe(false)
  })
})

describe('dispute input', () => {
  const ok = { reason: 'wrong-amount', message: 'Der Betrag stimmt nicht.' }

  it('accepts a valid dispute and trims the message', () => {
    expect(disputeInputSchema.parse({ ...ok, message: '  Der Betrag stimmt nicht.  ' }).message).toBe('Der Betrag stimmt nicht.')
  })

  it('treats a whitespace-only message as too short', () => {
    const r = disputeInputSchema.safeParse({ ...ok, message: '            ' })
    expect(r.success).toBe(false)
  })

  it('rejects an unknown reason and an over-long message', () => {
    expect(disputeInputSchema.safeParse({ ...ok, reason: 'bored' }).success).toBe(false)
    expect(disputeInputSchema.safeParse({ ...ok, message: 'x'.repeat(501) }).success).toBe(false)
  })

  it('gives a German, actionable message', () => {
    const r = disputeInputSchema.safeParse({ ...ok, message: 'kurz' })
    expect(r.success ? '' : r.error.issues[0]?.message).toContain('mindestens 10 Zeichen')
  })
})
