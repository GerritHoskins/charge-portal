import { Init1792918800000 } from './1792918800000-Init'
import { CreateFaultTriageTables1792922400000 } from './1792922400000-CreateFaultTriageTables'

/**
 * Explicit list (no glob): the production build is a bundle, so migrations cannot be discovered from disk.
 * Add every new migration here, in order.
 */
export const migrations = [Init1792918800000, CreateFaultTriageTables1792922400000]
