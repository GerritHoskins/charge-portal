import { z } from 'zod'

// The contract between the Vue frontend and the legacy backend. The BFF parses
// every legacy response with this schema, so drift fails loudly at the boundary
// instead of deep inside a component.
export const stationStatusSchema = z.enum(['available', 'charging', 'faulted', 'offline'])

export const stationSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  status: stationStatusSchema,
  connectors: z.number().int().nonnegative(),
  maxPowerKw: z.number().positive(),
})

export const stationListResponseSchema = z.object({
  data: z.array(stationSchema),
})

export type StationStatus = z.infer<typeof stationStatusSchema>
export type Station = z.infer<typeof stationSchema>
