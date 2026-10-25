import { describe, expect, it } from 'vitest'
import { loadTelemetryInterval } from '../../../src/telemetry/telemetry.config'

describe('loadTelemetryInterval', () => {
  it('defaults to 5000 ms', () => {
    expect(loadTelemetryInterval({})).toBe(5000)
    expect(loadTelemetryInterval({ TELEMETRY_INTERVAL_MS: '' })).toBe(5000)
    expect(loadTelemetryInterval({ TELEMETRY_INTERVAL_MS: '  ' })).toBe(5000)
  })

  it('reads TELEMETRY_INTERVAL_MS', () => {
    expect(loadTelemetryInterval({ TELEMETRY_INTERVAL_MS: '1000' })).toBe(1000)
  })

  it.each(['0', '-5', '1.5', 'abc', '1e3x'])('rejects %s', (value) => {
    expect(() => loadTelemetryInterval({ TELEMETRY_INTERVAL_MS: value })).toThrow(/TELEMETRY_INTERVAL_MS/)
  })
})
