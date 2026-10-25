// BFF endpoint: approve, edit or reject a draft ticket. The operator is the session user, never a
// field of the body. Returns the updated ticket with its audit trail.
export default defineEventHandler(async (event) =>
  decideTicket(event, getRouterParam(event, 'id') ?? '', await readJsonBody(event)),
)
