import { Field, InputType } from '@nestjs/graphql'

/** Fields an operator may change with `editTicket`. Provide at least one; null counts as not provided. */
@InputType()
export class TicketEditInput {
  @Field(() => String, { nullable: true, description: '1 to 2000 characters after trimming.' })
  probableCause?: string | null

  @Field(() => String, { nullable: true, description: '1 to 2000 characters after trimming.' })
  suggestedAction?: string | null

  @Field(() => String, { nullable: true, description: 'A taxonomy class such as PWR.OVERCURRENT, or UNCLASSIFIED.' })
  taxonomyCode?: string | null

  @Field(() => Boolean, { nullable: true })
  requiresSiteVisit?: boolean | null
}
