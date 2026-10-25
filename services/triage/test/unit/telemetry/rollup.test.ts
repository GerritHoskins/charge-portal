import { TAXONOMY, type FaultClass } from '@charge-portal/fault-taxonomy'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TELEMETRY_INTERVAL_MS,
  DEGRADED_TEMPERATURE_C,
  FAULT_WINDOW_MS,
  NEEDS_VISIT_FAULT_COUNT,
  NEEDS_VISIT_HOT_SAMPLES,
  NEEDS_VISIT_TEMPERATURE_C,
  OFFLINE_AFTER_INTERVALS,
  effectiveHealth,
  isOffline,
  recurringFault,
  rollupStationState,
  type StationState,
} from '../../../src/telemetry/rollup'
import type { TelemetrySample } from '../../../src/telemetry/sample'

const T0 = Date.parse('2026-10-25T10:00:00Z')
const iso = (offsetSeconds: number) => new Date(T0 + offsetSeconds * 1000).toISOString()
const NOW = new Date('2026-10-25T10:05:00Z')

function sample(offsetSeconds: number, over: Partial<TelemetrySample> = {}): TelemetrySample {
  return { stationId: 'st-001', at: iso(offsetSeconds), status: 'Available', temperatureC: 30, powerKw: 0, ...over }
}

const faulted = (offsetSeconds: number, faultClass: FaultClass, over: Partial<TelemetrySample> = {}) =>
  sample(offsetSeconds, { status: 'Faulted', faultClass, ...over })

/** Folds samples through the rollup, as the service does. */
function feed(samples: TelemetrySample[], now = NOW): StationState {
  let state: StationState | null = null
  for (const next of samples) state = rollupStationState(state, next, now)
  if (!state) throw new Error('no samples')
  return state
}

const LOCK = TAXONOMY['CON.LOCK_FAILURE'] // major, site visit
const WEAK_SIGNAL = TAXONOMY['COM.WEAK_SIGNAL'] // minor, no visit
const BACKEND_LINK = TAXONOMY['COM.BACKEND_LINK'] // major, no visit
const INFO_ONLY: FaultClass = { taxonomyCode: 'COM.EV_HANDSHAKE', component: 'communication', severity: 'info', requiresSiteVisit: false }

describe('rule constants', () => {
  it('match the specification', () => {
    expect(NEEDS_VISIT_FAULT_COUNT).toBe(3)
    expect(FAULT_WINDOW_MS).toBe(30 * 60 * 1000)
    expect(NEEDS_VISIT_TEMPERATURE_C).toBe(70)
    expect(NEEDS_VISIT_HOT_SAMPLES).toBe(3)
    expect(DEGRADED_TEMPERATURE_C).toBe(60)
    expect(OFFLINE_AFTER_INTERVALS).toBe(3)
    expect(DEFAULT_TELEMETRY_INTERVAL_MS).toBe(5000)
  })
})

describe('rollupStationState: first sample', () => {
  it('is ok for a healthy station and keeps the sample fields', () => {
    const state = rollupStationState(null, sample(0, { status: 'Charging', temperatureC: 41.5, powerKw: 11 }), NOW)
    expect(state).toMatchObject({
      stationId: 'st-001',
      state: 'ok',
      conditions: [],
      lastStatus: 'Charging',
      temperatureC: 41.5,
      powerKw: 11,
      activeFault: null,
      consecutiveHotSamples: 0,
      recentFaults: [],
    })
    expect(state.lastSampleAt.toISOString()).toBe(iso(0))
    expect(state.lastReceivedAt).toEqual(NOW)
    expect(state.updatedAt).toEqual(NOW)
  })

  it('does not mutate the previous state', () => {
    const prev = Object.freeze(rollupStationState(null, sample(0), NOW))
    expect(() => rollupStationState(prev, sample(5, { temperatureC: 75 }), NOW)).not.toThrow()
  })
})

describe('rollupStationState: faults', () => {
  it('needs a visit when the latest fault class requires a site visit', () => {
    const state = feed([sample(0), faulted(5, LOCK)])
    expect(state.state).toBe('needs-visit')
    expect(state.conditions).toEqual(['site_visit_fault'])
    expect(state.activeFault).toEqual(LOCK)
  })

  it('is degraded for a major fault without a site visit', () => {
    const state = feed([faulted(0, BACKEND_LINK)])
    expect(state.state).toBe('degraded')
    expect(state.conditions).toEqual(['degraded_fault'])
  })

  it('is degraded for a minor fault without a site visit', () => {
    expect(feed([faulted(0, WEAK_SIGNAL)]).state).toBe('degraded')
  })

  it('is degraded when the status is Faulted but no fault class is known', () => {
    const state = feed([sample(0, { status: 'Faulted' })])
    expect(state.state).toBe('degraded')
    expect(state.activeFault).toBeNull()
  })

  it('ignores an info-level fault class on a non-faulted status', () => {
    expect(feed([sample(0, { faultClass: INFO_ONLY })]).state).toBe('ok')
  })
})

