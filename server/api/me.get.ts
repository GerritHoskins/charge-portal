import { meResponseSchema } from '#shared/contracts/me'

// Who owns the forwarded legacy session cookie.
export default defineEventHandler(async (event) => (await fetchLegacy(event, '/api/v1/me', meResponseSchema)).data)
