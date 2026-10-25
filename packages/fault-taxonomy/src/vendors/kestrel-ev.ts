import { defineVendorTable } from './table'

// Fictional vendor. Prefixed codes, e.g. "KST-E-0042"; matched after trim + upper-case.
export const kestrelEv = defineVendorTable({
  vendorId: 'kestrel-ev',
  canonicalise: (code) => code.trim().toUpperCase(),
  codes: {
    'KST-E-0042': 'CON.LOCK_FAILURE',
    'KST-E-0043': 'CON.CABLE_DAMAGE',
    'KST-E-0107': 'PWR.OVERCURRENT',
    'KST-E-0110': 'PWR.MODULE_FAILURE',
    'KST-E-0201': 'COM.BACKEND_LINK',
    'KST-E-0305': 'THM.OVER_TEMPERATURE',
    'KST-E-0306': 'THM.FAN_FAILURE',
    'KST-E-0410': 'FWR.CRASH',
    'KST-E-0502': 'MTR.METER_FAILURE',
  },
})
