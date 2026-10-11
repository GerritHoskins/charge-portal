import { stationListResponseSchema } from '#shared/contracts/station'

// BFF endpoint: fetches from the legacy backend and enforces the contract.
export default defineEventHandler(async () => {
  const { legacyOrigin } = useRuntimeConfig()

  const raw = await $fetch<unknown>(`${legacyOrigin}/api/v1/stations`).catch(() => {
    throw createError({ statusCode: 502, statusMessage: 'Legacy backend unreachable' })
  })

  const parsed = stationListResponseSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 502, statusMessage: 'Legacy response violates contract' })
  }
  return parsed.data.data
})
