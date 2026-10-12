// Rollout / rollback switch (ADR 0005). Runs before the auth guard so a route that is rolled
// back is handled entirely by legacy, including its login redirect.
// Reports which backend served the request in `x-served-by` for dashboards and tests.
export default defineEventHandler(async (event) => {
  const { rollout, legacyOrigin } = useRuntimeConfig()
  const rules = parseRollout(rollout)
  if (!rules.length) return

  const url = getRequestURL(event)
  if (!url.pathname.startsWith('/portal')) return

  const key = getCookie(event, 'legacy_session') ?? ''
  event.context.rolloutLegacy = legacyPrefixesFor(rules, key)
  const toLegacy = routedToLegacy(url.pathname, rules, key)
  setResponseHeader(event, 'x-served-by', toLegacy ? 'legacy' : 'nuxt')

  // Only document loads are proxied; Nuxt's own payload/API requests are never rolled back.
  if (toLegacy && event.method === 'GET' && getRequestHeader(event, 'accept')?.includes('text/html')) {
    return proxyRequest(event, `${legacyOrigin}${url.pathname}${url.search}`, { fetchOptions: { redirect: 'manual' } })
  }
})
