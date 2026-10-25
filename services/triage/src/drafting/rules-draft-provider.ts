import type { Component } from '@charge-portal/fault-taxonomy'
import { Injectable } from '@nestjs/common'
import type { Fault, FaultSource } from '../faults/fault.entity'
import type { DraftContext, DraftProvider, TicketDraftInput } from './draft-provider'

/** The same class on one station this often (the new fault included) within the window is a pattern. */
export const RECURRENCE_THRESHOLD = 3
export const RECURRENCE_WINDOW_MS = 24 * 60 * 60 * 1000

/** How sure the rules are, by how the fault was classified (ADR 0008, decision 3). */
const CONFIDENCE: Record<FaultSource, number> = {
  'vendor-table': 0.9,
  'ocpp-default': 0.6,
  unclassified: 0.3,
}

interface Template {
  cause: string
  action: string
}

const TEMPLATES: Record<Component, Template> = {
  connector: {
    cause: 'The connector hardware or its locking mechanism reported a fault, for example a jammed lock actuator or a damaged contact.',
    action: 'Check the connector, cable and lock actuator for damage or blockage and keep the connector out of service until it has been inspected.',
  },
  'power-electronics': {
    cause: 'A power stage tripped or failed, for example an overloaded power module, a failed switch or a protection trip.',
    action: 'Read the power module diagnostics, check the protection devices and cabling, and replace the affected power module if it is defective.',
  },
  metering: {
    cause: 'The energy meter is not delivering valid readings, for example because of a communication or hardware fault in the meter.',
    action: 'Verify the meter connection and readings, and replace the meter if the values stay invalid; sessions without valid meter data cannot be billed.',
  },
  communication: {
    cause: 'The station lost or degraded a communication link, for example to the backend, over the mobile network or to the vehicle.',
    action: 'Restart the communication module remotely, then check the signal strength, the SIM or network settings and the backend connection.',
  },
  'rfid-reader': {
    cause: 'The RFID card reader does not respond or reports errors, so cards cannot be read at the station.',
    action: 'Reset the reader remotely; if it stays down, replace the reader. Charging through the app is not affected.',
  },
  firmware: {
    cause: 'The station firmware reported an internal error, a failed reset or a crash.',
    action: 'Reset the station remotely and confirm the firmware version; reflash the current firmware if the error comes back.',
  },
  thermal: {
    cause: 'A temperature limit was exceeded or a cooling component such as a fan failed, so the station derates or stops charging.',
    action: 'Check the cooling system, fans, air intakes and ambient conditions, and clean or replace the failing cooling component.',
  },
  'grid-supply': {
    cause: 'The grid supply or the protective earth is outside its allowed range, for example an unstable voltage or an earth fault.',
    action: 'Check the supply voltage and the upstream protection; for an earth fault inspect the protective earth and insulation before putting the station back in service.',
  },
  unknown: {
    cause: 'The fault could not be classified: neither the vendor code table nor the standard OCPP error code identifies it.',
    action: 'Review the raw OCPP and vendor codes, assign the likely class, and extend the vendor table if the code is expected to come back.',
  },
}

/**
 * The deterministic provider (ADR 0010): a cause/action template per component, an escalation to a site
 * visit when the same class keeps coming back, and a confidence from how the fault was classified.
 * It needs no network, so it is the default and the fallback for every other provider.
 */
@Injectable()
export class RulesDraftProvider implements DraftProvider {
  draft(fault: Fault, context: DraftContext): Promise<TicketDraftInput> {
    const template = TEMPLATES[fault.component as Component] ?? TEMPLATES.unknown
    const occurrences = this.occurrences(fault, context)
    const recurring = occurrences >= RECURRENCE_THRESHOLD

    let probableCause = template.cause
    let suggestedAction = template.action
    if (recurring) {
      probableCause += ` Recurring: ${fault.taxonomyCode} occurred ${occurrences} times on this station within 24 hours.`
      suggestedAction = `Escalated because the fault recurs: schedule a site visit. ${suggestedAction}`
    } else if (fault.requiresSiteVisit) {
      suggestedAction += ' A site visit is needed.'
    } else {
      suggestedAction += ' No site visit is needed unless the fault recurs.'
    }

    return Promise.resolve({
      taxonomyCode: fault.taxonomyCode,
      probableCause,
      suggestedAction,
      requiresSiteVisit: fault.requiresSiteVisit || recurring,
      confidence: CONFIDENCE[fault.source] ?? CONFIDENCE.unclassified,
      provider: 'rules',
    })
  }

  /**
   * Occurrences of `fault`'s class on its station in the 24 hours up to and including it, `fault`
   * itself counted once. The window is relative to the fault's own time, so the result does not depend on
   * the clock.
   */
  private occurrences(fault: Fault, context: DraftContext): number {
    const end = fault.occurredAt.getTime()
    const start = end - RECURRENCE_WINDOW_MS
    const earlier = context.recentFaults.filter(
      (other) =>
        other.id !== fault.id &&
        other.stationId === fault.stationId &&
        other.taxonomyCode === fault.taxonomyCode &&
        other.occurredAt.getTime() >= start &&
        other.occurredAt.getTime() <= end,
    )
    return earlier.length + 1
  }
}
