import type { OcppStatusNotification } from './ocpp'
import type { TaxonomyCode } from './taxonomy'

// Synthetic sample notifications, one list per fictional vendor. Used by the triage service tests
// and the telemetry simulator. Station ids are the synthetic ones of the legacy seed (st-001..st-005).
export interface FaultFixture {
  /** Unique, human-readable name. */
  readonly label: string
  readonly notification: OcppStatusNotification
  /** What `normalise` must return for this notification. */
  readonly expectedTaxonomyCode: TaxonomyCode
}

type FixtureNotification = Omit<OcppStatusNotification, 'status'>

function fixture(label: string, expectedTaxonomyCode: TaxonomyCode, notification: FixtureNotification): FaultFixture {
  return Object.freeze({ label, expectedTaxonomyCode, notification: Object.freeze({ status: 'Faulted' as const, ...notification }) })
}

const voltreonFixtures = [
  fixture('voltreon: connector lock stuck', 'CON.LOCK_FAILURE', {
    stationId: 'st-003', connectorId: 1, errorCode: 'OtherError', timestamp: '2026-10-25T06:12:03Z', vendorId: 'voltreon', vendorErrorCode: '1012',
  }),
  fixture('voltreon: power module failure', 'PWR.MODULE_FAILURE', {
    stationId: 'st-001', connectorId: 2, errorCode: 'InternalError', timestamp: '2026-10-25T06:40:44Z', vendorId: 'voltreon', vendorErrorCode: '2010',
  }),
  fixture('voltreon: unknown code', 'UNCLASSIFIED', {
    stationId: 'st-002', connectorId: 1, errorCode: 'OtherError', timestamp: '2026-10-25T07:05:10Z', vendorId: 'voltreon', vendorErrorCode: '9876',
  }),
]

const kestrelEvFixtures = [
  fixture('kestrel-ev: connector lock stuck', 'CON.LOCK_FAILURE', {
    stationId: 'st-004', connectorId: 1, errorCode: 'OtherError', timestamp: '2026-10-25T06:15:20Z', vendorId: 'kestrel-ev', vendorErrorCode: 'KST-E-0042',
  }),
  fixture('kestrel-ev: fan failure', 'THM.FAN_FAILURE', {
    stationId: 'st-001', connectorId: 0, errorCode: 'OtherError', timestamp: '2026-10-25T08:00:00Z', vendorId: 'kestrel-ev', vendorErrorCode: 'KST-E-0306', info: 'fan 2 rpm 0',
  }),
  fixture('kestrel-ev: unknown code', 'UNCLASSIFIED', {
    stationId: 'st-005', connectorId: 1, errorCode: 'InternalError', timestamp: '2026-10-25T09:30:12Z', vendorId: 'kestrel-ev', vendorErrorCode: 'KST-E-9999',
  }),
]

const lumenwattFixtures = [
  fixture('lumenwatt: connector lock stuck', 'CON.LOCK_FAILURE', {
    stationId: 'st-002', connectorId: 2, errorCode: 'OtherError', timestamp: '2026-10-25T06:18:45Z', vendorId: 'lumenwatt', vendorErrorCode: 'Lock motor stalled',
  }),
  fixture('lumenwatt: backend link lost (upper case, padded)', 'COM.BACKEND_LINK', {
    stationId: 'st-003', connectorId: 0, errorCode: 'OtherError', timestamp: '2026-10-25T10:02:31Z', vendorId: 'lumenwatt', vendorErrorCode: '  CLOUD LINK LOST ',
  }),
  fixture('lumenwatt: unknown phrase', 'UNCLASSIFIED', {
    stationId: 'st-004', connectorId: 1, errorCode: 'OtherError', timestamp: '2026-10-25T11:11:11Z', vendorId: 'lumenwatt', vendorErrorCode: 'display flickers',
  }),
]

const orbisPowerFixtures = [
  fixture('orbis-power: connector lock stuck', 'CON.LOCK_FAILURE', {
    stationId: 'st-005', connectorId: 2, errorCode: 'ConnectorLockFailure', timestamp: '2026-10-25T06:21:09Z', vendorId: 'orbis-power', vendorErrorCode: '0x1F04',
  }),
  fixture('orbis-power: over-temperature (lower-case hex)', 'THM.OVER_TEMPERATURE', {
    stationId: 'st-002', connectorId: 1, errorCode: 'OtherError', timestamp: '2026-10-25T12:45:00Z', vendorId: 'orbis-power', vendorErrorCode: '0x4c09',
  }),
  fixture('orbis-power: unknown code', 'UNCLASSIFIED', {
    stationId: 'st-001', connectorId: 1, errorCode: 'InternalError', timestamp: '2026-10-25T13:20:41Z', vendorId: 'orbis-power', vendorErrorCode: '0xFFFF',
  }),
]

export const FIXTURES_BY_VENDOR: Readonly<{
  voltreon: readonly FaultFixture[]
  'kestrel-ev': readonly FaultFixture[]
  lumenwatt: readonly FaultFixture[]
  'orbis-power': readonly FaultFixture[]
}> = Object.freeze({
  voltreon: Object.freeze(voltreonFixtures),
  'kestrel-ev': Object.freeze(kestrelEvFixtures),
  lumenwatt: Object.freeze(lumenwattFixtures),
  'orbis-power': Object.freeze(orbisPowerFixtures),
})

export const ALL_FIXTURES: readonly FaultFixture[] = Object.freeze([
  ...voltreonFixtures,
  ...kestrelEvFixtures,
  ...lumenwattFixtures,
  ...orbisPowerFixtures,
])
