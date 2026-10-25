import { randomUUID } from 'node:crypto'
import { ALL_FIXTURES } from '@charge-portal/fault-taxonomy'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { AuditService } from '../../src/audit/audit.service'
import { integrationEnv, resetDatabase, withClient } from './setup'

const { databaseUrl, internalToken } = integrationEnv()

let app: INestApplication
let url: string
let auditService: AuditService

interface GraphQLBody {
  data?: Record<string, any> | null // eslint-disable-line @typescript-eslint/no-explicit-any -- test helper over untyped JSON
  errors?: { message: string; extensions?: { code?: string; issues?: { path: (string | number)[]; message: string }[] } }[]
}

async function gql(query: string, variables: Record<string, unknown> = {}): Promise<GraphQLBody> {
  const response = await fetch(`${url}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal-token': internalToken, 'x-actor': 'ops@example.test' },
    body: JSON.stringify({ query, variables }),
  })
  return (await response.json()) as GraphQLBody
}

const TICKET_FIELDS = `
  id state faultId stationId taxonomyCode probableCause suggestedAction requiresSiteVisit confidence provider
  rejectReason createdAt decidedAt decidedBy
  fault { id stationId connectorId ocppErrorCode vendorId vendorErrorCode taxonomyCode component severity
          requiresSiteVisit source raw occurredAt receivedAt }
  audit { id ticketId action actor before after at }`

const INGEST = `mutation Ingest($n: JSON!) { ingestFault(notification: $n) { ignored ticket { ${TICKET_FIELDS} } } }`

async function ingest(notification: unknown) {
  const body = await gql(INGEST, { n: notification })
  expect(body.errors).toBeUndefined()
  return body.data!.ingestFault as { ignored: boolean; ticket: Record<string, any> | null } // eslint-disable-line @typescript-eslint/no-explicit-any
}

async function counts() {
  return withClient(databaseUrl, async (client) => {
    const read = async (table: string) => Number((await client.query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n)
    return { faults: await read('faults'), tickets: await read('tickets'), audit: await read('audit_entries') }
  })
}

beforeAll(async () => {
  await resetDatabase(databaseUrl)
  const { AppModule } = await import('../../src/app.module')
  const { AuditService: AuditServiceClass } = await import('../../src/audit/audit.service')
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
  app = moduleRef.createNestApplication()
  await app.init()
  await app.listen(0, '127.0.0.1')
  url = await app.getUrl()
  auditService = app.get(AuditServiceClass)
})

afterAll(async () => {
  await app?.close()
})

describe('migration', () => {
  it('creates the fault, ticket and audit tables with their foreign keys', async () => {
    await withClient(databaseUrl, async (client) => {
      const tables = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
      )
      expect(tables.rows.map((row: { table_name: string }) => row.table_name)).toEqual(
        expect.arrayContaining(['audit_entries', 'faults', 'tickets']),
      )
      const keys = await client.query(
        `SELECT conrelid::regclass::text AS from_table, confrelid::regclass::text AS to_table
           FROM pg_constraint WHERE contype = 'f' ORDER BY 1`,
      )
      expect(keys.rows).toEqual([
        { from_table: 'audit_entries', to_table: 'tickets' },
        { from_table: 'tickets', to_table: 'faults' },
      ])
    })
  })
})

describe('ingestFault', () => {
  it.each(ALL_FIXTURES.map((fixture) => [fixture.label, fixture] as const))(
    'drafts a ticket for %s',
    async (_label, fixture) => {
      const { ignored, ticket } = await ingest(fixture.notification)

      expect(ignored).toBe(false)
      expect(ticket).toMatchObject({
        state: 'draft',
        stationId: fixture.notification.stationId,
        taxonomyCode: fixture.expectedTaxonomyCode,
        provider: 'rules',
        rejectReason: null,
        decidedAt: null,
        decidedBy: null,
      })
      expect(ticket!.confidence).toBeGreaterThan(0)
      expect(ticket!.probableCause.length).toBeGreaterThan(0)
      expect(ticket!.suggestedAction.length).toBeGreaterThan(0)

      // The fault keeps the class and the raw codes, and is linked to the ticket.
      expect(ticket!.fault).toMatchObject({
        id: ticket!.faultId,
        stationId: fixture.notification.stationId,
        connectorId: fixture.notification.connectorId,
        ocppErrorCode: fixture.notification.errorCode,
        vendorId: fixture.notification.vendorId ?? null,
        vendorErrorCode: fixture.notification.vendorErrorCode ?? null,
        taxonomyCode: fixture.expectedTaxonomyCode,
        raw: fixture.notification,
        occurredAt: new Date(fixture.notification.timestamp).toISOString(),
      })
      expect(ticket!.requiresSiteVisit).toBe(ticket!.fault.requiresSiteVisit)

      // Exactly one audit entry: the agent's draft-created.
      expect(ticket!.audit).toHaveLength(1)
      expect(ticket!.audit[0]).toMatchObject({
        ticketId: ticket!.id,
        action: 'draft-created',
        actor: 'agent:rules',
        before: null,
        after: {
          state: 'draft',
          taxonomyCode: fixture.expectedTaxonomyCode,
          probableCause: ticket!.probableCause,
          suggestedAction: ticket!.suggestedAction,
          requiresSiteVisit: ticket!.requiresSiteVisit,
          confidence: ticket!.confidence,
          provider: 'rules',
        },
      })
    },
  )

  it('uses the confidence of the normalisation source', async () => {
    const result = await withClient(databaseUrl, (client) =>
      client.query(
        `SELECT f.source, t.confidence::float AS confidence FROM tickets t JOIN faults f ON f.id = t.fault_id
          GROUP BY f.source, t.confidence ORDER BY f.source`,
      ),
    )
    // The fixtures hit the vendor tables or end up unclassified; ocpp-default is covered below.
    expect(result.rows).toEqual([
      { source: 'unclassified', confidence: 0.3 },
      { source: 'vendor-table', confidence: 0.9 },
    ])
  })

  it('persisted one fault, one ticket and one audit entry per fixture', async () => {
    expect(await counts()).toEqual({ faults: ALL_FIXTURES.length, tickets: ALL_FIXTURES.length, audit: ALL_FIXTURES.length })
  })

  it('acknowledges a NoError notification without persisting anything', async () => {
    const before = await counts()
    const result = await ingest({
      stationId: 'st-001',
      connectorId: 1,
      errorCode: 'NoError',
      status: 'Available',
      timestamp: '2026-10-25T06:00:00Z',
    })
    expect(result).toEqual({ ignored: true, ticket: null })
    expect(await counts()).toEqual(before)
  })

  it.each([
    ['an unknown errorCode', { stationId: 'st-001', connectorId: 1, errorCode: 'Exploded', status: 'Faulted', timestamp: '2026-10-25T06:00:00Z' }],
    ['a missing stationId', { connectorId: 1, errorCode: 'OtherError', status: 'Faulted', timestamp: '2026-10-25T06:00:00Z' }],
    ['a string instead of an object', 'OtherError'],
  ])('rejects %s with BAD_USER_INPUT and persists nothing', async (_name, payload) => {
    const before = await counts()
    const body = await gql(INGEST, { n: payload })
    expect(body.errors).toHaveLength(1)
    expect(body.errors![0].extensions?.code).toBe('BAD_USER_INPUT')
    expect(body.errors![0].extensions?.issues?.length).toBeGreaterThan(0)
    expect(body.errors![0].extensions?.issues?.[0]).toEqual(
      expect.objectContaining({ path: expect.any(Array), message: expect.any(String) }),
    )
    expect(await counts()).toEqual(before)
  })

  it('rolls everything back when a later step of the transaction fails', async () => {
    const before = await counts()
    const spy = vi.spyOn(auditService, 'record').mockRejectedValueOnce(new Error('audit write failed'))
    const body = await gql(INGEST, { n: ALL_FIXTURES[0].notification })
    spy.mockRestore()
    expect(body.errors).toHaveLength(1)
    expect(await counts()).toEqual(before)
  })

  it('escalates the third occurrence of the same class on one station within 24 h', async () => {
    const notification = (timestamp: string) => ({
      stationId: 'st-recurrence-test',
      connectorId: 1,
      errorCode: 'WeakSignal',
      status: 'Faulted',
      timestamp,
    })
    const first = await ingest(notification('2026-10-26T06:00:00Z'))
    const second = await ingest(notification('2026-10-26T09:00:00Z'))
    const third = await ingest(notification('2026-10-26T12:00:00Z'))

    expect(first.ticket).toMatchObject({ taxonomyCode: 'COM.WEAK_SIGNAL', requiresSiteVisit: false, confidence: 0.6 })
    expect(second.ticket!.requiresSiteVisit).toBe(false)
    expect(third.ticket!.requiresSiteVisit).toBe(true)
    expect(third.ticket!.probableCause).toMatch(/recurr/i)
    // The fault itself is unchanged; only the draft escalated.
    expect(third.ticket!.fault.requiresSiteVisit).toBe(false)
    expect(third.ticket!.audit[0].after.requiresSiteVisit).toBe(true)

    // A fourth occurrence two days later is outside the window and not escalated.
    const later = await ingest(notification('2026-10-28T12:00:00Z'))
    expect(later.ticket!.requiresSiteVisit).toBe(false)
  })
})

describe('tickets and ticket queries', () => {
  it('lists tickets by state', async () => {
    const all = await gql(`{ tickets { id state } }`)
    expect(all.errors).toBeUndefined()
    const drafts = await gql(`{ tickets(state: draft) { id state } }`)
    expect(drafts.data!.tickets).toHaveLength(all.data!.tickets.length)
    for (const ticket of drafts.data!.tickets) expect(ticket.state).toBe('draft')
    const approved = await gql(`{ tickets(state: approved) { id } }`)
    expect(approved.data).toEqual({ tickets: [] })
  })

  it('rejects an unknown ticket state at the schema level', async () => {
    const body = await gql(`{ tickets(state: archived) { id } }`)
    expect(body.errors).toBeDefined()
  })

  it('returns a ticket with its fault and audit trail ordered by time', async () => {
    const { ticket } = await ingest({
      stationId: 'st-order-test',
      connectorId: 1,
      errorCode: 'GroundFailure',
      status: 'Faulted',
      timestamp: '2026-10-27T06:00:00Z',
    })
    // Rows a later package would write: one before the draft entry, one after it.
    await withClient(databaseUrl, async (client) => {
      const insert = `INSERT INTO audit_entries (id, ticket_id, action, actor, before, after, at)
                      VALUES ($1, $2, $3, $4, null, '{}'::jsonb, $5)`
      await client.query(insert, [randomUUID(), ticket!.id, 'edited', 'late@example.test', '2999-01-01T00:00:00Z'])
      await client.query(insert, [randomUUID(), ticket!.id, 'approved', 'early@example.test', '2000-01-01T00:00:00Z'])
    })

    const body = await gql(`query T($id: ID!) { ticket(id: $id) { ${TICKET_FIELDS} } }`, { id: ticket!.id })
    expect(body.errors).toBeUndefined()
    const loaded = body.data!.ticket
    expect(loaded.fault.id).toBe(ticket!.faultId)
    expect(loaded.audit.map((entry: { actor: string }) => entry.actor)).toEqual([
      'early@example.test',
      'agent:rules',
      'late@example.test',
    ])
  })

  it('returns null for an unknown ticket id', async () => {
    const body = await gql(`query T($id: ID!) { ticket(id: $id) { id } }`, { id: randomUUID() })
    expect(body).toEqual({ data: { ticket: null } })
  })

  it('rejects a malformed ticket id without a server error', async () => {
    const body = await gql(`{ ticket(id: "not-a-uuid") { id } }`)
    expect(body.data?.ticket ?? null).toBeNull()
  })
})
