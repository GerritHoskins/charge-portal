import { Field, ObjectType } from '@nestjs/graphql'
import { Ticket } from '../tickets/ticket.entity'

@ObjectType()
export class IngestResult {
  @Field(() => Ticket, { nullable: true, description: 'The draft ticket; null when the notification was ignored.' })
  ticket: Ticket | null

  @Field({ description: 'True for a notification that reports no fault (NoError): acknowledged, not stored.' })
  ignored: boolean
}
