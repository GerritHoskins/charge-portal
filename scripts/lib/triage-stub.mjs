import { createServer } from 'node:http'

// A minimal stand-in for the triage service (GraphQL) for scripts that need the triage pages to render
// without Postgres and without the real service, e.g. the route budget measurement. It answers the two
// read queries of the BFF (server/utils/triage.ts) with one synthetic draft ticket and a synthetic live
// state for the five demo stations (WP-09: the stations page is measured with its alert region on screen);
// a unit test checks that its answers parse with the BFF contracts. It is not used by the E2E suite, which runs the real service.

export const STUB_TICKET_ID = '3f0c2a8e-6a55-4a5e-9a3c-0d1f6f1d2b10'

const faultClass = { taxonomyCode: 'CON.LOCK_FAILURE', component: 'connector', severity: 'major', requiresSiteVisit: true }

const summary = {
  id: STUB_TICKET_ID,
  faultId: '9b1d7c0a-1d2e-4c7b-8f3a-5e6d7c8b9a01',
  stationId: 'st-003',
  state: 'draft',
  taxonomyCode: 'CON.LOCK_FAILURE',
  probableCause: 'The lock motor of the connector is stalled.',
  suggestedAction: 'Check the lock mechanism and replace it if it is worn.',
  requiresSiteVisit: true,
  confidence: 0.9,
  provider: 'rules',
  rejectReason: null,
  createdAt: '2026-10-25T06:12:04.000Z',
  decidedAt: null,
  decidedBy: null,
}

const detail = {
  ...summary,
  fault: {
    ...faultClass,
    id: summary.faultId,
    stationId: 'st-003',
    connectorId: 1,
    ocppErrorCode: 'OtherError',
    vendorId: 'voltreon',
    vendorErrorCode: '1012',
    source: 'vendor-table',
    occurredAt: '2026-10-25T06:12:03.000Z',
    receivedAt: '2026-10-25T06:12:04.000Z',
  },
  audit: [
    {
      id: '5c2f6e1a-7b3d-4e8a-9f10-2a4b6c8d0e12',
      ticketId: STUB_TICKET_ID,
      action: 'draft-created',
      actor: 'agent:rules',
      before: null,
      after: { state: 'draft' },
      at: '2026-10-25T06:12:04.000Z',
    },
  ],
}

// Wire dialect of the real service: the state is `needs_visit`, timestamps are ISO strings.
const sampledAt = '2026-10-25T06:12:03.000Z'
const stationAlert = (id, stationId, kind) => ({ id, stationId, kind, raisedAt: sampledAt })
const stationStates = [
  { stationId: 'st-001', state: 'ok', lastSampleAt: sampledAt, alerts: [] },
  {
    stationId: 'st-002',
    state: 'degraded',
    lastSampleAt: sampledAt,
    alerts: [stationAlert('a1b2c3d4-0001-4a5b-8c6d-7e8f9a0b1c2d', 'st-002', 'high_temperature')],
  },
  {
    stationId: 'st-003',
    state: 'needs_visit',
    lastSampleAt: sampledAt,
    alerts: [stationAlert('a1b2c3d4-0002-4a5b-8c6d-7e8f9a0b1c2d', 'st-003', 'site_visit_fault')],
  },
  { stationId: 'st-004', state: 'ok', lastSampleAt: sampledAt, alerts: [] },
  {
    stationId: 'st-005',
    state: 'offline',
    lastSampleAt: sampledAt,
    alerts: [stationAlert('a1b2c3d4-0003-4a5b-8c6d-7e8f9a0b1c2d', 'st-005', 'offline')],
  },
]

const readJson = (request) =>
  new Promise((resolve) => {
    let text = ''
    request.on('data', (chunk) => (text += chunk))
    request.on('end', () => {
      try {
        resolve(JSON.parse(text))
      } catch {
        resolve(undefined)
      }
    })
  })

const respond = (response, status, body) => {
  response.writeHead(status, { 'content-type': 'application/json' })
  response.end(JSON.stringify(body))
}

const answer = ({ query, variables }) => {
  if (typeof query !== 'string') return { errors: [{ message: 'Bad request' }] }
  if (/\bstationStates\b/.test(query)) return { data: { stationStates } }
  if (/\btickets\s*\(/.test(query)) {
    const state = variables?.state
    return { data: { tickets: !state || state === 'draft' ? [{ ...summary, fault: faultClass }] : [] } }
  }
  if (/\bticket\s*\(/.test(query)) return { data: { ticket: variables?.id === STUB_TICKET_ID ? detail : null } }
  return { errors: [{ message: 'The triage stub only answers the read queries' }] }
}

/** Starts the stub on a free loopback port. Resolves with its origin and a `close` function. */
export const startTriageStub = () =>
  new Promise((resolve, reject) => {
    const server = createServer(async (request, response) => {
      if (request.method !== 'POST' || request.url !== '/graphql') return respond(response, 404, { errors: [{ message: 'Not found' }] })
      const body = await readJson(request)
      if (!body || typeof body !== 'object') return respond(response, 400, { errors: [{ message: 'Bad request' }] })
      return respond(response, 200, answer(body))
    })
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({
        origin: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(() => done())),
      })
    })
  })
