import { disputeInputSchema, disputeResponseSchema } from '#shared/contracts/invoice'

// BFF endpoint: validates the form input with the shared schema, then asks
// legacy (the authority) to record the dispute.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  if (!/^[A-Za-z0-9-]+$/.test(id)) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const input = disputeInputSchema.safeParse(await readBody(event))
  if (!input.success) {
    const fields = Object.fromEntries(input.error.issues.map((i) => [String(i.path[0]), i.message]))
    throw createError({ statusCode: 422, statusMessage: 'Validation failed', data: { error: 'validation', fields } })
  }

  setResponseStatus(event, 201)
  return (await fetchLegacy(event, `/api/v1/invoices/${id}/disputes`, disputeResponseSchema, { method: 'POST', body: input.data })).data
})
