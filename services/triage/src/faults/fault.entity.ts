import { Field, ID, Int, ObjectType } from '@nestjs/graphql'
import { Column, Entity, PrimaryColumn } from 'typeorm'
import { Json } from './json.scalar'

/** How the canonical class was found (`NormalisationSource` of @charge-portal/fault-taxonomy). */
export type FaultSource = 'vendor-table' | 'ocpp-default' | 'unclassified'

/**
 * One normalised fault notification. The raw OCPP codes and the validated notification stay next to
 * the class (ADR 0008, decision 4). `component`, `severity` and `source` are plain strings on the wire
 * because their values contain hyphens (`power-electronics`, `vendor-table`).
 */
@ObjectType()
@Entity('faults')
export class Fault {
  @Field(() => ID)
  @PrimaryColumn({ type: 'uuid' })
  id: string

  @Field()
  @Column({ type: 'text', name: 'station_id' })
  stationId: string

  @Field(() => Int)
  @Column({ type: 'integer', name: 'connector_id' })
  connectorId: number

  @Field()
  @Column({ type: 'text', name: 'ocpp_error_code' })
  ocppErrorCode: string

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', name: 'vendor_id', nullable: true })
  vendorId: string | null

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', name: 'vendor_error_code', nullable: true })
  vendorErrorCode: string | null

  @Field({ description: 'Canonical class, AREA.NAME or UNCLASSIFIED (ADR 0008).' })
  @Column({ type: 'text', name: 'taxonomy_code' })
  taxonomyCode: string

  @Field()
  @Column({ type: 'text' })
  component: string

  @Field()
  @Column({ type: 'text' })
  severity: string

  @Field()
  @Column({ type: 'boolean', name: 'requires_site_visit' })
  requiresSiteVisit: boolean

  @Field(() => String, { description: 'vendor-table, ocpp-default or unclassified.' })
  @Column({ type: 'text' })
  source: FaultSource

  @Field(() => Json, { description: 'The validated OCPP StatusNotification as received.' })
  @Column({ type: 'jsonb' })
  raw: Record<string, unknown>

  @Field(() => Date, { description: 'The timestamp the station reported.' })
  @Column({ type: 'timestamptz', name: 'occurred_at' })
  occurredAt: Date

  @Field(() => Date)
  @Column({ type: 'timestamptz', name: 'received_at' })
  receivedAt: Date
}
