import { defineVendorTable } from './table'

// Fictional vendor. Numeric codes sent as strings, e.g. "1012"; the thousands digit is the area.
export const voltreon = defineVendorTable({
  vendorId: 'voltreon',
  canonicalise: (code) => code.trim(),
  codes: {
    '1012': 'CON.LOCK_FAILURE',
    '1013': 'CON.CABLE_DAMAGE',
    '2004': 'PWR.OVERCURRENT',
    '2010': 'PWR.MODULE_FAILURE',
    '3001': 'COM.BACKEND_LINK',
    '4007': 'THM.OVER_TEMPERATURE',
    '4011': 'THM.FAN_FAILURE',
    '5002': 'MTR.METER_FAILURE',
  },
})
