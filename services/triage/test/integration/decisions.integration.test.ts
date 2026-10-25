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

const OPERATOR = 'ops@example.test'

async function gql(
  query: string,
  variables: Record<string, unknown> = {},
  headers: Record<string, string> = { 'x-actor': OPERATOR },
): Promise<GraphQLBody> {
  const response = await fetch(`${url}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal-token': internalToken, ...headers },
    body: JSON.stringify({ query, variables }),
  })
  return (await response.json()) as GraphQLBody
}

const TICKET_FIELDS = `
  id state faultId stationId taxonomyCode probableCause suggestedAction requiresSiteVisit confidence provider
  rejectReason createdAt decidedAt decidedBy
  audit { id ticketId action actor before after at }`

const APPROVE = `mutation M($id: ID!) { approveTicket(id: $id) { ${TICKET_FIELDS} } }`
const EDIT = `mutation M($id: ID!, $input: TicketEditInput!) { editTicket(id: $id, input: $input) { ${TICKET_FIELDS} } }`
const REJECT = `mutation M($id: ID!, $reason: String!) { rejectTicket(id: $id, reason: $reason) { ${TICKET_FIELDS} } }`

type Ticket = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any -- test helper over untyped JSON

/** Ingests one synthetic fault and returns its draft ticket. */
async function draftTicket(): Promise<Ticket> {
  const body = await gql(
    `mutation Ingest($n: JSON!) { ingestFault(notification: $n) { ticket { ${TICKET_FIELDS} } } }`,
    { n: { ...ALL_FIXTURES[0].notification, stationId: `st-dec-${randomUUID().slice(0, 8)}` } },
  )
  expect(body.errors).toBeUndefined()
  return body.data!.ingestFault.ticket
}

async function loadTicket(id: string): Promise<Ticket> {
  const body = await gql(`query T($id: ID!) { ticket(id: $id) { ${TICKET_FIELDS} } }`, { id })
  expect(body.errors).toBeUndefined()
  return body.data!.ticket
}

const approve = (id: string, headers?: Record<string, string>) => gql(APPROVE, { id }, headers)
const edit = (id: string, input: Record<string, unknown>) => gql(EDIT, { id, input })
const reject = (id: string, reason: string) => gql(REJECT, { id, reason })

async function auditCount(): Promise<number> {
  return withClient(databaseUrl, async (client) =>
    Number((await client.query('SELECT count(*) AS n FROM audit_entries')).rows[0].n),
  )
}

function codes(body: GraphQLBody): (string | undefined)[] {
  return (body.errors ?? []).map((error) => error.extensions?.code)
}

/** The ticket is exactly as drafted: still a draft with one draft-created entry. */
async function expectUntouchedDraft(draft: Ticket) {
  const current = await loadTicket(draft.id)
  expect(current).toEqual(draft)
  expect(current.audit).toHaveLength(1)
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

describe('approveTicket', () => {
  it('approves a draft, records the operator and appends one audit entry with before and after', async () => {
    const draft = await draftTicket()
    const body = await approve(draft.id)

    expect(body.errors).toBeUndefined()
    const ticket = body.data!.approveTicket
    expect(ticket).toMatchObject({
      id: draft.id,
      state: 'approved',
      decidedBy: OPERATOR,
      rejectReason: null,
      // The draft content is untouched.
      taxonomyCode: draft.taxonomyCode,
      probableCause: draft.probableCause,
      suggestedAction: draft.suggestedAction,
      requiresSiteVisit: draft.requiresSiteVisit,
      confidence: draft.confidence,
      provider: draft.provider,
    })
    expect(new Date(ticket.decidedAt).getTime()).toBeGreaterThan(new Date(draft.createdAt).getTime() - 1)

    expect(ticket.audit).toHaveLength(2)
    expect(ticket.audit[0].action).toBe('draft-created')
    expect(ticket.audit[1]).toMatchObject({
      ticketId: draft.id,
      action: 'approved',
      actor: OPERATOR,
      before: draft.audit[0].after,
      after: { ...draft.audit[0].after, state: 'approved' },
    })
    // The change is persisted, not only returned.
    expect(await loadTicket(draft.id)).toEqual(ticket)
  })

  it('takes the actor from x-actor and trims it', async () => {
    const draft = await draftTicket()
    const body = await approve(draft.id, { 'x-actor': '  padded@example.test  ' })
    expect(body.data!.approveTicket.decidedBy).toBe('padded@example.test')
    expect(body.data!.approveTicket.audit[1].actor).toBe('padded@example.test')
  })

  it('has no actor argument: a client cannot name the actor in the mutation', async () => {
    const draft = await draftTicket()
    const body = await gql(`mutation M($id: ID!) { approveTicket(id: $id, actor: "someone-else") { id } }`, { id: draft.id })
    expect(body.errors).toBeDefined()
    expect(body.data ?? null).toBeNull()
    await expectUntouchedDraft(draft)
  })
})

describe('missing actor', () => {
  it.each([
    ['no x-actor header', {}],
    ['a blank x-actor header', { 'x-actor': '   ' }],
  ])('every decision fails with FORBIDDEN and changes nothing: %s', async (_name, headers) => {
    const draft = await draftTicket()
    const entriesBefore = await auditCount()

    expect(codes(await approve(draft.id, headers))).toEqual(['FORBIDDEN'])
    expect(codes(await gql(EDIT, { id: draft.id, input: { requiresSiteVisit: false } }, headers))).toEqual(['FORBIDDEN'])
    expect(codes(await gql(REJECT, { id: draft.id, reason: 'Not a real fault' }, headers))).toEqual(['FORBIDDEN'])

    await expectUntouchedDraft(draft)
    expect(await auditCount()).toBe(entriesBefore)
  })

  it('still requires the internal token', async () => {
    const draft = await draftTicket()
    const response = await fetch(`${url}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-actor': OPERATOR },
      body: JSON.stringify({ query: APPROVE, variables: { id: draft.id } }),
    })
    const body = (await response.json()) as GraphQLBody
    expect(codes(body)).toEqual(['UNAUTHENTICATED'])
    await expectUntouchedDraft(draft)
  })
})

