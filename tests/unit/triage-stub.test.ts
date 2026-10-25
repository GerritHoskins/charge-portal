// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ticketQueryDataSchema, ticketsQueryDataSchema } from '#shared/contracts/triage'

// @ts-expect-error The route-budget helpers are intentionally plain Node.js modules.
import { STUB_TICKET_ID, startTriageStub } from '../../scripts/lib/triage-stub.mjs'
// @ts-expect-error The route-budget helpers are intentionally plain Node.js modules.
import { REQUIRED_ROUTES } from '../../scripts/lib/route-budget.mjs'

// The budget script measures the triage pages against this stand-in, so a measurement never depends on
// a running triage service. Its answers must be valid for the BFF, or the pages would render the error state.
let stub: { origin: string; close: () => Promise<void> }

beforeAll(async () => {
  stub = await startTriageStub()
})
afterAll(() => stub.close())

const ask = async (query: string, variables: Record<string, unknown> = {}) => {
  const response = await fetch(`${stub.origin}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  return { status: response.status, body: (await response.json()) as { data?: unknown; errors?: unknown[] } }
}

describe('triage stub for the route budget', () => {
  it('answers the queue query with a ticket list the BFF contract accepts', async () => {
    const { status, body } = await ask('query Tickets($state: TicketState) { tickets(state: $state) { id } }', { state: 'draft' })
    expect(status).toBe(200)
    const parsed = ticketsQueryDataSchema.parse(body.data)
    expect(parsed.tickets.length).toBeGreaterThan(0)
    expect(parsed.tickets.every((ticket) => ticket.state === 'draft')).toBe(true)
  })

  it('answers the review query for the stub ticket with a detail the contract accepts', async () => {
    const { body } = await ask('query Ticket($id: ID!) { ticket(id: $id) { id } }', { id: STUB_TICKET_ID })
    const { ticket } = ticketQueryDataSchema.parse(body.data)
    expect(ticket?.id).toBe(STUB_TICKET_ID)
    expect(ticket?.audit.length).toBeGreaterThan(0)
  })

  it('knows no other ticket', async () => {
    const { body } = await ask('query Ticket($id: ID!) { ticket(id: $id) { id } }', { id: '00000000-0000-4000-8000-000000000000' })
    expect(ticketQueryDataSchema.parse(body.data).ticket).toBeNull()
  })

  it('refuses anything else as a GraphQL error', async () => {
    const { body } = await ask('mutation { approveTicket(id: "x") { id } }')
    expect(body.errors).toHaveLength(1)
  })

  it('answers 404 outside /graphql and 400 for a body that is not JSON', async () => {
    expect((await fetch(`${stub.origin}/other`)).status).toBe(404)
    const bad = await fetch(`${stub.origin}/graphql`, { method: 'POST', body: 'not json' })
    expect(bad.status).toBe(400)
  })
})

describe('required routes', () => {
  it('measure the queue and the stub ticket', () => {
    expect(REQUIRED_ROUTES).toContain('/portal/triage')
    expect(REQUIRED_ROUTES).toContain(`/portal/triage/${STUB_TICKET_ID}`)
  })
})
