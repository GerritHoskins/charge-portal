import { ZodError } from 'zod'
import { describe, expect, it } from 'vitest'
import { OCPP_DEFAULTS, normalise } from '../src/normalise'
import { ocppErrorCodeSchema } from '../src/ocpp'
import { TAXONOMY, UNCLASSIFIED_FAULT } from '../src/taxonomy'
import { VENDOR_TABLES } from '../src/vendors'

const base = {
  stationId: 'st-003',
  connectorId: 1,
  errorCode: 'OtherError',
  status: 'Faulted',
  timestamp: '2026-10-25T08:15:30Z',
}

describe('normalise: input validation', () => {
  it('throws a ZodError on invalid input', () => {
    expect(() => normalise({ ...base, errorCode: 'Nope' })).toThrow(ZodError)
    expect(() => normalise(null)).toThrow(ZodError)
    expect(() => normalise({ ...base, connectorId: -1 })).toThrow(ZodError)
  })
})

describe('normalise: vendor tables', () => {
  it.each(VENDOR_TABLES)('resolves every $vendorId code to its class', (table) => {
    for (const [code, taxonomyCode] of Object.entries(table.codes)) {
      const result = normalise({ ...base, vendorId: table.vendorId, vendorErrorCode: code })
      expect(result.source).toBe('vendor-table')
      expect(result.fault).toEqual(TAXONOMY[taxonomyCode as keyof typeof TAXONOMY])
    }
  })

  it('reaches PWR.OVERCURRENT from four different spellings', () => {
    const spellings = [
      { vendorId: 'voltreon', vendorErrorCode: '2004' },
      { vendorId: 'kestrel-ev', vendorErrorCode: 'KST-E-0107' },
      { vendorId: 'lumenwatt', vendorErrorCode: 'Output current limit exceeded' },
      { vendorId: 'orbis-power', vendorErrorCode: '0x2A10' },
    ]
    for (const s of spellings) {
      expect(normalise({ ...base, ...s }).fault?.taxonomyCode).toBe('PWR.OVERCURRENT')
    }
  })

  it('matches free text after trim and case-folding', () => {
    for (const code of ['lock motor stalled', '  LOCK MOTOR STALLED  ', 'Lock Motor Stalled']) {
      const result = normalise({ ...base, vendorId: 'lumenwatt', vendorErrorCode: code })
      expect(result.fault?.taxonomyCode).toBe('CON.LOCK_FAILURE')
    }
  })

  it('does not fuzzy-match free text', () => {
    const result = normalise({ ...base, vendorId: 'lumenwatt', vendorErrorCode: 'lock motor stalled!' })
    expect(result.source).toBe('unclassified')
  })

  it('matches hex codes case-insensitively', () => {
    for (const code of ['0x1F04', '0x1f04', '0X1F04', ' 0x1f04 ']) {
      const result = normalise({ ...base, vendorId: 'orbis-power', vendorErrorCode: code })
      expect(result.fault?.taxonomyCode).toBe('CON.LOCK_FAILURE')
    }
  })

  it('matches the vendorId case-insensitively', () => {
    const result = normalise({ ...base, vendorId: 'VOLTREON', vendorErrorCode: '1012' })
    expect(result.source).toBe('vendor-table')
  })

  it('does not apply one vendor table to another vendor', () => {
    const result = normalise({ ...base, vendorId: 'voltreon', vendorErrorCode: 'KST-E-0042' })
    expect(result.source).toBe('unclassified')
  })

  it('ignores the vendor code when the vendor is unknown or missing', () => {
    expect(normalise({ ...base, vendorId: 'acme', vendorErrorCode: '1012' }).source).toBe('unclassified')
    expect(normalise({ ...base, vendorErrorCode: '1012' }).source).toBe('unclassified')
  })

  it('keeps the parsed raw notification next to the class', () => {
    const result = normalise({ ...base, vendorId: 'voltreon', vendorErrorCode: '1012' })
    expect(result.raw).toMatchObject({ stationId: 'st-003', vendorId: 'voltreon', vendorErrorCode: '1012', errorCode: 'OtherError' })
  })
})

