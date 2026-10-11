import { z } from 'zod'

export const sessionStatusSchema = z.enum(['running', 'completed'])

export const sessionSchema = z.object({
  id: z.string(),
  stationId: z.string(),
  startedAt: z.iso.datetime(),
  energyKwh: z.number().nonnegative(),
  status: sessionStatusSchema,
})

export const sessionListResponseSchema = z.object({
  data: z.array(sessionSchema),
})

export type SessionStatus = z.infer<typeof sessionStatusSchema>
export type ChargingSession = z.infer<typeof sessionSchema>
