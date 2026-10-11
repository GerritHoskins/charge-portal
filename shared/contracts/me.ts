import { z } from 'zod'

export const meSchema = z.object({
  name: z.string(),
  role: z.string(),
})

export const meResponseSchema = z.object({ data: meSchema })

export type Me = z.infer<typeof meSchema>
