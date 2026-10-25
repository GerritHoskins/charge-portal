import { Field, Float, ID, ObjectType, registerEnumType } from '@nestjs/graphql'
import { Column, Entity, PrimaryColumn, type ValueTransformer } from 'typeorm'

// Lower-case members on purpose, like HealthStatus: the wire values are the contract's state names.
export enum TicketState {
  draft = 'draft',
  approved = 'approved',
  edited = 'edited',
  rejected = 'rejected',
}
registerEnumType(TicketState, { name: 'TicketState' })

/** node-postgres returns numeric columns as strings; the ticket exposes a number. */
const numeric: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
}

/**
 * A fault ticket: drafted by a provider, decided by an operator (ADR 0010). `draft` is the only state
 * that can change; `approved`, `edited` and `rejected` are terminal. `fault` and `audit` are resolved by
 * `TicketsResolver`; the foreign keys to `faults` and `audit_entries` are in the migration.
 */
@ObjectType()
@Entity('tickets')
export class Ticket {
  @Field(() => ID)
  @PrimaryColumn({ type: 'uuid' })
  id: string

  @Field(() => ID)
  @Column({ type: 'uuid', name: 'fault_id' })
  faultId: string

  @Field()
  @Column({ type: 'text', name: 'station_id' })
  stationId: string

  @Field(() => TicketState)
  @Column({ type: 'text' })
  state: TicketState

  @Field()
  @Column({ type: 'text', name: 'taxonomy_code' })
  taxonomyCode: string

  @Field()
  @Column({ type: 'text', name: 'probable_cause' })
  probableCause: string

  @Field()
  @Column({ type: 'text', name: 'suggested_action' })
  suggestedAction: string

  @Field()
  @Column({ type: 'boolean', name: 'requires_site_visit' })
  requiresSiteVisit: boolean

  @Field(() => Float, { description: 'Between 0 and 1.' })
  @Column({ type: 'numeric', precision: 3, scale: 2, transformer: numeric })
  confidence: number

  @Field({ description: 'Who produced the draft, for example rules.' })
  @Column({ type: 'text' })
  provider: string

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', name: 'reject_reason', nullable: true })
  rejectReason: string | null

  @Field(() => Date)
  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', name: 'decided_at', nullable: true })
  decidedAt: Date | null

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', name: 'decided_by', nullable: true })
  decidedBy: string | null
}
