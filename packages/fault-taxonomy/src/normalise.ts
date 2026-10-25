import { ocppStatusNotificationSchema, type OcppErrorCode, type OcppStatusNotification } from './ocpp'
import { TAXONOMY, UNCLASSIFIED_FAULT, type FaultClass, type KnownTaxonomyCode } from './taxonomy'
import { findVendorTable } from './vendors'

export type NormalisationSource = 'vendor-table' | 'ocpp-default' | 'unclassified'

export interface NormalisedFault {
  /** The canonical class, or `null` when the station reports no fault (`NoError`). */
  readonly fault: Readonly<FaultClass> | null
  readonly source: NormalisationSource
  /** The validated notification, kept next to the class so the raw codes are never lost. */
  readonly raw: OcppStatusNotification
}

/**
 * Default class per standard OCPP errorCode. `NoError` (no fault), `OtherError` and `InternalError`
 * (too coarse to classify) deliberately have no entry.
 */
export const OCPP_DEFAULTS: Readonly<Partial<Record<OcppErrorCode, KnownTaxonomyCode>>> = Object.freeze({
  ConnectorLockFailure: 'CON.LOCK_FAILURE',
  EVCommunicationError: 'COM.EV_HANDSHAKE',
  GroundFailure: 'GRD.GROUND_FAULT',
  HighTemperature: 'THM.OVER_TEMPERATURE',
  // A conflict between the local and the central authorisation list is a backend synchronisation problem.
  LocalListConflict: 'COM.BACKEND_LINK',
  OverCurrentFailure: 'PWR.OVERCURRENT',
  OverVoltage: 'PWR.OVERVOLTAGE',
  PowerMeterFailure: 'MTR.METER_FAILURE',
  PowerSwitchFailure: 'PWR.MODULE_FAILURE',
  ReaderFailure: 'RFD.READER_FAILURE',
  ResetFailure: 'FWR.RESET_FAILURE',
  UnderVoltage: 'PWR.UNDERVOLTAGE',
  WeakSignal: 'COM.WEAK_SIGNAL',
})

/**
 * Maps one raw OCPP 1.6 StatusNotification to the canonical taxonomy (ADR 0008, decision 3).
 * Precedence: vendor table, then OCPP default, then UNCLASSIFIED. Throws a ZodError when `raw`
 * is not a valid notification.
 */
export function normalise(raw: unknown): NormalisedFault {
  const notification = ocppStatusNotificationSchema.parse(raw)

  const table = findVendorTable(notification.vendorId)
  if (table && notification.vendorErrorCode !== undefined) {
    const taxonomyCode = table.codes[table.canonicalise(notification.vendorErrorCode)]
    if (taxonomyCode !== undefined) {
      return { fault: TAXONOMY[taxonomyCode as KnownTaxonomyCode], source: 'vendor-table', raw: notification }
    }
  }

  if (notification.errorCode === 'NoError') return { fault: null, source: 'ocpp-default', raw: notification }

  const defaultCode = OCPP_DEFAULTS[notification.errorCode]
  if (defaultCode !== undefined) return { fault: TAXONOMY[defaultCode], source: 'ocpp-default', raw: notification }

  return { fault: UNCLASSIFIED_FAULT, source: 'unclassified', raw: notification }
}
