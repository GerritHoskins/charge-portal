import type { z } from 'zod'

// Single place where legacy responses enter the app: fetch, then enforce the
// contract. Drift or an outage becomes a 502 at the edge, not a broken component.
export const fetchLegacy = async <T extends z.ZodType>(path: string, schema: T): Promise<z.infer<T>> => {
  const { legacyOrigin } = useRuntimeConfig()

  const raw = await $fetch<unknown>(`${legacyOrigin}${path}`).catch(() => {
    throw createError({ statusCode: 502, statusMessage: 'Legacy backend unreachable' })
  })

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 502, statusMessage: 'Legacy response violates contract' })
  }
  return parsed.data
}
