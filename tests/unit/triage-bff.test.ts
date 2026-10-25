import type { H3Event } from 'h3'
import { z } from 'zod'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// server/utils/triage.ts relies on Nitro auto-imports. They are stubbed as globals here so the
// logic runs without the Nuxt runtime; `$fetch` is the only network boundary and it is a spy.
const TICKET_ID = '3f0c2a8e-6a55-4a5e-9a3c-0d1f6f1d2b10'

const faultClass = { taxonomyCode: 'PWR.OVERCURRENT', component: 'power-electronics', severity: 'major', requiresSiteVisit: true }
const summary = {
  id: TICKET_ID,
  faultId: '9b1d7c0a-1d2e-4c7b-8f3a-5e6d7c8b9a01',
  stationId: 'st-003',
  state: 'draft',
  taxonomyCode: 'PWR.OVERCURRENT',
  probableCause: 'Overcurrent on the power stage.',
  suggestedAction: 'Inspect the contactor.',
  requiresSiteVisit: true,
  confidence: 0.9,
  provider: 'rules',
  rejectReason: null,
  createdAt: '2026-10-25T10:00:00.000Z',
  decidedAt: null,
  decidedBy: null,
  fault: faultClass,
}
const detail = {
  ...summary,
  fault: {
    ...faultClass,
    id: summary.faultId,
    stationId: 'st-003',
    connectorId: 1,
    ocppErrorCode: 'OverCurrentFailure',
    vendorId: 'voltreon',
    vendorErrorCode: 'E-117',
    source: 'vendor-table',
    occurredAt: '2026-10-25T09:59:58.000Z',
    receivedAt: '2026-10-25T10:00:00.000Z',
  },
  audit: [
    {
      id: '6a1f0c52-3d77-4f0e-bb2e-2f9d8a0c1e11',
      ticketId: TICKET_ID,
      action: 'draft-created',
      actor: 'agent:rules',
      before: null,
      after: { state: 'draft' },
      at: '2026-10-25T10:00:00.000Z',
    },
  ],
}

class StubError extends Error {
  statusCode: number
  statusMessage: string
  data?: unknown
  constructor(options: { statusCode: number; statusMessage: string; data?: unknown }) {
    super(options.statusMessage)
    this.statusCode = options.statusCode
    this.statusMessage = options.statusMessage
    this.data = options.data
  }
}

const fetchSpy = vi.fn()
const fetchLegacySpy = vi.fn()
let event: H3Event

const session = () => fetchLegacySpy.mockResolvedValue({ data: { name: 'Demo Operator', role: 'operator' } })
const noSession = () => fetchLegacySpy.mockRejectedValue(new StubError({ statusCode: 401, statusMessage: 'Not authenticated' }))
const gql = (extensions: Record<string, unknown>, message = 'nope') => ({ errors: [{ message, extensions }] })

const load = async () => await import('../../server/utils/triage')

const rejection = async (promise: Promise<unknown>): Promise<StubError> => {
  try {
    await promise
  } catch (error) {
    return error as StubError
  }
  throw new Error('expected the call to reject')
}