describe('rollupStationState: recurring faults (2 vs 3 within 30 minutes)', () => {
  // Fault, recovery, fault, ... : every fault onset counts once.
  const cycle = (offsetsSeconds: number[], faultClass: FaultClass) =>
    offsetsSeconds.flatMap((offset) => [faulted(offset, faultClass), sample(offset + 5)])

  it('stays degraded with two faults of the same code', () => {
    const state = feed([...cycle([0], WEAK_SIGNAL), faulted(300, WEAK_SIGNAL)])
    expect(state.state).toBe('degraded')
    expect(state.recentFaults).toHaveLength(2)
  })

  it('needs a visit at the third fault of the same code', () => {
    const state = feed([...cycle([0, 300], WEAK_SIGNAL), faulted(600, WEAK_SIGNAL)])
    expect(state.state).toBe('needs-visit')
    expect(state.conditions).toContain('recurring_fault')
    expect(recurringFault(state)).toEqual({ taxonomyCode: 'COM.WEAK_SIGNAL', count: 3 })
  })

  it('keeps the recurring condition after the station recovered, until the window has passed', () => {
    const state = feed(cycle([0, 300, 600], WEAK_SIGNAL))
    expect(state.activeFault).toBeNull()
    expect(state.state).toBe('needs-visit')
    expect(state.conditions).toEqual(['recurring_fault'])
  })

  it('counts the third fault exactly 30 minutes after the first (inclusive window)', () => {
    const state = feed([...cycle([0, 600], WEAK_SIGNAL), faulted(1800, WEAK_SIGNAL)])
    expect(state.state).toBe('needs-visit')
  })

  it('does not count a first fault that is 30 minutes and 1 second old', () => {
    const state = feed([...cycle([0, 600], WEAK_SIGNAL), faulted(1801, WEAK_SIGNAL)])
    expect(state.recentFaults).toHaveLength(2)
    expect(state.state).toBe('degraded')
  })

  it('clears the recurring condition when old faults leave the window and the station is healthy', () => {
    const recurring = feed(cycle([0, 300, 600], WEAK_SIGNAL))
    expect(recurring.state).toBe('needs-visit')
    const later = rollupStationState(recurring, sample(600 + FAULT_WINDOW_MS / 1000 + 1), NOW)
    expect(later.state).toBe('ok')
    expect(later.conditions).toEqual([])
    expect(later.recentFaults).toEqual([])
  })

  it('counts one onset for a fault that is reported in every consecutive sample', () => {
    const state = feed([0, 5, 10, 15, 20].map((offset) => faulted(offset, WEAK_SIGNAL)))
    expect(state.recentFaults).toHaveLength(1)
    expect(state.state).toBe('degraded')
  })

  it('counts a change of fault code without recovery as a new onset', () => {
    const state = feed([faulted(0, WEAK_SIGNAL), faulted(5, BACKEND_LINK), faulted(10, WEAK_SIGNAL)])
    expect(state.recentFaults.map((fault) => fault.taxonomyCode)).toEqual(['COM.WEAK_SIGNAL', 'COM.BACKEND_LINK', 'COM.WEAK_SIGNAL'])
  })

  it('does not combine different taxonomy codes', () => {
    const state = feed([...cycle([0, 300], WEAK_SIGNAL), faulted(600, BACKEND_LINK)])
    expect(state.conditions).not.toContain('recurring_fault')
    expect(recurringFault(state)).toBeNull()
    expect(state.state).toBe('degraded')
  })

  it('names the most frequent code (ties: alphabetical)', () => {
    const state = feed([...cycle([0, 100, 200], BACKEND_LINK), ...cycle([300, 400, 500], WEAK_SIGNAL)])
    expect(recurringFault(state)).toEqual({ taxonomyCode: 'COM.BACKEND_LINK', count: 3 })
  })

  it('bounds the stored history', () => {
    const many = Array.from({ length: 120 }, (_, i) => [faulted(i * 10, WEAK_SIGNAL), sample(i * 10 + 5)]).flat()
    expect(feed(many).recentFaults.length).toBeLessThanOrEqual(50)
  })
})

