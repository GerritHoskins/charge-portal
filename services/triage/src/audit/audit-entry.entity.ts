import { Field, ID, ObjectType } from '@nestjs/graphql'
import { Column, Entity, PrimaryColumn } from 'typeorm'
import { Json } from '../faults/json.scalar'

export const AUDIT_ACTIONS = ['draft-created', 'approved', 'edited', 'rejected'] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

/**
 * One append-only row of the decision history (ADR 0010, decision 3). Nothing in the service updates or
 * deletes audit entries; `AuditService` only records and reads. `action` is a plain string on the wire
 * because `draft-created` is not a valid GraphQL enum name.
 */
@ObjectType()
@Entity('audit_entries')
export class AuditEntry {
  @Field(() => ID)
  @PrimaryColumn({ type: 'uuid' })
  id: string

  @Field(() => ID)
  @Column({ type: 'uuid', name: 'ticket_id' })
  ticketId: string

  @Field(() => String, { description: 'draft-created, approved, edited or rejected.' })
  @Column({ type: 'text' })
  action: AuditAction

  @Field({ description: 'The operator from the session, or agent:<provider> for drafts.' })
  @Column({ type: 'text' })
  actor: string

  @Field(() => Json, { nullable: true, description: 'Ticket snapshot before the change; null for draft-created.' })
  @Column({ type: 'jsonb', nullable: true })
  before: Record<string, unknown> | null

  @Field(() => Json, { description: 'Ticket snapshot after the change.' })
  @Column({ type: 'jsonb' })
  after: Record<string, unknown>

  @Field(() => Date)
  @Column({ type: 'timestamptz' })
  at: Date
}
