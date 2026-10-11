import { sessionListResponseSchema } from '#shared/contracts/session'

// BFF endpoint: legacy charging sessions, contract-checked.
export default defineEventHandler(async (event) => (await fetchLegacy(event, '/api/v1/sessions', sessionListResponseSchema)).data)
