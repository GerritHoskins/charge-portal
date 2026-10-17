const EXACT_PUBLIC_APIS = new Set([
  '/api/vitals',
  '/api/vitals/summary',
  '/api/events',
  '/api/events/funnel',
])

export function isPublicApi(pathname: string): boolean {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return false
  }

  if (decoded.split('/').some((segment) => segment === '.' || segment === '..')) return false
  if (EXACT_PUBLIC_APIS.has(pathname)) return true

  // The slash is deliberate: `/api/shop` stays private, as do similarly named APIs.
  return pathname.startsWith('/api/shop/')
}
