import { z } from 'zod'

// Canonical layer (ADR 0008, decision 1).
//
// `unknown` is the one component beyond the eight in the ADR: UNCLASSIFIED faults have no known
// component, and naming a wrong one would be worse than saying so.
export const componentSchema = z.enum([
  'connector',
  'power-electronics',
  'metering',
  'communication',
  'rfid-reader',
  'firmware',
  'thermal',
  'grid-supply',
  'unknown',
])

export const severitySchema = z.enum(['info', 'minor', 'major', 'critical'])

export const taxonomyCodeSchema = z.union([z.string().regex(/^[A-Z]{3}\.[A-Z_]+$/), z.literal('UNCLASSIFIED')])

export const faultClassSchema = z.object({
  taxonomyCode: taxonomyCodeSchema,
  component: componentSchema,
  severity: severitySchema,
  // Explicit rather than derived from severity: this flag is what turns a fault into a cost.
  requiresSiteVisit: z.boolean(),
})

export type Component = z.infer<typeof componentSchema>
export type Severity = z.infer<typeof severitySchema>
export type TaxonomyCode = z.infer<typeof taxonomyCodeSchema>
export type FaultClass = z.infer<typeof faultClassSchema>

function define(taxonomyCode: TaxonomyCode, component: Component, severity: Severity, requiresSiteVisit: boolean): Readonly<FaultClass> {
  return Object.freeze({ taxonomyCode, component, severity, requiresSiteVisit })
}

// Severity and site-visit values are plausible operating assumptions, chosen per area:
export const TAXONOMY = Object.freeze({
  // CON: a stuck lock blocks one connector and needs hands-on work. Damaged cables are a
  // shock/fire hazard, hence critical.
  'CON.LOCK_FAILURE': define('CON.LOCK_FAILURE', 'connector', 'major', true),
  'CON.CABLE_DAMAGE': define('CON.CABLE_DAMAGE', 'connector', 'critical', true),

  // PWR: over-current trips are usually a failing component (major, visit). A failed power
  // module takes capacity out of service (critical). Supply voltage excursions come from the
  // grid, so they belong to `grid-supply`: under-voltage often clears by itself (no visit),
  // over-voltage can damage hardware and warrants a check.
  'PWR.OVERCURRENT': define('PWR.OVERCURRENT', 'power-electronics', 'major', true),
  'PWR.MODULE_FAILURE': define('PWR.MODULE_FAILURE', 'power-electronics', 'critical', true),
  'PWR.OVERVOLTAGE': define('PWR.OVERVOLTAGE', 'grid-supply', 'major', true),
  'PWR.UNDERVOLTAGE': define('PWR.UNDERVOLTAGE', 'grid-supply', 'minor', false),

  // GRD: an earth fault is a protective-earth safety issue, never remote-fixable.
  'GRD.GROUND_FAULT': define('GRD.GROUND_FAULT', 'grid-supply', 'critical', true),

  // MTR: a faulty meter blocks billing-grade sessions; replacing it needs a technician.
  'MTR.METER_FAILURE': define('MTR.METER_FAILURE', 'metering', 'major', true),

  // COM: communication faults are mostly fixable remotely (restart, APN, retry) or sit on the
  // vehicle side, so no visit by default; only a lost backend link is major.
  'COM.EV_HANDSHAKE': define('COM.EV_HANDSHAKE', 'communication', 'minor', false),
  'COM.BACKEND_LINK': define('COM.BACKEND_LINK', 'communication', 'major', false),
  'COM.WEAK_SIGNAL': define('COM.WEAK_SIGNAL', 'communication', 'minor', false),

  // RFD: app start still works without the reader, so minor; the part is replaced on site.
  'RFD.READER_FAILURE': define('RFD.READER_FAILURE', 'rfid-reader', 'minor', true),

  // FWR: firmware states are first tried remotely (reset, reflash); escalate only if they persist.
  'FWR.RESET_FAILURE': define('FWR.RESET_FAILURE', 'firmware', 'major', false),
  'FWR.CRASH': define('FWR.CRASH', 'firmware', 'major', false),

  // THM: over-temperature derates or stops charging and indicates a cooling problem (visit).
  // A failed fan is the cause but not yet an outage (minor, visit before it escalates).
  'THM.OVER_TEMPERATURE': define('THM.OVER_TEMPERATURE', 'thermal', 'major', true),
  'THM.FAN_FAILURE': define('THM.FAN_FAILURE', 'thermal', 'minor', true),

  // Unknown is safe, not silent (ADR 0008, decision 4): major and a visit, so it gets reviewed.
  UNCLASSIFIED: define('UNCLASSIFIED', 'unknown', 'major', true),
})

export type KnownTaxonomyCode = keyof typeof TAXONOMY

export const UNCLASSIFIED_FAULT: Readonly<FaultClass> = TAXONOMY.UNCLASSIFIED
