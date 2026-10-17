import { shopListingQuerySchema, storeApiProductListingSchema, toShopListing } from '#shared/contracts/catalog'

const connectorValues = {
  type2: 'Typ 2',
  ccs: 'CCS',
  card: 'Ladekarte',
} as const

export default defineEventHandler(async (event) => {
  const query = shopListingQuerySchema.safeParse(getQuery(event))
  if (!query.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid shop listing query' })
  }

  const category = getRouterParam(event, 'category')
  if (!category) {
    throw createError({ statusCode: 400, statusMessage: 'Category is required' })
  }

  const { storeApiAccessKey } = useRuntimeConfig(event)
  const { page, limit, order, minPower, connector } = query.data
  const listing = await fetchLegacy(event, `/store-api/product-listing/${encodeURIComponent(category)}`, storeApiProductListingSchema, {
    method: 'POST',
    body: {
      page,
      limit,
      order,
      ...(minPower === undefined ? {} : { 'min-power': minPower }),
      ...(connector === undefined ? {} : { connector: connectorValues[connector] }),
    },
    forwardCookie: false,
    headers: { 'sw-access-key': storeApiAccessKey },
  })

  return toShopListing(listing)
})