describe('editTicket', () => {
  it('edits some fields, leaves the others alone and records exactly the changed fields', async () => {
    const draft = await draftTicket()
    const newAction = 'Replace the contactor and re-test with a load bank.'
    const body = await edit(draft.id, { suggestedAction: `  ${newAction}  `, requiresSiteVisit: !draft.requiresSiteVisit })

    expect(body.errors).toBeUndefined()
    const ticket = body.data!.editTicket
    expect(ticket).toMatchObject({
      state: 'edited',
      decidedBy: OPERATOR,
      suggestedAction: newAction,
      requiresSiteVisit: !draft.requiresSiteVisit,
      // Not in the input: untouched.
      taxonomyCode: draft.taxonomyCode,
      probableCause: draft.probableCause,
      confidence: draft.confidence,
      provider: draft.provider,
      rejectReason: null,
    })
    expect(ticket.decidedAt).not.toBeNull()

    expect(ticket.audit).toHaveLength(2)
    expect(ticket.audit[1]).toMatchObject({
      action: 'edited',
      actor: OPERATOR,
      before: draft.audit[0].after,
      after: {
        ...draft.audit[0].after,
        state: 'edited',
        suggestedAction: newAction,
        requiresSiteVisit: !draft.requiresSiteVisit,
        changedFields: ['suggestedAction', 'requiresSiteVisit'],
      },
    })
    // The before snapshot never carries changedFields.
    expect(ticket.audit[1].before).not.toHaveProperty('changedFields')
    expect(await loadTicket(draft.id)).toEqual(ticket)
  })

  it('can change the taxonomy class and the cause', async () => {
    const draft = await draftTicket()
    const taxonomyCode = draft.taxonomyCode === 'UNCLASSIFIED' ? 'PWR.OVERCURRENT' : 'UNCLASSIFIED'
    const body = await edit(draft.id, { taxonomyCode, probableCause: 'Operator diagnosis.' })
    expect(body.data!.editTicket).toMatchObject({ state: 'edited', taxonomyCode, probableCause: 'Operator diagnosis.' })
    expect(body.data!.editTicket.audit[1].after.changedFields).toEqual(['probableCause', 'taxonomyCode'])
  })

  it('does not list a field whose submitted value equals the current one', async () => {
    const draft = await draftTicket()
    const body = await edit(draft.id, { probableCause: draft.probableCause, requiresSiteVisit: !draft.requiresSiteVisit })
    expect(body.errors).toBeUndefined()
    expect(body.data!.editTicket.audit[1].after.changedFields).toEqual(['requiresSiteVisit'])
  })

  it('refuses an edit that changes nothing and tells the operator to approve instead', async () => {
    const draft = await draftTicket()
    const body = await edit(draft.id, { probableCause: draft.probableCause, taxonomyCode: draft.taxonomyCode })
    expect(codes(body)).toEqual(['BAD_USER_INPUT'])
    expect(body.errors![0].message).toMatch(/approve/i)
    await expectUntouchedDraft(draft)
  })

  it.each([
    ['an empty input', {}],
    ['only nulls', { probableCause: null, suggestedAction: null }],
    ['a blank probableCause', { probableCause: '    ' }],
    ['an over-long suggestedAction', { suggestedAction: 'x'.repeat(2001) }],
    ['a taxonomyCode outside the taxonomy', { taxonomyCode: 'PWR.MADE_UP' }],
  ])('rejects %s with BAD_USER_INPUT and changes nothing', async (_name, input) => {
    const draft = await draftTicket()
    const entriesBefore = await auditCount()
    const body = await edit(draft.id, input)
    expect(codes(body)).toEqual(['BAD_USER_INPUT'])
    expect(body.errors![0].extensions!.issues!.length).toBeGreaterThan(0)
    // Issues name the field, never the submitted value.
    expect(JSON.stringify(body.errors)).not.toContain('PWR.MADE_UP')
    await expectUntouchedDraft(draft)
    expect(await auditCount()).toBe(entriesBefore)
  })

  it('rejects an unknown input field at the schema level', async () => {
    const draft = await draftTicket()
    const body = await edit(draft.id, { state: 'approved' })
    expect(body.errors).toBeDefined()
    await expectUntouchedDraft(draft)
  })
})

