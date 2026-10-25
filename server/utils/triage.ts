import type { H3Event } from 'h3'
import { z } from 'zod'
import { meResponseSchema } from '#shared/contracts/me'
import {
  mutationTicketDataSchema,
  stationStatesQueryDataSchema,
  type StationHealth,
  ticketDecisionInputSchema,
  ticketQueryDataSchema,
  ticketsQuerySchema,
  ticketsQueryDataSchema,
  toValidationError,
  type TicketDecisionInput,
  type TicketDetail,
  type TriageValidationError,
} from '#shared/contracts/triage'

// The only place where the triage service (GraphQL, ADR 0009) enters the app. Like fetchLegacy:
// the operator comes from the session, the answer is parsed with a contract, and an outage, an
// unexpected error or contract drift becomes a 502 at the edge. GraphQL never reaches the browser.

const TICKET_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TIMEOUT_MS = 10_000

const graphqlErrorSchema = z.looseObject({
  extensions: z.looseObject({ code: z.string().optional(), issues: z.unknown().optional() }).optional(),
})
const graphqlBodySchema = z.looseObject({ data: z.unknown().optional(), errors: z.array(graphqlErrorSchema).optional() })

// The service reports paths such as `input.probableCause` or ['reason']; the BFF body is flat, so
// `input` is dropped and the rest dotted.
const servicePathSchema = z.union([z.string(), z.array(z.union([z.string(), z.number()]))])
const serviceIssuesSchema = z
  .array(z.object({ path: servicePathSchema, message: z.string(), code: z.string() }))
  .min(1)

const bffPath = (path: z.infer<typeof servicePathSchema>): string => {
  const segments = (typeof path === 'string' ? path.split('.') : path.map(String)).filter((segment) => segment !== '')
  return (segments[0] === 'input' ? segments.slice(1) : segments).join('.')
}

const contractViolation = () => createError({ statusCode: 502, statusMessage: 'Triage response violates contract' })
const unreachable = () => createError({ statusCode: 502, statusMessage: 'Triage service unreachable' })
const validationFailed = (data: TriageValidationError) =>
  createError({ statusCode: 422, statusMessage: 'Validation failed', data })

const mapServiceError = (error: z.infer<typeof graphqlErrorSchema>) => {
  const code = error.extensions?.code
  if (code === 'FORBIDDEN') return createError({ statusCode: 403, statusMessage: 'Forbidden' })
  if (code === 'TICKET_NOT_FOUND') return createError({ statusCode: 404, statusMessage: 'Not found' })
  if (code === 'TICKET_ALREADY_DECIDED') return createError({ statusCode: 409, statusMessage: 'Ticket already decided' })
  if (code === 'BAD_USER_INPUT') {
    const issues = serviceIssuesSchema.safeParse(error.extensions?.issues)
    // Apollo also uses BAD_USER_INPUT for variables that do not coerce: our bug, not the operator's.
    if (issues.success) {
      return validationFailed({
        error: 'validation',
        issues: issues.data.map((issue) => ({ path: bffPath(issue.path), message: issue.message, code: issue.code })),
      })
    }
  }
  // UNAUTHENTICATED (wrong internal token), Apollo validation codes, INTERNAL_SERVER_ERROR, anything new.
  return unreachable()
}

// The operator id asserted to the service. Resolved once per request from the legacy session
// (the session owner); a missing session is a 401 before the service is called.
const sessionActor = async (event: H3Event): Promise<string> => {
  const context = event.context as { triageActor?: string }
  if (context.triageActor) return context.triageActor
  const me = (await fetchLegacy(event, '/api/v1/me', meResponseSchema)).data
  context.triageActor = me.name
  return me.name
}

export const fetchTriage = async <T extends z.ZodType>(
  event: H3Event,
  query: string,
  variables: Record<string, unknown>,
  schema: T,
): Promise<z.infer<T>> => {
  const actor = await sessionActor(event)
  const { triageOrigin, triageInternalToken } = useRuntimeConfig()

  // Resolver errors arrive as 200 with `errors`; Apollo's own validation errors as 400 with the same
  // body. Both are read as GraphQL, anything else (network, HTML, timeout) is an outage.
  let body: unknown
  try {
    body = await $fetch<unknown>(`${triageOrigin}/graphql`, {
      method: 'POST',
      body: { query, variables },
      headers: { 'x-internal-token': triageInternalToken, 'x-actor': actor },
      retry: 0, // a mutation must never run twice behind the caller's back
      timeout: TIMEOUT_MS,
    })
  } catch (error) {
    body = (error as { response?: { _data?: unknown } }).response?._data
  }

  const response = graphqlBodySchema.safeParse(body)
  if (!response.success) throw unreachable()
  const [firstError] = response.data.errors ?? []
  if (firstError) throw mapServiceError(firstError)

  const parsed = schema.safeParse(response.data.data)
  if (!parsed.success) throw contractViolation()
  return parsed.data
}

