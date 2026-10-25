// BFF endpoint: one ticket with its fault (raw codes + normalised class) and audit trail.
export default defineEventHandler((event) => getTicket(event, getRouterParam(event, 'id') ?? ''))