describe('rollupStationState: temperature', () => {
  const temperature = (value: number, offsetSeconds = 0) => sample(offsetSeconds, { temperatureC: value })

  it.each([
    [59, 'ok'],
    [60, 'degraded'],
    [69, 'degraded'],
    [70, 'degraded'], // one hot sample is not enough for a visit
  ] as const)('a single sample at %s degrees C is %s', (value, expected) => {
    expect(feed([temperature(value)]).state).toBe(expected)
  })

  it('is just below the degraded boundary at 59.9 and on it at 60', () => {
    expect(feed([temperature(59.9)]).state).toBe('ok')
    expect(feed([temperature(60)]).conditions).toEqual(['high_temperature'])
  })

  it('needs a visit after 3 consecutive samples at 70 degrees C or more', () => {
    const two = feed([temperature(70, 0), temperature(71, 5)])
    expect(two.state).toBe('degraded')
    expect(two.consecutiveHotSamples).toBe(2)
    const three = feed([temperature(70, 0), temperature(71, 5), temperature(70, 10)])
    expect(three.state).toBe('needs-visit')
    expect(three.conditions).toContain('sustained_overheating')
  })

  it('does not count 69.9 as hot', () => {
    const state = feed([temperature(70, 0), temperature(70, 5), temperature(69.9, 10)])
    expect(state.state).toBe('degraded')
    expect(state.consecutiveHotSamples).toBe(0)
  })

  it('restarts the count after an interrupted run', () => {
    const state = feed([temperature(70, 0), temperature(70, 5), temperature(65, 10), temperature(70, 15), temperature(70, 20)])
    expect(state.consecutiveHotSamples).toBe(2)
    expect(state.state).toBe('degraded')
  })

  it('recovers step by step when the station cools down', () => {
    const hot = feed([temperature(70, 0), temperature(70, 5), temperature(70, 10)])
    expect(hot.state).toBe('needs-visit')
    const warm = rollupStationState(hot, temperature(65, 15), NOW)
    expect(warm.state).toBe('degraded')
    expect(warm.conditions).toEqual(['high_temperature'])
    const cool = rollupStationState(warm, temperature(59, 20), NOW)
    expect(cool.state).toBe('ok')
    expect(cool.conditions).toEqual([])
  })
})

describe('rollupStationState: recovery', () => {
  it('returns to ok with a non-faulted status when no rule fires', () => {
    const state = feed([faulted(0, LOCK), sample(5, { status: 'Available' })])
    expect(state.state).toBe('ok')
    expect(state.conditions).toEqual([])
    expect(state.activeFault).toBeNull()
  })

  it('does not recover while the status stays Faulted', () => {
    const state = feed([faulted(0, LOCK), sample(5, { status: 'Faulted' })])
    expect(state.state).toBe('degraded')
  })

  it('does not recover while a temperature rule still fires', () => {
    const state = feed([faulted(0, LOCK), sample(5, { temperatureC: 65 })])
    expect(state.state).toBe('degraded')
  })

  it('combines conditions and reports the highest level', () => {
    const state = feed([faulted(0, BACKEND_LINK, { temperatureC: 75 })])
    expect(state.state).toBe('degraded')
    expect(state.conditions).toEqual(['degraded_fault', 'high_temperature'])
    const worse = feed([faulted(0, LOCK, { temperatureC: 75 })])
    expect(worse.state).toBe('needs-visit')
    expect(worse.conditions).toEqual(['site_visit_fault', 'high_temperature'])
  })
})

describe('rollupStationState: out-of-order samples', () => {
  it('ignores an older sample but records that the station is alive', () => {
    const current = rollupStationState(null, faulted(60, LOCK), new Date('2026-10-25T10:01:00Z'))
    const later = new Date('2026-10-25T10:02:00Z')
    const next = rollupStationState(current, sample(30, { temperatureC: 20 }), later)
    expect(next).toEqual({ ...current, lastReceivedAt: later, updatedAt: later })
  })

  it('processes a sample with the same timestamp', () => {
    const current = rollupStationState(null, faulted(60, LOCK), NOW)
    expect(rollupStationState(current, sample(60), NOW).state).toBe('ok')
  })
})

describe('offline (computed at read time)', () => {
  const received = new Date('2026-10-25T10:00:00.000Z')
  const state = rollupStationState(null, sample(0), received)
  const at = (ms: number) => new Date(received.getTime() + ms)

  it.each([
    [14_999, false],
    [15_000, true],
    [60_000, true],
  ])('with the default interval, %s ms of silence is offline: %s', (silence, offline) => {
    expect(isOffline(state, at(silence), DEFAULT_TELEMETRY_INTERVAL_MS)).toBe(offline)
  })

  it('scales with the configured interval', () => {
    expect(isOffline(state, at(2999), 1000)).toBe(false)
    expect(isOffline(state, at(3000), 1000)).toBe(true)
  })

  it('measures silence from when the sample was received, not from its timestamp', () => {
    const lagging = rollupStationState(null, sample(-3600), received)
    expect(isOffline(lagging, at(1000), DEFAULT_TELEMETRY_INTERVAL_MS)).toBe(false)
  })

  it('overrides the stored state regardless of how healthy or faulty it was', () => {
    const needsVisit = feed([faulted(0, LOCK)], received)
    expect(effectiveHealth(state, at(14_999), 5000)).toBe('ok')
    expect(effectiveHealth(state, at(15_000), 5000)).toBe('offline')
    expect(effectiveHealth(needsVisit, at(15_000), 5000)).toBe('offline')
    expect(effectiveHealth(needsVisit, at(1000), 5000)).toBe('needs-visit')
  })

  it('is no longer offline once a new sample arrives', () => {
    const later = at(60_000)
    const back = rollupStationState(state, sample(60), later)
    expect(effectiveHealth(back, later, 5000)).toBe('ok')
  })
})
