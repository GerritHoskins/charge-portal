import { describe, expect, it } from 'vitest'
import { ocppErrorCodeSchema, ocppStatusNotificationSchema, ocppStatusSchema } from '../src/ocpp'

const valid = {
  stationId: 'st-003',
  connectorId: 1,
  errorCode: 'ConnectorLockFailure',
  status: 'Faulted',
  timestamp: '2026-10-25T08:15:30Z',
  info: 'lock jammed',
  vendorId: 'voltreon',
  vendorErrorCode: '1012',
}

describe('ocpp enums', () => {
  it('has the 16 OCPP 1.6 error codes', () => {
    expect(ocppErrorCodeSchema.options).toHaveLength(16)
    expect(ocppErrorCodeSchema.options).toContain('NoError')
    expect(ocppErrorCodeSchema.options).toContain('OtherError')
  })

  it('has the 9 OCPP 1.6 connector statuses', () => {
    expect(ocppStatusSchema.options).toEqual([
      'Available', 'Preparing', 'Charging', 'SuspendedEVSE', 'SuspendedEV', 'Finishing', 'Reserved', 'Unavailable', 'Faulted',
    ])
  })
})

describe('ocppStatusNotificationSchema', () => {
  it('accepts a full notification', () => {
    expect(ocppStatusNotificationSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts a minimal notification without the optional fields', () => {
    const { info: _i, vendorId: _v, vendorErrorCode: _c, ...minimal } = valid
    expect(ocppStatusNotificationSchema.safeParse(minimal).success).toBe(true)
  })

  it('accepts connector 0 (the charge point itself) and a timestamp with offset', () => {
    expect(ocppStatusNotificationSchema.safeParse({ ...valid, connectorId: 0 }).success).toBe(true)
    expect(ocppStatusNotificationSchema.safeParse({ ...valid, timestamp: '2026-10-25T10:15:30+02:00' }).success).toBe(true)
  })

  it('accepts a vendorErrorCode of exactly 50 characters', () => {
    expect(ocppStatusNotificationSchema.safeParse({ ...valid, vendorErrorCode: 'x'.repeat(50) }).success).toBe(true)
  })

  it('rejects an unknown errorCode', () => {
    expect(ocppStatusNotificationSchema.safeParse({ ...valid, errorCode: 'ThermalRunaway' }).success).toBe(false)
  })

  it('rejects an unknown status', () => {
    expect(ocppStatusNotificationSchema.safeParse({ ...valid, status: 'Exploded' }).success).toBe(false)
  })

  it('rejects a vendorErrorCode longer than 50 characters', () => {
    expect(ocppStatusNotificationSchema.safeParse({ ...valid, vendorErrorCode: 'x'.repeat(51) }).success).toBe(false)
  })

  it('rejects info longer than 50 characters', () => {
    expect(ocppStatusNotificationSchema.safeParse({ ...valid, info: 'x'.repeat(51) }).success).toBe(false)
  })

  it('rejects a vendorId longer than 255 characters', () => {
    expect(ocppStatusNotificationSchema.safeParse({ ...valid, vendorId: 'x'.repeat(256) }).success).toBe(false)
  })

  it('rejects a missing timestamp', () => {
    const { timestamp: _t, ...withoutTimestamp } = valid
    expect(ocppStatusNotificationSchema.safeParse(withoutTimestamp).success).toBe(false)
  })

  it('rejects a timestamp that is not an ISO date-time', () => {
    expect(ocppStatusNotificationSchema.safeParse({ ...valid, timestamp: 'yesterday' }).success).toBe(false)
  })

  it('rejects a negative connectorId', () => {
    expect(ocppStatusNotificationSchema.safeParse({ ...valid, connectorId: -1 }).success).toBe(false)
  })

  it('rejects a fractional connectorId', () => {
    expect(ocppStatusNotificationSchema.safeParse({ ...valid, connectorId: 1.5 }).success).toBe(false)
  })

  it('rejects a missing stationId', () => {
    const { stationId: _s, ...withoutStation } = valid
    expect(ocppStatusNotificationSchema.safeParse(withoutStation).success).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(ocppStatusNotificationSchema.safeParse(null).success).toBe(false)
    expect(ocppStatusNotificationSchema.safeParse('ConnectorLockFailure').success).toBe(false)
  })
})
