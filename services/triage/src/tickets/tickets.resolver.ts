import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'
import { AuditEntry } from '../audit/audit-entry.entity'
import { AuditService } from '../audit/audit.service'
import { Fault } from '../faults/fault.entity'
import { Ticket, TicketState } from './ticket.entity'
import { TicketsService } from './tickets.service'

@Resolver(() => Ticket)
export class TicketsResolver {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly auditService: AuditService,
  ) {}

  @Query(() => [Ticket], { name: 'tickets', description: 'Tickets, newest first; all states unless `state` is given.' })
  list(@Args('state', { type: () => TicketState, nullable: true }) state?: TicketState): Promise<Ticket[]> {
    return this.ticketsService.list(state)
  }

  @Query(() => Ticket, { name: 'ticket', nullable: true, description: 'One ticket, or null when the id is unknown.' })
  get(@Args('id', { type: () => ID }) id: string): Promise<Ticket | null> {
    return this.ticketsService.get(id)
  }

  @ResolveField('fault', () => Fault, { description: 'The fault the ticket was drafted for, with its raw codes.' })
  fault(@Parent() ticket: Ticket): Promise<Fault> {
    return this.ticketsService.faultOf(ticket)
  }

  @ResolveField('audit', () => [AuditEntry], { description: 'The decision history, oldest first.' })
  audit(@Parent() ticket: Ticket): Promise<AuditEntry[]> {
    return this.auditService.forTicket(ticket.id)
  }
}
