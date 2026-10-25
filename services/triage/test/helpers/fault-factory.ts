import { randomUUID } from 'node:crypto'
import { Fault } from '../../src/faults/fault.entity'

/** A persisted-shape Fault with sensible synthetic defaults (PWR.OVERCURRENT from the OCPP default). */
export function makeFault(overrides: Partial<Fault> = {}): Fault {
  return Object.assign(new Fault(), {
    id: randomUUID(),
    stationId: 'st-001',
    connectorId: 1,
    ocppErrorCode: 'OverCurrentFailure',
    vendorId: null,
    vendorErrorCode: null,
    taxonomyCode: 'PWR.OVERCURRENT',
    component: 'power-electronics',
    severity: 'major',
    requiresSiteVisit: true,
    source: 'ocpp-default',
    raw: {},
    occurredAt: new Date('2026-10-25T12:00:00Z'),
    receivedAt: new Date('2026-10-25T12:00:01Z'),
    ...overrides,
  })
}
