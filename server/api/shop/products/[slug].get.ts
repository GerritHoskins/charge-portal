import { storeApiProductDetailSchema, toShopProduct } from '#shared/contracts/catalog'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Product slug is required' })
  }

  const { storeApiAccessKey } = useRuntimeConfig(event)
  const detail = await fetchLegacy(event, `/store-api/product/${encodeURIComponent(slug)}`, storeApiProductDetailSchema, {
    method: 'POST',
    forwardCookie: false,
    headers: { 'sw-access-key': storeApiAccessKey },
  })

  return toShopProduct(detail.product)
})
