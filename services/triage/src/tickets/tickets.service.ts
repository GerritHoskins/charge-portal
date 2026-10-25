import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, type EntityManager, type QueryDeepPartialEntity, Repository } from 'typeorm'
import type { AuditAction } from '../audit/audit-entry.entity'
import { AuditService } from '../audit/audit.service'
import type { TicketDraftInput } from '../drafting/draft-provider'
import { Fault } from '../faults/fault.entity'
import { forbidden, invalidInput, invalidInputFromZod, ticketAlreadyDecided, ticketNotFound } from './decision-errors'
import { Ticket, TicketState } from './ticket.entity'
import { EDITABLE_FIELDS, rejectReasonSchema, ticketEditSchema } from './ticket-decision.schema'
import { ticketSnapshot } from './ticket-snapshot'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** What a decision changes on the locked draft, and what its audit entry adds to `after`. */
interface DecisionPlan {
  action: AuditAction
  patch: QueryDeepPartialEntity<Ticket>
  afterExtra?: Record<string, unknown>
}

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectRepository(Fault) private readonly faults: Repository<Fault>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  /** Newest first. */
  list(state?: TicketState): Promise<Ticket[]> {
    return this.tickets.find({
      where: state ? { state } : {},
      order: { createdAt: 'DESC', id: 'ASC' },
    })
  }

  /** `null` for an unknown id, including one that is not a UUID. */
  async get(id: string): Promise<Ticket | null> {
    if (!UUID.test(id)) return null
    return this.tickets.findOneBy({ id })
  }

  /** The fault a ticket was drafted for. The foreign key guarantees it exists. */
  faultOf(ticket: Ticket): Promise<Fault> {
    return this.faults.findOneByOrFail({ id: ticket.faultId })
  }

  /** Inserts a `draft` ticket for `fault` with the caller's EntityManager, so it joins the caller's transaction. */
  async createDraft(manager: EntityManager, fault: Fault, draft: TicketDraftInput): Promise<Ticket> {
    const ticket = Object.assign(new Ticket(), {
      id: randomUUID(),
      faultId: fault.id,
      stationId: fault.stationId,
      state: TicketState.draft,
      taxonomyCode: draft.taxonomyCode,
      probableCause: draft.probableCause,
      suggestedAction: draft.suggestedAction,
      requiresSiteVisit: draft.requiresSiteVisit,
      confidence: draft.confidence,
      provider: draft.provider,
      rejectReason: null,
      createdAt: new Date(),
      decidedAt: null,
      decidedBy: null,
    })
    await manager.insert(Ticket, ticket)
    return ticket
  }

  /** Accepts the draft as it is. `approved` is terminal. */
  async approve(id: string, actor: string | null): Promise<Ticket> {
    const operator = requireActor(actor)
    return this.decide(id, operator, () => ({ action: 'approved', patch: { state: TicketState.approved } }))
  }

  /**
   * Changes some fields of the draft and approves it as `edited`. The audit entry's `after` snapshot
   * carries `changedFields`: the submitted fields whose value differs from the draft, in
   * EDITABLE_FIELDS order. An edit that changes nothing is refused (approve instead).
   */
  async edit(id: string, input: unknown, actor: string | null): Promise<Ticket> {
    const operator = requireActor(actor)
    const parsed = ticketEditSchema.safeParse(input)
    if (!parsed.success) throw invalidInputFromZod('Invalid ticket edit', parsed.error, ['input'])
    const edit = parsed.data

    return this.decide(id, operator, (current) => {
      const changedFields = EDITABLE_FIELDS.filter((field) => edit[field] !== undefined && edit[field] !== current[field])
      if (changedFields.length === 0) {
        throw invalidInput('The edit changes nothing; approve the ticket to accept it as drafted', [
          { path: ['input'], message: 'No submitted field differs from the draft', code: 'no_change' },
        ])
      }
      const patch: QueryDeepPartialEntity<Ticket> = { state: TicketState.edited }
      for (const field of changedFields) Object.assign(patch, { [field]: edit[field] })
      return { action: 'edited', patch, afterExtra: { changedFields } }
    })
  }

  /** Declines the draft with a reason (trimmed, 3 to 500 characters). `rejected` is terminal. */
  async reject(id: string, reason: unknown, actor: string | null): Promise<Ticket> {
    const operator = requireActor(actor)
    const parsed = rejectReasonSchema.safeParse(reason)
    if (!parsed.success) throw invalidInputFromZod('Invalid rejection reason', parsed.error, ['reason'])
    const rejectReason = parsed.data
    return this.decide(id, operator, () => ({
      action: 'rejected',
      patch: { state: TicketState.rejected, rejectReason },
    }))
  }

  /**
   * One transaction per decision: lock the ticket row, refuse anything that is not a draft, change it,
   * append the audit entry. The row lock serialises concurrent decisions (the loser re-reads the new
   * state and gets TICKET_ALREADY_DECIDED); the `WHERE state = 'draft'` on the update is a second guard
   * because the database itself does not enforce terminal states. An error anywhere rolls back both
   * the ticket change and the audit entry.
   */
  private async decide(id: string, operator: string, plan: (current: Ticket) => DecisionPlan): Promise<Ticket> {
    if (!UUID.test(id)) throw ticketNotFound()

    return this.dataSource.transaction(async (manager) => {
      const current = await manager.findOne(Ticket, { where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!current) throw ticketNotFound()
      if (current.state !== TicketState.draft) throw ticketAlreadyDecided(current.state)

      const { action, patch, afterExtra } = plan(current)
      const decision = { ...patch, decidedAt: new Date(), decidedBy: operator }
      const result = await manager.update(Ticket, { id, state: TicketState.draft }, decision)
      if (result.affected !== 1) throw ticketAlreadyDecided()

      const updated = Object.assign(new Ticket(), current, decision)
      await this.audit.record(manager, {
        ticketId: id,
        action,
        actor: operator,
        before: ticketSnapshot(current),
        after: { ...ticketSnapshot(updated), ...afterExtra },
      })
      return updated
    })
  }
}

/** The actor comes from the request context (`x-actor`), never from arguments; no actor, no decision. */
function requireActor(actor: string | null): string {
  const trimmed = actor?.trim()
  if (!trimmed) throw forbidden()
  return trimmed
}