describe('normalise: OCPP defaults', () => {
  const noDefault = ['NoError', 'OtherError', 'InternalError']

  it('has a default class for every errorCode except NoError, OtherError and InternalError', () => {
    for (const code of ocppErrorCodeSchema.options) {
      if (noDefault.includes(code)) {
        expect(OCPP_DEFAULTS).not.toHaveProperty(code)
      } else {
        expect(TAXONOMY, code).toHaveProperty(OCPP_DEFAULTS[code as keyof typeof OCPP_DEFAULTS] as string)
      }
    }
  })

  it.each([
    ['ConnectorLockFailure', 'CON.LOCK_FAILURE'],
    ['EVCommunicationError', 'COM.EV_HANDSHAKE'],
    ['GroundFailure', 'GRD.GROUND_FAULT'],
    ['HighTemperature', 'THM.OVER_TEMPERATURE'],
    ['LocalListConflict', 'COM.BACKEND_LINK'],
    ['OverCurrentFailure', 'PWR.OVERCURRENT'],
    ['OverVoltage', 'PWR.OVERVOLTAGE'],
    ['PowerMeterFailure', 'MTR.METER_FAILURE'],
    ['PowerSwitchFailure', 'PWR.MODULE_FAILURE'],
    ['ReaderFailure', 'RFD.READER_FAILURE'],
    ['ResetFailure', 'FWR.RESET_FAILURE'],
    ['UnderVoltage', 'PWR.UNDERVOLTAGE'],
    ['WeakSignal', 'COM.WEAK_SIGNAL'],
  ])('maps %s to %s without vendor data', (errorCode, taxonomyCode) => {
    const result = normalise({ ...base, errorCode })
    expect(result.source).toBe('ocpp-default')
    expect(result.fault?.taxonomyCode).toBe(taxonomyCode)
  })

  it('falls back to the OCPP default when the vendor code is unknown', () => {
    const result = normalise({ ...base, errorCode: 'HighTemperature', vendorId: 'voltreon', vendorErrorCode: '9999' })
    expect(result.source).toBe('ocpp-default')
    expect(result.fault?.taxonomyCode).toBe('THM.OVER_TEMPERATURE')
  })
})

describe('normalise: precedence', () => {
  it('prefers the vendor table over the OCPP default', () => {
    const result = normalise({ ...base, errorCode: 'HighTemperature', vendorId: 'voltreon', vendorErrorCode: '4011' })
    expect(result.source).toBe('vendor-table')
    expect(result.fault?.taxonomyCode).toBe('THM.FAN_FAILURE')
  })

  it('prefers the OCPP default over UNCLASSIFIED', () => {
    const result = normalise({ ...base, errorCode: 'ReaderFailure', vendorId: 'lumenwatt', vendorErrorCode: 'never heard of it' })
    expect(result.source).toBe('ocpp-default')
  })
})

describe('normalise: no fault and unclassified', () => {
  it('returns a null fault for NoError', () => {
    const result = normalise({ ...base, errorCode: 'NoError', status: 'Available' })
    expect(result.fault).toBeNull()
    expect(result.source).toBe('ocpp-default')
    expect(result.raw.errorCode).toBe('NoError')
  })

  it.each(['OtherError', 'InternalError'])('returns UNCLASSIFIED for %s without a matching vendor code', (errorCode) => {
    const result = normalise({ ...base, errorCode, vendorId: 'kestrel-ev', vendorErrorCode: 'KST-E-9999' })
    expect(result.source).toBe('unclassified')
    expect(result.fault).toEqual(UNCLASSIFIED_FAULT)
    expect(result.fault).toMatchObject({ taxonomyCode: 'UNCLASSIFIED', severity: 'major', requiresSiteVisit: true })
    expect(result.raw.vendorErrorCode).toBe('KST-E-9999')
  })

  it('returns UNCLASSIFIED for OtherError with no vendor data at all', () => {
    expect(normalise(base).fault?.taxonomyCode).toBe('UNCLASSIFIED')
  })
})