const FAULT_CLASS_FIELDS = 'taxonomyCode component severity requiresSiteVisit'
const TICKET_FIELDS =
  'id faultId stationId state taxonomyCode probableCause suggestedAction requiresSiteVisit confidence provider rejectReason createdAt decidedAt decidedBy'
const FAULT_DETAIL_FIELDS = `id stationId connectorId ocppErrorCode vendorId vendorErrorCode source occurredAt receivedAt ${FAULT_CLASS_FIELDS}`
const DETAIL_FIELDS = `${TICKET_FIELDS} fault { ${FAULT_DETAIL_FIELDS} } audit { id ticketId action actor before after at }`

const TICKETS_QUERY = `query Tickets($state: TicketState) { tickets(state: $state) { ${TICKET_FIELDS} fault { ${FAULT_CLASS_FIELDS} } } }`
const TICKET_QUERY = `query Ticket($id: ID!) { ticket(id: $id) { ${DETAIL_FIELDS} } }`
const APPROVE_MUTATION = `mutation ApproveTicket($id: ID!) { approveTicket(id: $id) { ${DETAIL_FIELDS} } }`
const EDIT_MUTATION = `mutation EditTicket($id: ID!, $input: TicketEditInput!) { editTicket(id: $id, input: $input) { ${DETAIL_FIELDS} } }`
const REJECT_MUTATION = `mutation RejectTicket($id: ID!, $reason: String!) { rejectTicket(id: $id, reason: $reason) { ${DETAIL_FIELDS} } }`

const STATION_STATES_QUERY =
  'query StationStates { stationStates { stationId state lastSampleAt alerts { id stationId kind raisedAt } } }'

// Stations that need an operator first. Ties by station id keep the order stable between reloads.
const ATTENTION_ORDER: Record<StationHealth, number> = { 'needs-visit': 0, offline: 1, degraded: 2, ok: 3 }

/**
 * GET /api/triage/stations/state: the live health and active alerts of every station that reported,
 * most urgent first. Reading may record an idempotent `offline` alert in the service (WP-08).
 */
export const listStationStates = async (event: H3Event) => {
  const data = await fetchTriage(event, STATION_STATES_QUERY, {}, stationStatesQueryDataSchema)
  const sorted = [...data.stationStates].sort(
    (a, b) => ATTENTION_ORDER[a.state] - ATTENTION_ORDER[b.state] || a.stationId.localeCompare(b.stationId),
  )
  return { data: sorted }
}

const requireTicketId = (id: string): string => {
  if (!TICKET_ID.test(id)) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return id
}

/** GET /api/triage/tickets: `state` is the raw query-string value, if any. */
export const listTickets = async (event: H3Event, state: unknown) => {
  const query = ticketsQuerySchema.safeParse({ state })
  if (!query.success) throw validationFailed(toValidationError(query.error))
  const data = await fetchTriage(event, TICKETS_QUERY, query.data, ticketsQueryDataSchema)
  return { data: data.tickets }
}

/** GET /api/triage/tickets/:id */
export const getTicket = async (event: H3Event, id: string) => {
  const data = await fetchTriage(event, TICKET_QUERY, { id: requireTicketId(id) }, ticketQueryDataSchema)
  if (!data.ticket) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return { data: data.ticket }
}

const decisionRequest = (input: TicketDecisionInput) => {
  switch (input.action) {
    case 'approve':
      return { mutation: 'approveTicket', query: APPROVE_MUTATION, variables: {} } as const
    case 'edit': {
      const { action: _action, ...fields } = input
      return { mutation: 'editTicket', query: EDIT_MUTATION, variables: { input: fields } } as const
    }
    case 'reject':
      return { mutation: 'rejectTicket', query: REJECT_MUTATION, variables: { reason: input.reason } } as const
  }
}

/** POST /api/triage/tickets/:id/decision. The body is validated before anything else; the actor is the session user. */
export const decideTicket = async (event: H3Event, id: string, body: unknown) => {
  const input = ticketDecisionInputSchema.safeParse(body)
  if (!input.success) throw validationFailed(toValidationError(input.error))
  const request = decisionRequest(input.data)
  const variables = { id: requireTicketId(id), ...request.variables }
  const data: Record<string, TicketDetail> = await fetchTriage(event, request.query, variables, mutationTicketDataSchema(request.mutation))
  return { data: data[request.mutation] as TicketDetail }
}

/**
 * Body of a mutating triage route. Only `application/json` is read: a cross-site HTML form cannot
 * send that without a CORS preflight, so this backs up the session cookie's SameSite=Lax. Anything
 * else is 415 before the body is touched.
 */
export const readJsonBody = async (event: H3Event): Promise<unknown> => {
  if (!/^application\/json(\s*;|$)/i.test(getRequestHeader(event, 'content-type') ?? '')) {
    throw createError({ statusCode: 415, statusMessage: 'Send application/json' })
  }
  // Unparseable JSON is the caller's mistake: it reaches the decision schema as `undefined` (422).
  return await readBody(event).catch(() => undefined)
}
