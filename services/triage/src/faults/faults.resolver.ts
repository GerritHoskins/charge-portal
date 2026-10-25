import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { FaultsService } from './faults.service'
import { IngestResult } from './ingest-result.model'
import { Json } from './json.scalar'

@Resolver()
export class FaultsResolver {
  constructor(private readonly faultsService: FaultsService) {}

  @Mutation(() => IngestResult, {
    description:
      'Ingest one raw OCPP 1.6 StatusNotification: normalise it, store the fault and draft a ticket. ' +
      'Invalid notifications fail with BAD_USER_INPUT and the validation issues.',
  })
  ingestFault(@Args('notification', { type: () => Json }) notification: unknown): Promise<IngestResult> {
    return this.faultsService.ingest(notification)
  }
}
