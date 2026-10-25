import { GraphQLError } from 'graphql'
import { describe, expect, it, vi } from 'vitest'
import type { AuditService } from '../../src/audit/audit.service'
import { Ticket, TicketState } from '../../src/tickets/ticket.entity'
import { TicketsService } from '../../src/tickets/tickets.service'

const TICKET_ID = 'b0f8c7a2-7c8e-4a4b-9a0e-5f1f7d2f1a11'

function serviceWithSpies() {
  const dataSource = { transaction: vi.fn() }
  const service = new TicketsService(
    {} as never,
    {} as never,
    dataSource as never,
    { record: vi.fn() } as unknown as AuditService,
  )
  return { service, dataSource }
}

async function codeOf(promise: Promise<unknown>): Promise<unknown> {
  const error = await promise.catch((e: unknown) => e)
  expect(error).toBeInstanceOf(GraphQLError)
  return (error as GraphQLError).extensions.code
}

describe('TicketsService decisions without an actor', () => {
  it.each([null, '', '   '])('approve refuses actor %j with FORBIDDEN before opening a transaction', async (actor) => {
    const { service, dataSource } = serviceWithSpies()
    expect(await codeOf(service.approve(TICKET_ID, actor))).toBe('FORBIDDEN')
    expect(dataSource.transaction).not.toHaveBeenCalled()
  })

  it('edit and reject refuse a missing actor first, even for invalid input', async () => {
    const { service, dataSource } = serviceWithSpies()
    expect(await codeOf(service.edit(TICKET_ID, {}, null))).toBe('FORBIDDEN')
    expect(await codeOf(service.reject(TICKET_ID, '', null))).toBe('FORBIDDEN')
    expect(dataSource.transaction).not.toHaveBeenCalled()
  })

  it('validates input before opening a transaction', async () => {
    const { service, dataSource } = serviceWithSpies()
    expect(await codeOf(service.edit(TICKET_ID, {}, 'ops@example.test'))).toBe('BAD_USER_INPUT')
    expect(await codeOf(service.reject(TICKET_ID, 'ab', 'ops@example.test'))).toBe('BAD_USER_INPUT')
    expect(dataSource.transaction).not.toHaveBeenCalled()
  })

  it('answers a malformed ticket id with TICKET_NOT_FOUND without touching the database', async () => {
    const { service, dataSource } = serviceWithSpies()
    expect(await codeOf(service.approve('not-a-uuid', 'ops@example.test'))).toBe('TICKET_NOT_FOUND')
    expect(dataSource.transaction).not.toHaveBeenCalled()
  })
})

describe('TicketsService decisions under a lost race', () => {
  it('refuses with TICKET_ALREADY_DECIDED when the guarded update touches no row, and writes no audit entry', async () => {
    const record = vi.fn()
    const draft = Object.assign(new Ticket(), { id: TICKET_ID, state: TicketState.draft, confidence: 0.6 })
    const manager = { findOne: vi.fn().mockResolvedValue(draft), update: vi.fn().mockResolvedValue({ affected: 0 }) }
    const dataSource = { transaction: vi.fn((run: (m: unknown) => Promise<unknown>) => run(manager)) }
    const service = new TicketsService({} as never, {} as never, dataSource as never, { record } as unknown as AuditService)

    expect(await codeOf(service.approve(TICKET_ID, 'ops@example.test'))).toBe('TICKET_ALREADY_DECIDED')
    expect(manager.update).toHaveBeenCalledWith(Ticket, { id: TICKET_ID, state: 'draft' }, expect.objectContaining({ state: 'approved' }))
    expect(record).not.toHaveBeenCalled()
  })
})
