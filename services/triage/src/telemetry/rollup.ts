import type { FaultClass, OcppStatus } from '@charge-portal/fault-taxonomy'
import type { TelemetrySample } from './sample'

// Rule thresholds (WP-08). Exported so tests, alerts and the simulator scenario refer to the same numbers.
/** Faults of the same taxonomy code within the window that make a station need a visit. */
export const NEEDS_VISIT_FAULT_COUNT = 3
/** The window, inclusive at both ends. */
export const FAULT_WINDOW_MS = 30 * 60 * 1000
/** Temperature at or above which consecutive samples count as overheating. */
export const NEEDS_VISIT_TEMPERATURE_C = 70
export const NEEDS_VISIT_HOT_SAMPLES = 3
/** Temperature at or above which a station is degraded. */
export const DEGRADED_TEMPERATURE_C = 60
/** No sample for this many intervals means offline. */
export const OFFLINE_AFTER_INTERVALS = 3
export const DEFAULT_TELEMETRY_INTERVAL_MS = 5000
/** Upper bound for the stored fault history (it is also pruned by the time window). */
const MAX_RECENT_FAULTS = 50

export type StationHealth = 'ok' | 'degraded' | 'needs-visit' | 'offline'
/** A condition the rollup derives from samples. `offline` is not one: it is computed at read time. */
export type ConditionKind = 'site_visit_fault' | 'recurring_fault' | 'sustained_overheating' | 'degraded_fault' | 'high_temperature'
export type AlertKind = ConditionKind | 'offline'

/** Fixed order, also the order of `StationState.conditions`. */
export const CONDITION_ORDER: readonly ConditionKind[] = [
  'site_visit_fault',
  'recurring_fault',
  'sustained_overheating',
  'degraded_fault',
  'high_temperature',
]

const NEEDS_VISIT_CONDITIONS: ReadonlySet<ConditionKind> = new Set(['site_visit_fault', 'recurring_fault', 'sustained_overheating'])

export interface RecentFault {
  taxonomyCode: string
  /** ISO timestamp of the sample in which the fault first appeared. */
  at: string
}

export interface StationState {
  stationId: string
  /** Stored level; never `offline` (see `effectiveHealth`). */
  state: Exclude<StationHealth, 'offline'>
  conditions: ConditionKind[]
  /** Station clock of the newest sample processed. */
  lastSampleAt: Date
  /** Server clock when a sample (of any age) last arrived. Offline is measured from this. */
  lastReceivedAt: Date
  lastStatus: OcppStatus
  temperatureC: number
  powerKw: number
  activeFault: FaultClass | null
  consecutiveHotSamples: number
  recentFaults: RecentFault[]
  updatedAt: Date
}

/**
 * Folds one sample into the station's state. Pure: `now` is the server clock (for `lastReceivedAt` and
 * `updatedAt`), while rule windows use the station's own sample timestamps so replays are deterministic.
 */
export function rollupStationState(prev: StationState | null, sample: TelemetrySample, now: Date): StationState {
  const sampleAt = new Date(sample.at)

  // A late, older sample must not rewind the state, but it proves the station is alive.
  if (prev && sampleAt.getTime() < prev.lastSampleAt.getTime()) {
    return { ...prev, lastReceivedAt: now, updatedAt: now }
  }

  const activeFault = sample.faultClass ?? null
  // A fault counts once when it appears, not in every sample that repeats it.
  const onset = activeFault !== null && prev?.activeFault?.taxonomyCode !== activeFault.taxonomyCode ? activeFault : null
  const windowStart = sampleAt.getTime() - FAULT_WINDOW_MS
  const recentFaults = [
    ...(prev?.recentFaults ?? []),
    ...(onset ? [{ taxonomyCode: onset.taxonomyCode, at: sampleAt.toISOString() }] : []),
  ]
    .filter((fault) => Date.parse(fault.at) >= windowStart)
    .slice(-MAX_RECENT_FAULTS)

  const consecutiveHotSamples = sample.temperatureC >= NEEDS_VISIT_TEMPERATURE_C ? (prev?.consecutiveHotSamples ?? 0) + 1 : 0

  const active = new Set<ConditionKind>()
  if (activeFault?.requiresSiteVisit) active.add('site_visit_fault')
  if (mostFrequentFault(recentFaults)) active.add('recurring_fault')
  if (consecutiveHotSamples >= NEEDS_VISIT_HOT_SAMPLES) active.add('sustained_overheating')
  // A Faulted status always keeps the station from `ok`, even when no class is known.
  const faultWithoutVisit =
    !activeFault?.requiresSiteVisit && (sample.status === 'Faulted' || (activeFault !== null && activeFault.severity !== 'info'))
  if (faultWithoutVisit) active.add('degraded_fault')
  if (sample.temperatureC >= DEGRADED_TEMPERATURE_C) active.add('high_temperature')

  const conditions = CONDITION_ORDER.filter((kind) => active.has(kind))
  const state = conditions.some((kind) => NEEDS_VISIT_CONDITIONS.has(kind)) ? 'needs-visit' : conditions.length > 0 ? 'degraded' : 'ok'

  return {
    stationId: sample.stationId,
    state,
    conditions,
    lastSampleAt: sampleAt,
    lastReceivedAt: now,
    lastStatus: sample.status,
    temperatureC: sample.temperatureC,
    powerKw: sample.powerKw,
    activeFault,
    consecutiveHotSamples,
    recentFaults,
    updatedAt: now,
  }
}

/** The code that occurs at least NEEDS_VISIT_FAULT_COUNT times (most frequent first, then alphabetical). */
function mostFrequentFault(faults: readonly RecentFault[]): { taxonomyCode: string; count: number } | null {
  const counts = new Map<string, number>()
  for (const fault of faults) counts.set(fault.taxonomyCode, (counts.get(fault.taxonomyCode) ?? 0) + 1)
  let best: { taxonomyCode: string; count: number } | null = null
  for (const [taxonomyCode, count] of [...counts].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (count >= NEEDS_VISIT_FAULT_COUNT && (best === null || count > best.count)) best = { taxonomyCode, count }
  }
  return best
}

/** The fault code that recurs in the window, if any. */
export function recurringFault(state: Pick<StationState, 'recentFaults'>): { taxonomyCode: string; count: number } | null {
  return mostFrequentFault(state.recentFaults)
}

/** True when no sample arrived for 3 x interval, counted from when the last one was received. */
export function isOffline(state: Pick<StationState, 'lastReceivedAt'>, now: Date, intervalMs: number): boolean {
  return now.getTime() - state.lastReceivedAt.getTime() >= OFFLINE_AFTER_INTERVALS * intervalMs
}

/** Offline is computed at read time and wins over whatever level was stored. */
export function effectiveHealth(state: Pick<StationState, 'state' | 'lastReceivedAt'>, now: Date, intervalMs: number): StationHealth {
  return isOffline(state, now, intervalMs) ? 'offline' : state.state
}
