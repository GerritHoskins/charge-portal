import { describe, expect, it } from 'vitest'
import { parseTelemetrySample, telemetrySampleSchema } from '../../../src/telemetry/sample'

const valid = {
  stationId: 'st-001',
  at: '2026-10-25T10:00:00Z',
  status: 'Available',
  temperatureC: 31.5,
  powerKw: 0,
}

describe('telemetry sample schema', () => {
  it('accepts a healthy sample', () => {
    expect(telemetrySampleSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts a sample with a canonical fault class', () => {
    const faultClass = { taxonomyCode: 'CON.LOCK_FAILURE', component: 'connector', severity: 'major', requiresSiteVisit: true }
    expect(telemetrySampleSchema.safeParse({ ...valid, status: 'Faulted', faultClass }).success).toBe(true)
  })

  it('accepts timestamps with an offset', () => {
    expect(telemetrySampleSchema.safeParse({ ...valid, at: '2026-10-25T12:00:00+02:00' }).success).toBe(true)
  })

  it('rejects a missing station id', () => {
    expect(telemetrySampleSchema.safeParse({ ...valid, stationId: '' }).success).toBe(false)
  })

  it('rejects an unknown OCPP status', () => {
    expect(telemetrySampleSchema.safeParse({ ...valid, status: 'on_fire' }).success).toBe(false)
  })

  it('rejects a timestamp that is not ISO 8601', () => {
    expect(telemetrySampleSchema.safeParse({ ...valid, at: 'yesterday' }).success).toBe(false)
  })

  it('rejects a temperature outside the physical range', () => {
    expect(telemetrySampleSchema.safeParse({ ...valid, temperatureC: 400 }).success).toBe(false)
    expect(telemetrySampleSchema.safeParse({ ...valid, temperatureC: -90 }).success).toBe(false)
    expect(telemetrySampleSchema.safeParse({ ...valid, temperatureC: '31' }).success).toBe(false)
  })

  it('rejects negative power', () => {
    expect(telemetrySampleSchema.safeParse({ ...valid, powerKw: -1 }).success).toBe(false)
  })

  it('rejects an invalid fault class (taxonomy schema is reused)', () => {
    const faultClass = { taxonomyCode: 'lock', component: 'connector', severity: 'major', requiresSiteVisit: true }
    expect(telemetrySampleSchema.safeParse({ ...valid, faultClass }).success).toBe(false)
  })

  it('rejects a non-object', () => {
    expect(telemetrySampleSchema.safeParse(null).success).toBe(false)
    expect(telemetrySampleSchema.safeParse('st-001').success).toBe(false)
  })
})

describe('parseTelemetrySample', () => {
  it('returns the typed sample', () => {
    expect(parseTelemetrySample(valid)).toEqual(valid)
  })

  it('throws a message naming the invalid fields but not their values', () => {
    expect(() => parseTelemetrySample({ ...valid, temperatureC: 'secret-ish-value' })).toThrow(/temperatureC/)
    try {
      parseTelemetrySample({ ...valid, temperatureC: 'secret-ish-value' })
    } catch (error) {
      expect((error as Error).message).not.toContain('secret-ish-value')
    }
  })
})
