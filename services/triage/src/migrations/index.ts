import { Init1792918800000 } from './1792918800000-Init'
import { CreateStationTelemetry1793005200000 } from './1793005200000-CreateStationTelemetry'

/**
 * Explicit list (no glob): the production build is a bundle, so migrations cannot be discovered from disk.
 * Add every new migration here, in order.
 */
export const migrations = [Init1792918800000, CreateStationTelemetry1793005200000]
