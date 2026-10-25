import { faultClassSchema, ocppStatusSchema } from '@charge-portal/fault-taxonomy'
import { z } from 'zod'

/**
 * One telemetry reading of a charging station (WP-08). Untrusted until parsed: the simulator, and one day
 * real stations, send it through the `ingestTelemetry` mutation as plain JSON.
 */
export const telemetrySampleSchema = z.object({
  stationId: z.string().min(1).max(100),
  /** When the station took the reading. */
  at: z.iso.datetime({ offset: true }),
  /** OCPP 1.6 connector/charge point status. */
  status: ocppStatusSchema,
  /** Plausible physical range for outdoor power electronics; rejects sensor garbage. */
  temperatureC: z.number().min(-50).max(150),
  powerKw: z.number().min(0).max(1000),
  /** Canonical fault class (ADR 0008) when the station currently reports a fault. */
  faultClass: faultClassSchema.optional(),
})

export type TelemetrySample = z.infer<typeof telemetrySampleSchema>

export class TelemetrySampleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TelemetrySampleError'
  }
}

/** Parses an untrusted value. The error names the invalid fields and never repeats their values. */
export function parseTelemetrySample(input: unknown): TelemetrySample {
  const result = telemetrySampleSchema.safeParse(input)
  if (result.success) return result.data
  const problems = result.error.issues.map((issue) => `${issue.path.join('.') || '(sample)'}: ${issue.message}`)
  throw new TelemetrySampleError(`Invalid telemetry sample: ${problems.join('; ')}`)
}
