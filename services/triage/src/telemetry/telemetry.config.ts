import { DEFAULT_TELEMETRY_INTERVAL_MS } from './rollup'

/** DI token for the expected telemetry interval (`TELEMETRY_INTERVAL_MS`, default 5000). */
export const TELEMETRY_INTERVAL_MS = Symbol('TELEMETRY_INTERVAL_MS')

/** Reads the expected sample interval. An invalid value stops the service at startup instead of misjudging stations. */
export function loadTelemetryInterval(env: Record<string, string | undefined>): number {
  const raw = env.TELEMETRY_INTERVAL_MS?.trim()
  if (!raw) return DEFAULT_TELEMETRY_INTERVAL_MS
  if (!/^[1-9]\d*$/.test(raw)) throw new Error('TELEMETRY_INTERVAL_MS must be a positive integer (milliseconds)')
  return Number(raw)
}
