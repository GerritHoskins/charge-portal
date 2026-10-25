import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuditModule } from '../audit/audit.module'
import { DraftingModule } from '../drafting/drafting.module'
import { TicketsModule } from '../tickets/tickets.module'
import { Fault } from './fault.entity'
import { FaultsResolver } from './faults.resolver'
import { FaultsService } from './faults.service'
import { JsonScalar } from './json.scalar'

@Module({
  imports: [TypeOrmModule.forFeature([Fault]), AuditModule, DraftingModule, TicketsModule],
  providers: [FaultsService, FaultsResolver, JsonScalar],
  exports: [FaultsService],
})
export class FaultsModule {}
