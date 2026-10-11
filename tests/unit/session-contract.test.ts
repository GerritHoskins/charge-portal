import { describe, expect, it } from 'vitest'
import { sessionListResponseSchema } from '#shared/contracts/session'

const valid = { id: 'se-1', stationId: 'st-1', startedAt: '2026-10-10T07:12:00Z', energyKwh: 18.4, status: 'running' }

describe('session contract', () => {
  it('accepts a well-formed legacy response', () => {
    expect(sessionListResponseSchema.safeParse({ data: [valid] }).success).toBe(true)
  })

  it('rejects a non-ISO timestamp (legacy date-format drift)', () => {
    expect(sessionListResponseSchema.safeParse({ data: [{ ...valid, startedAt: '10.10.2026 07:12' }] }).success).toBe(false)
  })

  it('rejects negative energy', () => {
    expect(sessionListResponseSchema.safeParse({ data: [{ ...valid, energyKwh: -1 }] }).success).toBe(false)
  })

  it('rejects an unknown status', () => {
    expect(sessionListResponseSchema.safeParse({ data: [{ ...valid, status: 'paused' }] }).success).toBe(false)
  })
})
