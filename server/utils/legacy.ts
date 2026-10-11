import type { H3Event } from 'h3'
import type { z } from 'zod'

// Single place where legacy responses enter the app: forward the browser's
// session cookie, fetch, then enforce the contract. Outage or drift becomes a
// 502 at the edge, an expired session a 401; neither reaches a component.
export const fetchLegacy = async <T extends z.ZodType>(
  event: H3Event,
  path: string,
  schema: T,
): Promise<z.infer<T>> => {
  const { legacyOrigin } = useRuntimeConfig()
  const cookie = getRequestHeader(event, 'cookie')

  const raw = await $fetch<unknown>(`${legacyOrigin}${path}`, { headers: cookie ? { cookie } : {} }).catch(
    (error: { response?: { status?: number } }) => {
      if (error.response?.status === 401) {
        throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
      }
      throw createError({ statusCode: 502, statusMessage: 'Legacy backend unreachable' })
    },
  )

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 502, statusMessage: 'Legacy response violates contract' })
  }
  return parsed.data
}
