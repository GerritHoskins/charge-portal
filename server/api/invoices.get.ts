import { invoiceListResponseSchema } from '#shared/contracts/invoice'

// BFF endpoint: legacy invoices, contract-checked.
export default defineEventHandler(async (event) => (await fetchLegacy(event, '/api/v1/invoices', invoiceListResponseSchema)).data)
