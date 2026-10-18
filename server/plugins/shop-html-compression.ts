import { getRequestHeader, getRequestURL, getResponseHeader, removeResponseHeader, setResponseHeader, setResponseStatus } from 'h3'
import { compressPublicShopHtml, mergeShopCacheVary } from '../utils/shop-html-compression'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event, response) => {
    const { pathname } = getRequestURL(event)
    if (pathname.startsWith('/shop/')) {
      // A pre-existing cache entry may not contain the new Vary token yet.
      setResponseHeader(event, 'vary', mergeShopCacheVary(getResponseHeader(event, 'vary')))
    }

    const compressed = compressPublicShopHtml({
      pathname,
      method: event.node.req.method ?? 'GET',
      statusCode: event.node.res.statusCode,
      contentType: getResponseHeader(event, 'content-type')?.toString(),
      contentEncoding: getResponseHeader(event, 'content-encoding')?.toString(),
      cacheControl: getResponseHeader(event, 'cache-control')?.toString(),
      etag: getResponseHeader(event, 'etag')?.toString(),
      range: getRequestHeader(event, 'range'),
      contentRange: getResponseHeader(event, 'content-range')?.toString(),
      acceptEncoding: getRequestHeader(event, 'accept-encoding'),
      body: response.body,
    })
    if (compressed === null) {
      response.body = Buffer.alloc(0)
      setResponseStatus(event, 406)
      setResponseHeader(event, 'cache-control', 'no-store')
      setResponseHeader(event, 'content-length', 0)
      removeResponseHeader(event, 'content-type')
      removeResponseHeader(event, 'content-encoding')
      removeResponseHeader(event, 'etag')
      removeResponseHeader(event, 'last-modified')
      return
    }
    if (!compressed) return

    response.body = compressed
    setResponseHeader(event, 'content-encoding', 'gzip')
    setResponseHeader(event, 'content-length', compressed.byteLength)
  })
})
