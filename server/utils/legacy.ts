import type { H3Event } from 'h3'
import type { z } from 'zod'
import { validationErrorSchema } from '#shared/contracts/invoice'

interface LegacyOptions {
  method?: 'GET' | 'POST'
  body?: Record<string, unknown>
  forwardCookie?: boolean
  headers?: Record<string, string>
}

// Single place where legacy responses enter the app: forward the browser's
// session cookie, fetch, then enforce the contract. Outage or drift becomes a
// 502 at the edge, an expired session a 401; neither reaches a component.
// A 422 with a valid validation body is a user error, not an outage: it is
// passed on so the form can show field messages.
export const fetchLegacy = async <T extends z.ZodType>(
  event: H3Event,
  path: string,
  schema: T,
  options: LegacyOptions = {},
): Promise<z.infer<T>> => {
  const { legacyOrigin } = useRuntimeConfig()
  const cookie = options.forwardCookie === false ? undefined : getRequestHeader(event, 'cookie')
  const headers = {
    ...options.headers,
    ...(cookie ? { cookie } : {}),
  }

  const raw = await $fetch<unknown>(`${legacyOrigin}${path}`, {
    method: options.method ?? 'GET',
    body: options.body,
    headers,
  }).catch((error: { response?: { status?: number; _data?: unknown } }) => {
    const status = error.response?.status
    if (status === 401) throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
    if (status === 404 || status === 409) throw createError({ statusCode: status, statusMessage: 'Rejected by legacy' })
    if (status === 422) {
      const validation = validationErrorSchema.safeParse(error.response?._data)
      if (validation.success) {
        throw createError({ statusCode: 422, statusMessage: 'Validation failed', data: validation.data })
      }
    }
    throw createError({ statusCode: 502, statusMessage: 'Legacy backend unreachable' })
  })

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 502, statusMessage: 'Legacy response violates contract' })
  }
  return parsed.data
}
