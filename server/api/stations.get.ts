import { stationListResponseSchema } from '#shared/contracts/station'

// BFF endpoint: legacy stations, contract-checked.
export default defineEventHandler(async (event) => (await fetchLegacy(event, '/api/v1/stations', stationListResponseSchema)).data)
