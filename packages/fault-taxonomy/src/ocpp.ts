import { z } from 'zod'

// Raw layer (ADR 0008, decision 2): OCPP 1.6 `StatusNotification` with the field names of the
// protocol. Everything a station sends is untrusted until it has passed this schema.
export const ocppErrorCodeSchema = z.enum([
  'ConnectorLockFailure',
  'EVCommunicationError',
  'GroundFailure',
  'HighTemperature',
  'InternalError',
  'LocalListConflict',
  'NoError',
  'OtherError',
  'OverCurrentFailure',
  'OverVoltage',
  'PowerMeterFailure',
  'PowerSwitchFailure',
  'ReaderFailure',
  'ResetFailure',
  'UnderVoltage',
  'WeakSignal',
])

export const ocppStatusSchema = z.enum([
  'Available',
  'Preparing',
  'Charging',
  'SuspendedEVSE',
  'SuspendedEV',
  'Finishing',
  'Reserved',
  'Unavailable',
  'Faulted',
])

export const ocppStatusNotificationSchema = z.object({
  stationId: z.string().min(1),
  // Connector 0 addresses the charge point as a whole.
  connectorId: z.number().int().nonnegative(),
  errorCode: ocppErrorCodeSchema,
  status: ocppStatusSchema,
  timestamp: z.iso.datetime({ offset: true }),
  info: z.string().max(50).optional(),
  vendorId: z.string().max(255).optional(),
  vendorErrorCode: z.string().max(50).optional(),
})

export type OcppErrorCode = z.infer<typeof ocppErrorCodeSchema>
export type OcppStatus = z.infer<typeof ocppStatusSchema>
export type OcppStatusNotification = z.infer<typeof ocppStatusNotificationSchema>