beforeEach(() => {
  fetchSpy.mockReset()
  fetchLegacySpy.mockReset()
  event = { context: {} } as H3Event
  vi.stubGlobal('$fetch', fetchSpy)
  vi.stubGlobal('fetchLegacy', fetchLegacySpy)
  vi.stubGlobal('createError', (options: { statusCode: number; statusMessage: string; data?: unknown }) => new StubError(options))
  vi.stubGlobal('useRuntimeConfig', () => ({ triageOrigin: 'http://triage.test:4100', triageInternalToken: 'synthetic-test-token' }))
  session()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchTriage', () => {
  const schema = z.object({ health: z.object({ status: z.string() }) })

  it('posts query and variables to /graphql with the internal token and the session actor', async () => {
    fetchSpy.mockResolvedValue({ data: { health: { status: 'ok' } } })
    const { fetchTriage } = await load()

    const data = await fetchTriage(event, 'query { health { status } }', { a: 1 }, schema)

    expect(data).toEqual({ health: { status: 'ok' } })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, options] = fetchSpy.mock.calls[0]
    expect(url).toBe('http://triage.test:4100/graphql')
    expect(options.method).toBe('POST')
    expect(options.body).toEqual({ query: 'query { health { status } }', variables: { a: 1 } })
    expect(options.headers['x-internal-token']).toBe('synthetic-test-token')
    expect(options.headers['x-actor']).toBe('Demo Operator')
  })

  it('resolves the actor from the session via the legacy owner of the cookie', async () => {
    fetchSpy.mockResolvedValue({ data: { health: { status: 'ok' } } })
    const { fetchTriage } = await load()
    await fetchTriage(event, 'query { health { status } }', {}, schema)
    expect(fetchLegacySpy.mock.calls[0][1]).toBe('/api/v1/me')
  })

  it('answers 401 without calling the service when there is no session', async () => {
    noSession()
    const { fetchTriage } = await load()
    const error = await rejection(fetchTriage(event, 'query { health { status } }', {}, schema))
    expect(error.statusCode).toBe(401)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('answers 502 when the session owner is down', async () => {
    fetchLegacySpy.mockRejectedValue(new StubError({ statusCode: 502, statusMessage: 'Legacy backend unreachable' }))
    const { fetchTriage } = await load()
    const error = await rejection(fetchTriage(event, 'query { health { status } }', {}, schema))
    expect(error.statusCode).toBe(502)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it.each([
    ['FORBIDDEN', 403],
    ['TICKET_NOT_FOUND', 404],
    ['TICKET_ALREADY_DECIDED', 409],
    ['UNAUTHENTICATED', 502],
    ['GRAPHQL_VALIDATION_FAILED', 502],
    ['INTERNAL_SERVER_ERROR', 502],
    ['SOMETHING_NEW', 502],
  ])('maps the service code %s to %i', async (code, status) => {
    fetchSpy.mockResolvedValue(gql({ code }))
    const { fetchTriage } = await load()
    const error = await rejection(fetchTriage(event, 'query { health { status } }', {}, schema))
    expect(error.statusCode).toBe(status)
  })

  it('maps an error without extensions to 502', async () => {
    fetchSpy.mockResolvedValue({ errors: [{ message: 'boom' }] })
    const { fetchTriage } = await load()
    expect((await rejection(fetchTriage(event, 'q', {}, schema))).statusCode).toBe(502)
  })

  it('does not leak the service message in a 502', async () => {
    fetchSpy.mockResolvedValue(gql({ code: 'INTERNAL_SERVER_ERROR' }, 'relation "tickets" does not exist'))
    const { fetchTriage } = await load()
    const error = await rejection(fetchTriage(event, 'q', {}, schema))
    expect(JSON.stringify({ m: error.statusMessage, d: error.data })).not.toContain('relation')
  })

  it('maps BAD_USER_INPUT with issues to 422 and strips the input prefix from paths', async () => {
    fetchSpy.mockResolvedValue(
      gql({
        code: 'BAD_USER_INPUT',
        issues: [
          { path: 'input.probableCause', message: 'Too long', code: 'too_big' },
          { path: ['reason'], message: 'Too short', code: 'too_small' },
          { path: 'input', message: 'Nothing differs', code: 'no_change' },
        ],
      }),
    )
    const { fetchTriage } = await load()
    const error = await rejection(fetchTriage(event, 'q', {}, schema))
    expect(error.statusCode).toBe(422)
    expect(error.data).toEqual({
      error: 'validation',
      issues: [
        { path: 'probableCause', message: 'Too long', code: 'too_big' },
        { path: 'reason', message: 'Too short', code: 'too_small' },
        { path: '', message: 'Nothing differs', code: 'no_change' },
      ],
    })
  })

  it('maps BAD_USER_INPUT without usable issues to 502 (our bug, not the operator)', async () => {
    fetchSpy.mockResolvedValue(gql({ code: 'BAD_USER_INPUT' }))
    const { fetchTriage } = await load()
    expect((await rejection(fetchTriage(event, 'q', {}, schema))).statusCode).toBe(502)

    fetchSpy.mockResolvedValue(gql({ code: 'BAD_USER_INPUT', issues: [{ nope: true }] }))
    expect((await rejection(fetchTriage(event, 'q', {}, schema))).statusCode).toBe(502)
  })

  it('reads GraphQL errors from a non-2xx response as well (Apollo validation answers 400)', async () => {
    fetchSpy.mockRejectedValue({ response: { status: 400, _data: gql({ code: 'GRAPHQL_VALIDATION_FAILED' }) } })
    const { fetchTriage } = await load()
    expect((await rejection(fetchTriage(event, 'q', {}, schema))).statusCode).toBe(502)

    fetchSpy.mockRejectedValue({ response: { status: 200, _data: gql({ code: 'FORBIDDEN' }) } })
    expect((await rejection(fetchTriage(event, 'q', {}, schema))).statusCode).toBe(403)
  })

  it('maps a network error or a non-JSON answer to 502', async () => {
    fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'))
    const { fetchTriage } = await load()
    expect((await rejection(fetchTriage(event, 'q', {}, schema))).statusCode).toBe(502)

    fetchSpy.mockRejectedValue({ response: { status: 502, _data: '<html>bad gateway</html>' } })
    expect((await rejection(fetchTriage(event, 'q', {}, schema))).statusCode).toBe(502)

    fetchSpy.mockResolvedValue('<html></html>')
    expect((await rejection(fetchTriage(event, 'q', {}, schema))).statusCode).toBe(502)
  })

  it('answers 502 "violates contract" when data does not match the schema', async () => {
    fetchSpy.mockResolvedValue({ data: { health: { status: 7 } } })
    const { fetchTriage } = await load()
    const error = await rejection(fetchTriage(event, 'q', {}, schema))
    expect(error.statusCode).toBe(502)
    expect(error.statusMessage).toBe('Triage response violates contract')
  })

  it('answers 502 when data is missing', async () => {
    fetchSpy.mockResolvedValue({})
    const { fetchTriage } = await load()
    expect((await rejection(fetchTriage(event, 'q', {}, schema))).statusMessage).toBe('Triage response violates contract')
  })

  it('does not retry (a repeated mutation must not run twice)', async () => {
    fetchSpy.mockResolvedValue({ data: { health: { status: 'ok' } } })
    const { fetchTriage } = await load()
    await fetchTriage(event, 'q', {}, schema)
    expect(fetchSpy.mock.calls[0][1].retry).toBe(0)
  })
})

describe('fetchTriage actor cache', () => {
  it('asks the session owner once per request', async () => {
    fetchSpy.mockResolvedValue({ data: { health: { status: 'ok' } } })
    const { fetchTriage } = await load()
    const schema = z.object({ health: z.object({ status: z.string() }) })
    await fetchTriage(event, 'q', {}, schema)
    await fetchTriage(event, 'q', {}, schema)
    expect(fetchLegacySpy).toHaveBeenCalledTimes(1)
  })
})

describe('listTickets', () => {
  it('queries all tickets and returns the list envelope', async () => {
    fetchSpy.mockResolvedValue({ data: { tickets: [summary] } })
    const { listTickets } = await load()
    const result = await listTickets(event, undefined)
    expect(result).toEqual({ data: [summary] })
    expect(fetchSpy.mock.calls[0][1].body.variables).toEqual({})
  })

  it('passes a valid state filter on', async () => {
    fetchSpy.mockResolvedValue({ data: { tickets: [] } })
    const { listTickets } = await load()
    await listTickets(event, 'draft')
    expect(fetchSpy.mock.calls[0][1].body.variables).toEqual({ state: 'draft' })
  })

  it('answers 422 for an unknown state without calling the service', async () => {
    const { listTickets } = await load()
    const error = await rejection(listTickets(event, 'archived'))
    expect(error.statusCode).toBe(422)
    expect(error.data).toMatchObject({ error: 'validation', issues: [{ path: 'state' }] })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('answers 502 when the service returns a ticket that breaks the contract', async () => {
    fetchSpy.mockResolvedValue({ data: { tickets: [{ ...summary, confidence: 7 }] } })
    const { listTickets } = await load()
    expect((await rejection(listTickets(event, undefined))).statusCode).toBe(502)
  })
})

describe('getTicket', () => {
  it('returns the detail envelope', async () => {
    fetchSpy.mockResolvedValue({ data: { ticket: detail } })
    const { getTicket } = await load()
    expect(await getTicket(event, TICKET_ID)).toEqual({ data: detail })
    expect(fetchSpy.mock.calls[0][1].body.variables).toEqual({ id: TICKET_ID })
  })

  it('answers 404 when the service returns null', async () => {
    fetchSpy.mockResolvedValue({ data: { ticket: null } })
    const { getTicket } = await load()
    expect((await rejection(getTicket(event, TICKET_ID))).statusCode).toBe(404)
  })

  it('answers 404 for an id that is not a UUID without calling the service', async () => {
    const { getTicket } = await load()
    expect((await rejection(getTicket(event, '1; drop table'))).statusCode).toBe(404)
    expect((await rejection(getTicket(event, ''))).statusCode).toBe(404)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('answers 502 when the audit array is missing', async () => {
    const { audit: _audit, ...withoutAudit } = detail
    fetchSpy.mockResolvedValue({ data: { ticket: withoutAudit } })
    const { getTicket } = await load()
    expect((await rejection(getTicket(event, TICKET_ID))).statusCode).toBe(502)
  })
})

describe('decideTicket', () => {
  const decided = { ...detail, state: 'approved', decidedBy: 'Demo Operator', decidedAt: '2026-10-25T11:00:00.000Z' }

  it('approves: runs approveTicket with the id only', async () => {
    fetchSpy.mockResolvedValue({ data: { approveTicket: decided } })
    const { decideTicket } = await load()

    const result = await decideTicket(event, TICKET_ID, { action: 'approve' })

    expect(result).toEqual({ data: decided })
    const { query, variables } = fetchSpy.mock.calls[0][1].body
    expect(query).toContain('approveTicket')
    expect(variables).toEqual({ id: TICKET_ID })
  })

  it('edits: sends only the changed fields as input', async () => {
    fetchSpy.mockResolvedValue({ data: { editTicket: { ...decided, state: 'edited' } } })
    const { decideTicket } = await load()

    await decideTicket(event, TICKET_ID, { action: 'edit', probableCause: ' Loose terminal. ', requiresSiteVisit: false })

    const { query, variables } = fetchSpy.mock.calls[0][1].body
    expect(query).toContain('editTicket')
    expect(variables).toEqual({ id: TICKET_ID, input: { probableCause: 'Loose terminal.', requiresSiteVisit: false } })
  })

  it('rejects: sends the trimmed reason', async () => {
    fetchSpy.mockResolvedValue({ data: { rejectTicket: { ...decided, state: 'rejected', rejectReason: 'Duplicate' } } })
    const { decideTicket } = await load()

    await decideTicket(event, TICKET_ID, { action: 'reject', reason: '  Duplicate  ' })

    const { query, variables } = fetchSpy.mock.calls[0][1].body
    expect(query).toContain('rejectTicket')
    expect(variables).toEqual({ id: TICKET_ID, reason: 'Duplicate' })
  })

  it('takes the actor from the session, never from the body', async () => {
    const { decideTicket } = await load()

    // An actor in the body is an unknown key: refused before any upstream call.
    const error = await rejection(decideTicket(event, TICKET_ID, { action: 'approve', actor: 'Mallory' }))
    expect(error.statusCode).toBe(422)
    expect(fetchSpy).not.toHaveBeenCalled()

    // A valid decision carries the session user and nothing else in the variables.
    fetchSpy.mockResolvedValue({ data: { approveTicket: decided } })
    await decideTicket(event, TICKET_ID, { action: 'approve' })
    const [, options] = fetchSpy.mock.calls[0]
    expect(options.headers['x-actor']).toBe('Demo Operator')
    expect(JSON.stringify(options.body)).not.toContain('Mallory')
    expect(Object.keys(options.body.variables)).toEqual(['id'])
  })

  it.each([
    ['an empty edit', { action: 'edit' }],
    ['a reject without reason', { action: 'reject' }],
    ['a too-short reason', { action: 'reject', reason: 'no' }],
    ['an unknown action', { action: 'escalate' }],
    ['a missing body', undefined],
    ['a non-object body', 'approve'],
  ])('answers 422 with issues for %s and does not call the service', async (_label, body) => {
    const { decideTicket } = await load()
    const error = await rejection(decideTicket(event, TICKET_ID, body))
    expect(error.statusCode).toBe(422)
    expect(error.data).toMatchObject({ error: 'validation' })
    expect((error.data as { issues: unknown[] }).issues.length).toBeGreaterThan(0)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(fetchLegacySpy).not.toHaveBeenCalled()
  })

  it('names the invalid field in the 422 issues', async () => {
    const { decideTicket } = await load()
    const error = await rejection(decideTicket(event, TICKET_ID, { action: 'reject', reason: 'no' }))
    expect((error.data as { issues: { path: string }[] }).issues.map((issue) => issue.path)).toContain('reason')
  })

  it('answers 404 for an id that is not a UUID without calling the service', async () => {
    const { decideTicket } = await load()
    expect((await rejection(decideTicket(event, 'nope', { action: 'approve' }))).statusCode).toBe(404)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('answers 401 without a session and does not call the service', async () => {
    noSession()
    const { decideTicket } = await load()
    expect((await rejection(decideTicket(event, TICKET_ID, { action: 'approve' }))).statusCode).toBe(401)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it.each([
    ['TICKET_ALREADY_DECIDED', 409],
    ['TICKET_NOT_FOUND', 404],
    ['FORBIDDEN', 403],
  ])('passes the service answer %s on as %i', async (code, status) => {
    fetchSpy.mockResolvedValue(gql({ code }))
    const { decideTicket } = await load()
    expect((await rejection(decideTicket(event, TICKET_ID, { action: 'approve' }))).statusCode).toBe(status)
  })

  it('passes a service-side validation failure on as 422 with the BFF field names', async () => {
    fetchSpy.mockResolvedValue(gql({ code: 'BAD_USER_INPUT', issues: [{ path: 'input', message: 'Nothing differs', code: 'no_change' }] }))
    const { decideTicket } = await load()
    const error = await rejection(decideTicket(event, TICKET_ID, { action: 'edit', probableCause: 'Same as before' }))
    expect(error.statusCode).toBe(422)
    expect(error.data).toMatchObject({ error: 'validation', issues: [{ code: 'no_change' }] })
  })

  it('answers 502 when the returned ticket breaks the contract', async () => {
    fetchSpy.mockResolvedValue({ data: { approveTicket: { ...decided, state: 'archived' } } })
    const { decideTicket } = await load()
    expect((await rejection(decideTicket(event, TICKET_ID, { action: 'approve' }))).statusCode).toBe(502)
  })
})

describe('readJsonBody', () => {
  const withHeader = (contentType: string | undefined, body: () => Promise<unknown>) => {
    vi.stubGlobal('getRequestHeader', () => contentType)
    vi.stubGlobal('readBody', body)
  }

  it('reads an application/json body (with or without charset)', async () => {
    const { readJsonBody } = await load()
    withHeader('application/json', async () => ({ action: 'approve' }))
    expect(await readJsonBody(event)).toEqual({ action: 'approve' })
    withHeader('application/json; charset=utf-8', async () => ({ action: 'approve' }))
    expect(await readJsonBody(event)).toEqual({ action: 'approve' })
  })

  it.each(['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x', 'application/jsonp', undefined])(
    'answers 415 for content type %s without reading the body',
    async (contentType) => {
      const read = vi.fn()
      withHeader(contentType, read)
      const { readJsonBody } = await load()
      expect((await rejection(readJsonBody(event))).statusCode).toBe(415)
      expect(read).not.toHaveBeenCalled()
    },
  )

  it('hands unparseable JSON on as undefined (the schema then answers 422)', async () => {
    withHeader('application/json', async () => {
      throw new Error('Invalid JSON')
    })
    const { readJsonBody } = await load()
    expect(await readJsonBody(event)).toBeUndefined()
  })
})
