import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuditModule } from '../audit/audit.module'
import { Fault } from '../faults/fault.entity'
import { Ticket } from './ticket.entity'
import { TicketsResolver } from './tickets.resolver'
import { TicketsService } from './tickets.service'

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, Fault]), AuditModule],
  providers: [TicketsService, TicketsResolver],
  exports: [TicketsService],
})
export class TicketsModule {}
