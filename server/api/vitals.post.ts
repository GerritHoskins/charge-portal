import { vitalsBeaconSchema } from '#shared/contracts/vitals'
import { createRateLimiter } from '../utils/rate-limit'
import { createVitalsStore } from '../utils/vitals-store'

const MAX_BODY_BYTES = 2 * 1024
const ACCEPTED_CONTENT_TYPES = new Set(['application/json', 'text/plain'])
const vitalsRateLimiter = createRateLimiter({ limit: 120, windowMs: 60_000 })

export const vitalsStore = createVitalsStore()

const badRequest = () => createError({ statusCode: 400, statusMessage: 'Invalid vitals beacon' })

export default defineEventHandler(async (event) => {
  const contentType = getRequestHeader(event, 'content-type')
    ?.split(';', 1)[0]
    ?.trim()
    .toLowerCase()
  if (!contentType || !ACCEPTED_CONTENT_TYPES.has(contentType)) {
    throw createError({ statusCode: 415, statusMessage: 'Expected text/plain or application/json' })
  }

  const contentLength = Number(getRequestHeader(event, 'content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Vitals beacon is too large' })
  }

  const ip = getRequestIP(event, { xForwardedFor: useRuntimeConfig().trustProxy }) ?? 'unknown'
  const rateLimit = vitalsRateLimiter.check(ip)
  if (!rateLimit.allowed) {
    setResponseHeader(event, 'retry-after', rateLimit.retryAfterSec)
    throw createError({ statusCode: 429, statusMessage: 'Too many vitals beacons' })
  }
  vitalsRateLimiter.fail(ip)

  const raw = await readRawBody(event)
  if (!raw) throw badRequest()
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Vitals beacon is too large' })
  }

  let input: unknown
  try {
    input = JSON.parse(raw)
  } catch {
    throw badRequest()
  }

  const parsed = vitalsBeaconSchema.safeParse(input)
  if (!parsed.success) throw badRequest()

  vitalsStore.add(parsed.data)
  return sendNoContent(event)
})
