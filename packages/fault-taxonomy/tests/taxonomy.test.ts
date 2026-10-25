import { describe, expect, it } from 'vitest'
import {
  TAXONOMY,
  UNCLASSIFIED_FAULT,
  componentSchema,
  faultClassSchema,
  severitySchema,
  taxonomyCodeSchema,
} from '../src/taxonomy'

describe('taxonomyCodeSchema', () => {
  it.each(['CON.LOCK_FAILURE', 'PWR.OVERCURRENT', 'UNCLASSIFIED'])('accepts %s', (code) => {
    expect(taxonomyCodeSchema.safeParse(code).success).toBe(true)
  })

  it.each(['con.lock_failure', 'CONN.LOCK', 'CON.', 'CON.LOCK-FAILURE', 'CON', 'unclassified', ''])('rejects %j', (code) => {
    expect(taxonomyCodeSchema.safeParse(code).success).toBe(false)
  })
})

describe('enums', () => {
  it('lists the ADR 0008 components plus unknown for UNCLASSIFIED', () => {
    expect(componentSchema.options).toEqual([
      'connector', 'power-electronics', 'metering', 'communication', 'rfid-reader', 'firmware', 'thermal', 'grid-supply', 'unknown',
    ])
  })

  it('lists the severities from low to high', () => {
    expect(severitySchema.options).toEqual(['info', 'minor', 'major', 'critical'])
  })
})

describe('faultClassSchema', () => {
  const valid = { taxonomyCode: 'CON.LOCK_FAILURE', component: 'connector', severity: 'major', requiresSiteVisit: true }

  it('accepts a well-formed class', () => {
    expect(faultClassSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects a malformed code, unknown component, unknown severity and missing flag', () => {
    expect(faultClassSchema.safeParse({ ...valid, taxonomyCode: 'lock' }).success).toBe(false)
    expect(faultClassSchema.safeParse({ ...valid, component: 'cable' }).success).toBe(false)
    expect(faultClassSchema.safeParse({ ...valid, severity: 'fatal' }).success).toBe(false)
    expect(faultClassSchema.safeParse({ ...valid, requiresSiteVisit: undefined }).success).toBe(false)
  })
})

describe('TAXONOMY', () => {
  const entries = Object.entries(TAXONOMY)

  it('has between 15 and 20 classes including UNCLASSIFIED', () => {
    expect(entries.length).toBeGreaterThanOrEqual(15)
    expect(entries.length).toBeLessThanOrEqual(20)
    expect(TAXONOMY.UNCLASSIFIED).toBeDefined()
  })

  it('contains the classes named in ADR 0008', () => {
    for (const code of [
      'CON.LOCK_FAILURE', 'CON.CABLE_DAMAGE', 'PWR.OVERCURRENT', 'PWR.MODULE_FAILURE', 'PWR.OVERVOLTAGE', 'PWR.UNDERVOLTAGE',
      'GRD.GROUND_FAULT', 'MTR.METER_FAILURE', 'COM.EV_HANDSHAKE', 'COM.BACKEND_LINK', 'COM.WEAK_SIGNAL', 'RFD.READER_FAILURE',
      'FWR.RESET_FAILURE', 'FWR.CRASH', 'THM.OVER_TEMPERATURE', 'THM.FAN_FAILURE', 'UNCLASSIFIED',
    ]) {
      expect(TAXONOMY, code).toHaveProperty(code)
    }
  })

  it.each(entries)('%s is a valid class keyed by its own code', (code, fault) => {
    expect(faultClassSchema.safeParse(fault).success).toBe(true)
    expect(fault.taxonomyCode).toBe(code)
  })

  it('is deeply frozen', () => {
    expect(Object.isFrozen(TAXONOMY)).toBe(true)
    for (const [, fault] of entries) expect(Object.isFrozen(fault)).toBe(true)
  })

  it('UNCLASSIFIED is major and requires a site visit (ADR 0008, decision 4)', () => {
    expect(UNCLASSIFIED_FAULT).toBe(TAXONOMY.UNCLASSIFIED)
    expect(UNCLASSIFIED_FAULT.severity).toBe('major')
    expect(UNCLASSIFIED_FAULT.requiresSiteVisit).toBe(true)
  })
})
