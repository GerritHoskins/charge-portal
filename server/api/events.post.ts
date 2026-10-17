import { shopEventSchema, type ShopEvent } from '#shared/contracts/events'
import { createRateLimiter } from '../utils/rate-limit'

const MAX_BODY_BYTES = 2 * 1024
const MAX_EVENTS = 5_000
const ACCEPTED_CONTENT_TYPES = new Set(['application/json', 'text/plain'])
const eventsRateLimiter = createRateLimiter({ limit: 120, windowMs: 60_000 })

export const shopEvents: ShopEvent[] = []

const badRequest = () => createError({ statusCode: 400, statusMessage: 'Invalid shop event' })

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
    throw createError({ statusCode: 413, statusMessage: 'Shop event is too large' })
  }

  const ip = getRequestIP(event, { xForwardedFor: useRuntimeConfig().trustProxy }) ?? 'unknown'
  const rateLimit = eventsRateLimiter.check(ip)
  if (!rateLimit.allowed) {
    setResponseHeader(event, 'retry-after', rateLimit.retryAfterSec)
    throw createError({ statusCode: 429, statusMessage: 'Too many shop events' })
  }
  eventsRateLimiter.fail(ip)

  const raw = await readRawBody(event)
  if (!raw) throw badRequest()
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Shop event is too large' })
  }

  let input: unknown
  try {
    input = JSON.parse(raw)
  } catch {
    throw badRequest()
  }

  const parsed = shopEventSchema.safeParse(input)
  if (!parsed.success) throw badRequest()

  shopEvents.push(parsed.data)
  if (shopEvents.length > MAX_EVENTS) shopEvents.shift()
  return sendNoContent(event)
})