describe('rejectTicket', () => {
  it('rejects a draft with the trimmed reason and one audit entry', async () => {
    const draft = await draftTicket()
    const body = await reject(draft.id, '  Duplicate of an open ticket  ')

    expect(body.errors).toBeUndefined()
    const ticket = body.data!.rejectTicket
    expect(ticket).toMatchObject({
      state: 'rejected',
      rejectReason: 'Duplicate of an open ticket',
      decidedBy: OPERATOR,
      probableCause: draft.probableCause,
    })
    expect(ticket.decidedAt).not.toBeNull()
    expect(ticket.audit).toHaveLength(2)
    expect(ticket.audit[1]).toMatchObject({
      action: 'rejected',
      actor: OPERATOR,
      before: draft.audit[0].after,
      after: { ...draft.audit[0].after, state: 'rejected', rejectReason: 'Duplicate of an open ticket' },
    })
    expect(await loadTicket(draft.id)).toEqual(ticket)
  })

  it.each([
    ['empty', ''],
    ['whitespace only', '      '],
    ['two characters', 'ab'],
    ['501 characters', 'x'.repeat(501)],
  ])('rejects a %s reason with BAD_USER_INPUT, no state change and no audit entry', async (_name, reason) => {
    const draft = await draftTicket()
    const entriesBefore = await auditCount()
    const body = await reject(draft.id, reason)
    expect(codes(body)).toEqual(['BAD_USER_INPUT'])
    await expectUntouchedDraft(draft)
    expect(await auditCount()).toBe(entriesBefore)
  })

  it('requires a reason at the schema level', async () => {
    const draft = await draftTicket()
    const body = await gql(`mutation M($id: ID!) { rejectTicket(id: $id) { id } }`, { id: draft.id })
    expect(body.errors).toBeDefined()
    await expectUntouchedDraft(draft)
  })
})

describe('terminal states', () => {
  type Decision = 'approve' | 'edit' | 'reject'
  const decisions: Record<Decision, (id: string) => Promise<GraphQLBody>> = {
    approve: (id) => approve(id),
    edit: (id) => edit(id, { probableCause: 'A later correction.' }),
    reject: (id) => reject(id, 'A later change of mind'),
  }
  const finalState: Record<Decision, string> = { approve: 'approved', edit: 'edited', reject: 'rejected' }
  const names = Object.keys(decisions) as Decision[]
  const pairs = names.flatMap((first) => names.map((second) => [first, second] as const))

  it.each(pairs)('a ticket decided by %s refuses a later %s with TICKET_ALREADY_DECIDED', async (first, second) => {
    const draft = await draftTicket()
    expect((await decisions[first](draft.id)).errors).toBeUndefined()
    const decided = await loadTicket(draft.id)
    expect(decided.state).toBe(finalState[first])

    const body = await decisions[second](draft.id)
    expect(codes(body)).toEqual(['TICKET_ALREADY_DECIDED'])
    expect(body.errors![0].extensions).toMatchObject({ state: finalState[first] })

    // Nothing about the ticket or its trail changed.
    expect(await loadTicket(draft.id)).toEqual(decided)
    expect(decided.audit).toHaveLength(2)
  })
})

