import { describe, expect, it } from 'vitest'
import { stationListResponseSchema } from '#shared/contracts/station'

const valid = { id: 'st-1', name: 'A', city: 'Köln', status: 'available', connectors: 2, maxPowerKw: 22 }

describe('station contract', () => {
  it('accepts a well-formed legacy response', () => {
    expect(stationListResponseSchema.safeParse({ data: [valid] }).success).toBe(true)
  })

  it('rejects an unknown status (legacy drift)', () => {
    const result = stationListResponseSchema.safeParse({ data: [{ ...valid, status: 'on_fire' }] })
    expect(result.success).toBe(false)
  })

  it('rejects a response without the data envelope', () => {
    expect(stationListResponseSchema.safeParse([valid]).success).toBe(false)
  })

  it('rejects non-positive power', () => {
    expect(stationListResponseSchema.safeParse({ data: [{ ...valid, maxPowerKw: 0 }] }).success).toBe(false)
  })
})
