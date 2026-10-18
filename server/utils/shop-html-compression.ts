import { gzipSync } from 'node:zlib'

type CompressionInput = {
  pathname: string
  method: string
  statusCode: number
  contentType: string | undefined
  contentEncoding: string | undefined
  cacheControl: string | undefined
  etag: string | undefined
  range: string | undefined
  contentRange: string | undefined
  acceptEncoding: string | undefined
  body: unknown
}

const quality = (value: string | undefined) => {
  if (value === undefined) return undefined
  const normalized = value.trim()
  if (!/^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(normalized)) return 0
  return Number(normalized)
}

const parseEncodingQualities = (header: string | undefined) => {
  const qualities = new Map<string, number>()
  for (const item of (header ?? '').split(',')) {
    const [rawName, ...parameters] = item.trim().split(';')
    const name = rawName?.trim().toLowerCase()
    if (!name) continue
    const qParameter = parameters.find(parameter => /^\s*q\s*=/i.test(parameter))
    const qValue = qParameter?.split('=', 2)[1]
    qualities.set(name, quality(qValue) ?? 1)
  }
  return qualities
}

const encodingQualities = (header: string | undefined) => {
  const qualities = parseEncodingQualities(header)
  const wildcard = qualities.get('*')
  const gzip = qualities.get('gzip') ?? wildcard ?? 0
  const identity = qualities.has('identity')
    ? qualities.get('identity')!
    : wildcard === 0 ? 0 : 1
  return { gzip, identity }
}

export const acceptsGzip = (header: string | undefined) => {
  const { gzip, identity } = encodingQualities(header)
  return gzip > 0 && gzip >= identity
}

export const hasAcceptableShopHtmlEncoding = (header: string | undefined) => {
  const { gzip, identity } = encodingQualities(header)
  return gzip > 0 || identity > 0
}

export const mergeVary = (...values: unknown[]) => {
  const entries = values.flatMap((value) => {
    if (typeof value === 'string') return value.split(',')
    if (Array.isArray(value)) return value.flatMap(item => typeof item === 'string' ? item.split(',') : [])
    return []
  }).map(value => value.trim()).filter(Boolean)
  if (entries.some(value => value === '*')) return '*'

  const seen = new Set<string>()
  return entries.filter((value) => {
    const normalized = value.toLowerCase()
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  }).join(', ')
}

export const mergeShopCacheVary = (...values: unknown[]) =>
  mergeVary(...values, 'Cookie', 'Accept-Language', 'Host', 'X-Forwarded-Proto', 'Accept-Encoding')

export const compressPublicShopHtml = ({
  pathname,
  method,
  statusCode,
  contentType,
  contentEncoding,
  cacheControl,
  etag,
  range,
  contentRange,
  acceptEncoding,
  body,
}: CompressionInput): Buffer | undefined | null => {
  if (!pathname.startsWith('/shop/') || method.toUpperCase() !== 'GET') return undefined
  if (statusCode < 200 || statusCode >= 300 || statusCode === 204 || statusCode === 205 || statusCode === 206) return undefined
  if (contentType?.split(';', 1)[0]?.trim().toLowerCase() !== 'text/html') return undefined
  if (contentEncoding || /(?:^|,)\s*no-transform\s*(?:,|$)/i.test(cacheControl ?? '')) return undefined
  if (etag && !/^W\//i.test(etag)) return undefined
  if (range || contentRange) return undefined
  if (!hasAcceptableShopHtmlEncoding(acceptEncoding)) return null
  if (!acceptsGzip(acceptEncoding)) return undefined
  if (typeof body !== 'string' && !Buffer.isBuffer(body) && !(body instanceof Uint8Array)) return undefined

  const bytes = typeof body === 'string' ? Buffer.from(body) : Buffer.from(body)
  if (bytes.byteLength === 0) return undefined
  return gzipSync(bytes)
}
