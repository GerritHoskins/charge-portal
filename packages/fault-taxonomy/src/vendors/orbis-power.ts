import { defineVendorTable } from './table'

// Fictional vendor. Hex codes, e.g. "0x1F04"; matched case-insensitively. The canonical form is
// a lower-case "0x" prefix with upper-case digits.
export const orbisPower = defineVendorTable({
  vendorId: 'orbis-power',
  canonicalise: (code) => {
    const trimmed = code.trim()
    return /^0x/i.test(trimmed) ? `0x${trimmed.slice(2).toUpperCase()}` : trimmed
  },
  codes: {
    '0x1F04': 'CON.LOCK_FAILURE',
    '0x1F05': 'CON.CABLE_DAMAGE',
    '0x2A10': 'PWR.OVERCURRENT',
    '0x2A22': 'PWR.MODULE_FAILURE',
    '0x3B01': 'COM.BACKEND_LINK',
    '0x4C09': 'THM.OVER_TEMPERATURE',
    '0x4C0A': 'THM.FAN_FAILURE',
    '0x5D00': 'MTR.METER_FAILURE',
    '0x6E11': 'FWR.CRASH',
  },
})
