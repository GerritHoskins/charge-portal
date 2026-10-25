import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { type EntityManager, Repository } from 'typeorm'
import type { TicketDraftInput } from '../drafting/draft-provider'
import { Fault } from '../faults/fault.entity'
import { Ticket, TicketState } from './ticket.entity'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectRepository(Fault) private readonly faults: Repository<Fault>,
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
}
