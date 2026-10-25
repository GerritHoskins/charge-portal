import { TAXONOMY } from '@charge-portal/fault-taxonomy'
import { describe, expect, it } from 'vitest'
import { alertMessage, offlineAlertMessage, planAlertChanges } from '../../../src/telemetry/alerts'
import { rollupStationState, type StationState } from '../../../src/telemetry/rollup'
import type { TelemetrySample } from '../../../src/telemetry/sample'

const NOW = new Date('2026-10-25T10:05:00Z')
const at = (offsetSeconds: number) => new Date(Date.parse('2026-10-25T10:00:00Z') + offsetSeconds * 1000).toISOString()
const sample = (offset: number, over: Partial<TelemetrySample> = {}): TelemetrySample => ({
  stationId: 'st-003',
  at: at(offset),
  status: 'Available',
  temperatureC: 30,
  powerKw: 0,
  ...over,
})
const roll = (prev: StationState | null, next: TelemetrySample) => rollupStationState(prev, next, NOW)
const LOCK = TAXONOMY['CON.LOCK_FAILURE']
const WEAK = TAXONOMY['COM.WEAK_SIGNAL']

describe('planAlertChanges', () => {
  it('raises nothing for a healthy first sample', () => {
    expect(planAlertChanges(null, roll(null, sample(0)))).toEqual({ raise: [], clear: [] })
  })

  it('raises an alert when a condition appears, with a short English message', () => {
    const healthy = roll(null, sample(0))
    const plan = planAlertChanges(healthy, roll(healthy, sample(5, { status: 'Faulted', faultClass: LOCK })))
    expect(plan.clear).toEqual([])
    expect(plan.raise).toEqual([
      { kind: 'site_visit_fault', message: 'Station st-003 needs a visit: fault CON.LOCK_FAILURE requires on-site work.' },
    ])
  })

  it('raises alerts for a first sample that is already faulty (no previous state)', () => {
    const plan = planAlertChanges(null, roll(null, sample(0, { status: 'Faulted', faultClass: LOCK })))
    expect(plan.raise.map((alert) => alert.kind)).toEqual(['site_visit_fault'])
  })

  it('does not raise the same condition twice', () => {
    const faulted = roll(null, sample(0, { status: 'Faulted', faultClass: LOCK }))
    const again = roll(faulted, sample(5, { status: 'Faulted', faultClass: LOCK }))
    expect(planAlertChanges(faulted, again)).toEqual({ raise: [], clear: [] })
  })

  it('clears the alert when the condition ends', () => {
    const faulted = roll(null, sample(0, { status: 'Faulted', faultClass: LOCK }))
    expect(planAlertChanges(faulted, roll(faulted, sample(5)))).toEqual({ raise: [], clear: ['site_visit_fault'] })
  })

  it('handles one condition replacing another', () => {
    const warm = roll(null, sample(0, { temperatureC: 65 }))
    const faulted = roll(warm, sample(5, { status: 'Faulted', faultClass: WEAK }))
    const plan = planAlertChanges(warm, faulted)
    expect(plan.clear).toEqual(['high_temperature'])
    expect(plan.raise.map((alert) => alert.kind)).toEqual(['degraded_fault'])
  })
})

describe('alertMessage', () => {
  it('describes every condition as a short sentence naming the station', () => {
    let hot: StationState | null = null
    for (const [index, temperature] of [70, 71, 72].entries()) hot = roll(hot, sample(index * 5, { temperatureC: temperature }))
    expect(alertMessage('sustained_overheating', hot!)).toBe(
      'Station st-003 needs a visit: temperature stayed at or above 70 °C for 3 samples.',
    )
    expect(alertMessage('high_temperature', hot!)).toBe('Station st-003 is degraded: temperature is 72 °C.')

    let recurring: StationState | null = null
    for (const offset of [0, 100, 200]) {
      recurring = roll(roll(recurring, sample(offset, { status: 'Faulted', faultClass: WEAK })), sample(offset + 5))
    }
    expect(alertMessage('recurring_fault', recurring!)).toBe(
      'Station st-003 needs a visit: COM.WEAK_SIGNAL occurred 3 times within 30 minutes.',
    )

    const degraded = roll(null, sample(0, { status: 'Faulted', faultClass: WEAK }))
    expect(alertMessage('degraded_fault', degraded)).toBe('Station st-003 is degraded: fault COM.WEAK_SIGNAL is active.')
    const unknown = roll(null, sample(0, { status: 'Faulted' }))
    expect(alertMessage('degraded_fault', unknown)).toBe('Station st-003 is degraded: it reports a fault without a fault class.')
  })

  it('describes the offline alert with the silence in seconds', () => {
    expect(offlineAlertMessage('st-005', 15_000)).toBe('Station st-005 is offline: no telemetry for 15 s.')
  })
})
