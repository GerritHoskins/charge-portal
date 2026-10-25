import { kestrelEv } from './kestrel-ev'
import { lumenwatt } from './lumenwatt'
import { orbisPower } from './orbis-power'
import type { VendorTable } from './table'
import { voltreon } from './voltreon'

export { vendorTableSchema, defineVendorTable } from './table'
export type { VendorTable } from './table'

export const VENDOR_TABLES: readonly VendorTable[] = Object.freeze([voltreon, kestrelEv, lumenwatt, orbisPower])

const byVendorId = new Map(VENDOR_TABLES.map((table) => [table.vendorId, table]))

/** Finds the table for a `vendorId` (trimmed, case-insensitive). Unknown or missing vendors give undefined. */
export function findVendorTable(vendorId: string | undefined): VendorTable | undefined {
  return vendorId === undefined ? undefined : byVendorId.get(vendorId.trim().toLowerCase())
}
