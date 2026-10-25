import { defineVendorTable } from './table'

// Fictional vendor. Free-text phrases, e.g. "Lock motor stalled"; matched exactly after trim +
// lower-case (ADR 0008: no fuzzy matching). Keys are therefore stored lower-case.
export const lumenwatt = defineVendorTable({
  vendorId: 'lumenwatt',
  canonicalise: (code) => code.trim().toLowerCase(),
  codes: {
    'lock motor stalled': 'CON.LOCK_FAILURE',
    'cable insulation damaged': 'CON.CABLE_DAMAGE',
    'output current limit exceeded': 'PWR.OVERCURRENT',
    'power module offline': 'PWR.MODULE_FAILURE',
    'cloud link lost': 'COM.BACKEND_LINK',
    'housing temperature critical': 'THM.OVER_TEMPERATURE',
    'meter reading invalid': 'MTR.METER_FAILURE',
    'controller watchdog reset': 'FWR.CRASH',
  },
})
