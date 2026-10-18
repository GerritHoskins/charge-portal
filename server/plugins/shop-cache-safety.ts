import { getRequestURL, getResponseHeader, removeResponseHeader, setResponseHeader, splitCookiesString } from 'h3'
import { mergeShopCacheVary } from '../utils/shop-html-compression'

const cookieValues = (value: string | string[] | undefined) => value ? splitCookiesString(value) : []
const isLocaleCookie = (cookie: string) => cookie.trim().split(';', 1)[0]?.startsWith('i18n_locale=') ?? false

const cookieHeaderValue = (value: unknown): string | string[] | undefined => {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  return undefined
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const { pathname } = getRequestURL(event)
    if (pathname !== '/shop' && !pathname.startsWith('/shop/')) return

    // Conditional requests can end inside Nitro's cache before beforeResponse runs.
    setResponseHeader(event, 'vary', mergeShopCacheVary(getResponseHeader(event, 'vary')))
  })

  nitroApp.hooks.hook('render:response', (response, { event }) => {
    const { pathname } = getRequestURL(event)
    if (pathname !== '/shop' && !pathname.startsWith('/shop/')) return

    // Nitro's internal `varies` options do not emit an HTTP Vary header for intermediaries.
    const vary = mergeShopCacheVary(getResponseHeader(event, 'vary'), response.headers?.vary)
    setResponseHeader(event, 'vary', vary)
    response.headers ??= {}
    response.headers.vary = vary

    // Nitro 2.13.4 snapshots event.node.res headers after the render handler resolves.
    // Update the live response and rendered headers so the locale cookie is not captured.
    const liveCookies = cookieValues(cookieHeaderValue(getResponseHeader(event, 'set-cookie')))
    const renderedCookies = cookieValues(response.headers['set-cookie'])
    const liveHasLocale = liveCookies.some(isLocaleCookie)
    const renderedHasLocale = renderedCookies.some(isLocaleCookie)

    if (liveHasLocale || renderedHasLocale) {
      // Preserve all independent cookies as a Node header array; Set-Cookie cannot be
      // comma-folded safely because attributes such as Expires contain commas.
      const retained = [...new Set([...liveCookies, ...renderedCookies].filter(cookie => !isLocaleCookie(cookie)))]
      if (retained.length > 0) setResponseHeader(event, 'set-cookie', retained)
      else removeResponseHeader(event, 'set-cookie')

      // RenderResponse.headers only permits string values. Avoid letting the renderer
      // overwrite the correctly filtered Node array after this hook returns.
      delete response.headers['set-cookie']
    }
  })
})