describe('unknown tickets', () => {
  it('answers an unknown id and a malformed id with TICKET_NOT_FOUND', async () => {
    for (const id of [randomUUID(), 'not-a-uuid']) {
      expect(codes(await approve(id))).toEqual(['TICKET_NOT_FOUND'])
      expect(codes(await edit(id, { requiresSiteVisit: true }))).toEqual(['TICKET_NOT_FOUND'])
      expect(codes(await reject(id, 'No such ticket'))).toEqual(['TICKET_NOT_FOUND'])
    }
  })
})

describe('concurrency', () => {
  it('lets exactly one of a concurrent approve and reject win, whatever the interleaving', async () => {
    for (let round = 0; round < 8; round += 1) {
      const draft = await draftTicket()
      const [approved, rejected] = await Promise.all([approve(draft.id), reject(draft.id, 'Concurrent rejection')])

      const succeeded = [approved, rejected].filter((body) => body.errors === undefined)
      const failed = [approved, rejected].filter((body) => body.errors !== undefined)
      expect(succeeded).toHaveLength(1)
      expect(failed).toHaveLength(1)
      expect(codes(failed[0])).toEqual(['TICKET_ALREADY_DECIDED'])

      const final = await loadTicket(draft.id)
      expect(final.state).toBe(approved.errors === undefined ? 'approved' : 'rejected')
      // The trail has the draft entry and exactly one decision, and it is the winner's.
      expect(final.audit.map((entry: { action: string }) => entry.action)).toEqual(['draft-created', final.state])
    }
  })

  it('applies one of several concurrent identical approvals', async () => {
    const draft = await draftTicket()
    const results = await Promise.all(Array.from({ length: 6 }, () => approve(draft.id)))
    expect(results.filter((body) => body.errors === undefined)).toHaveLength(1)
    for (const body of results.filter((result) => result.errors !== undefined)) {
      expect(codes(body)).toEqual(['TICKET_ALREADY_DECIDED'])
    }
    expect((await loadTicket(draft.id)).audit).toHaveLength(2)
  })
})

describe('atomicity', () => {
  it('leaves neither a ticket change nor an audit entry when the audit write fails', async () => {
    const draft = await draftTicket()
    const entriesBefore = await auditCount()

    const spy = vi.spyOn(auditService, 'record').mockRejectedValueOnce(new Error('audit write failed'))
    const body = await approve(draft.id)
    spy.mockRestore()

    expect(body.errors).toHaveLength(1)
    await expectUntouchedDraft(draft)
    expect(await auditCount()).toBe(entriesBefore)

    // The ticket is still decidable afterwards.
    expect((await approve(draft.id)).errors).toBeUndefined()
  })

  it('rolls back an edit and a rejection the same way', async () => {
    const draft = await draftTicket()
    const spy = vi.spyOn(auditService, 'record').mockRejectedValue(new Error('audit write failed'))
    try {
      expect((await edit(draft.id, { requiresSiteVisit: !draft.requiresSiteVisit })).errors).toHaveLength(1)
      expect((await reject(draft.id, 'Will be rolled back')).errors).toHaveLength(1)
    } finally {
      spy.mockRestore()
    }
    await expectUntouchedDraft(draft)
  })
})

describe('audit log immutability through the API', () => {
  it('exposes no mutation that changes or deletes audit entries', async () => {
    const body = await gql(`{ __schema { mutationType { fields { name } } } }`)
    const names = body.data!.__schema.mutationType.fields.map((field: { name: string }) => field.name).sort()
    expect(names).toEqual(['approveTicket', 'editTicket', 'ingestFault', 'ingestTelemetry', 'rejectTicket'])
  })
})
