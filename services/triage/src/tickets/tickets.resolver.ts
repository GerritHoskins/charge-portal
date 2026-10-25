import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'
import { Actor } from '../actor.decorator'
import { AuditEntry } from '../audit/audit-entry.entity'
import { AuditService } from '../audit/audit.service'
import { Fault } from '../faults/fault.entity'
import { Ticket, TicketState } from './ticket.entity'
import { TicketEditInput } from './ticket-edit.input'
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

  @Mutation(() => Ticket, {
    description:
      'Accept a draft ticket as drafted (state approved). The operator is taken from x-actor. ' +
      'Errors (extensions.code): FORBIDDEN, TICKET_NOT_FOUND, TICKET_ALREADY_DECIDED.',
  })
  approveTicket(@Args('id', { type: () => ID }) id: string, @Actor() actor: string | null): Promise<Ticket> {
    return this.ticketsService.approve(id, actor)
  }

  @Mutation(() => Ticket, {
    description:
      'Change some fields of a draft ticket and approve it (state edited); the audit entry lists changedFields. ' +
      'Errors: FORBIDDEN, BAD_USER_INPUT (no field, invalid field, nothing differs), TICKET_NOT_FOUND, TICKET_ALREADY_DECIDED.',
  })
  editTicket(
    @Args('id', { type: () => ID }) id: string,
    @Args('input', { type: () => TicketEditInput }) input: TicketEditInput,
    @Actor() actor: string | null,
  ): Promise<Ticket> {
    return this.ticketsService.edit(id, input, actor)
  }

  @Mutation(() => Ticket, {
    description:
      'Reject a draft ticket with a reason of 3 to 500 characters after trimming (state rejected). ' +
      'Errors: FORBIDDEN, BAD_USER_INPUT, TICKET_NOT_FOUND, TICKET_ALREADY_DECIDED.',
  })
  rejectTicket(
    @Args('id', { type: () => ID }) id: string,
    @Args('reason', { type: () => String }) reason: string,
    @Actor() actor: string | null,
  ): Promise<Ticket> {
    return this.ticketsService.reject(id, reason, actor)
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
