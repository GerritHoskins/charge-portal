import { ALL_FIXTURES } from '@charge-portal/fault-taxonomy'
import { GraphQLError } from 'graphql'
import { describe, expect, it, vi } from 'vitest'
import type { AuditService } from '../../src/audit/audit.service'
import type { DraftingService } from '../../src/drafting/drafting.service'
import { FaultsService } from '../../src/faults/faults.service'
import type { TicketsService } from '../../src/tickets/tickets.service'

function serviceWithSpies() {
  const dataSource = { getRepository: vi.fn(), transaction: vi.fn() }
  const drafting = { draft: vi.fn() }
  const tickets = { createDraft: vi.fn() }
  const audit = { record: vi.fn() }
  const service = new FaultsService(
    dataSource as never,
    drafting as unknown as DraftingService,
    tickets as unknown as TicketsService,
    audit as unknown as AuditService,
  )
  return { service, dataSource, drafting, tickets, audit }
}

const noError = {
  stationId: 'st-001',
  connectorId: 1,
  errorCode: 'NoError',
  status: 'Available',
  timestamp: '2026-10-25T06:00:00Z',
}

describe('FaultsService.ingest', () => {
  it('acknowledges a NoError notification without touching the database or the drafter', async () => {
    const { service, dataSource, drafting } = serviceWithSpies()
    await expect(service.ingest(noError)).resolves.toEqual({ ticket: null, ignored: true })
    expect(dataSource.getRepository).not.toHaveBeenCalled()
    expect(dataSource.transaction).not.toHaveBeenCalled()
    expect(drafting.draft).not.toHaveBeenCalled()
  })

  it.each([
    ['a string', 'not-an-object'],
    ['null', null],
    ['an unknown errorCode', { ...noError, errorCode: 'Exploded' }],
    ['a missing stationId', { ...noError, stationId: undefined }],
    ['a negative connectorId', { ...noError, connectorId: -1 }],
    ['an over-long vendorErrorCode', { ...ALL_FIXTURES[0].notification, vendorErrorCode: 'x'.repeat(51) }],
  ])('rejects %s with BAD_USER_INPUT and the zod issues, persisting nothing', async (_name, payload) => {
    const { service, dataSource, drafting } = serviceWithSpies()
    const error = await service.ingest(payload).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(GraphQLError)
    const { extensions } = error as GraphQLError
    expect(extensions.code).toBe('BAD_USER_INPUT')
    expect(Array.isArray(extensions.issues)).toBe(true)
    expect((extensions.issues as unknown[]).length).toBeGreaterThan(0)
    expect(dataSource.transaction).not.toHaveBeenCalled()
    expect(drafting.draft).not.toHaveBeenCalled()
  })

  it('does not echo submitted values in the issues', async () => {
    const { service } = serviceWithSpies()
    const error = (await service.ingest({ ...noError, stationId: '', errorCode: 'SECRET-VALUE' }).catch((e: unknown) => e)) as GraphQLError
    expect(JSON.stringify(error.extensions.issues)).not.toContain('SECRET-VALUE')
  })
})
