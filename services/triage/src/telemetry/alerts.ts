import { FAULT_WINDOW_MS, NEEDS_VISIT_HOT_SAMPLES, NEEDS_VISIT_TEMPERATURE_C, recurringFault } from './rollup'
import type { ConditionKind, StationState } from './rollup'

export interface AlertDraft {
  kind: ConditionKind
  message: string
}

export interface AlertChanges {
  /** Conditions that just became active: one new alert each. */
  raise: AlertDraft[]
  /** Conditions that ended: their active alert gets `clearedAt`. */
  clear: ConditionKind[]
}

/** Each transition adds an alert; ending a condition clears it. A condition that stays active changes nothing. */
export function planAlertChanges(prev: StationState | null, next: StationState): AlertChanges {
  const before = new Set(prev?.conditions ?? [])
  const after = new Set(next.conditions)
  return {
    raise: next.conditions.filter((kind) => !before.has(kind)).map((kind) => ({ kind, message: alertMessage(kind, next) })),
    clear: (prev?.conditions ?? []).filter((kind) => !after.has(kind)),
  }
}

/** Short English sentence; the UI translates by `kind` and may ignore this text. */
export function alertMessage(kind: ConditionKind, state: StationState): string {
  const id = state.stationId
  switch (kind) {
    case 'site_visit_fault':
      return `Station ${id} needs a visit: fault ${state.activeFault?.taxonomyCode ?? 'UNCLASSIFIED'} requires on-site work.`
    case 'recurring_fault': {
      const recurring = recurringFault(state)
      return `Station ${id} needs a visit: ${recurring?.taxonomyCode ?? 'UNCLASSIFIED'} occurred ${recurring?.count ?? 0} times within ${FAULT_WINDOW_MS / 60_000} minutes.`
    }
    case 'sustained_overheating':
      return `Station ${id} needs a visit: temperature stayed at or above ${NEEDS_VISIT_TEMPERATURE_C} °C for ${NEEDS_VISIT_HOT_SAMPLES} samples.`
    case 'degraded_fault':
      return state.activeFault
        ? `Station ${id} is degraded: fault ${state.activeFault.taxonomyCode} is active.`
        : `Station ${id} is degraded: it reports a fault without a fault class.`
    case 'high_temperature':
      return `Station ${id} is degraded: temperature is ${state.temperatureC} °C.`
  }
}

export function offlineAlertMessage(stationId: string, silenceMs: number): string {
  return `Station ${stationId} is offline: no telemetry for ${Math.round(silenceMs / 1000)} s.`
}
