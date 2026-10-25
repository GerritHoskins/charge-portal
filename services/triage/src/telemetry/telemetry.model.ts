import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql'
import type { AlertKind, StationHealth } from './rollup'

// GraphQL enum names cannot contain "-", so the wire name of `needs-visit` is `needs_visit`. The internal
// value (what resolvers return and the BFF contract uses) stays `needs-visit`; WP-09 maps it.
export enum StationHealthEnum {
  ok = 'ok',
  degraded = 'degraded',
  needs_visit = 'needs-visit',
  offline = 'offline',
}
registerEnumType(StationHealthEnum, {
  name: 'StationHealth',
  description: 'Rolled-up station level. `offline` is computed at read time (no sample for 3 x the interval).',
})

export enum StationAlertKindEnum {
  site_visit_fault = 'site_visit_fault',
  recurring_fault = 'recurring_fault',
  sustained_overheating = 'sustained_overheating',
  degraded_fault = 'degraded_fault',
  high_temperature = 'high_temperature',
  offline = 'offline',
}
registerEnumType(StationAlertKindEnum, {
  name: 'StationAlertKind',
  description: 'Why an alert was raised. The UI translates by kind; `message` is a short English fallback.',
})

@ObjectType({ description: 'A canonical fault class (ADR 0008) a station currently reports.' })
export class StationFault {
  @Field()
  taxonomyCode: string

  @Field()
  component: string

  @Field()
  severity: string

  @Field()
  requiresSiteVisit: boolean
}

@ObjectType()
export class StationAlert {
  @Field(() => ID)
  id: string

  @Field(() => ID)
  stationId: string

  @Field(() => StationAlertKindEnum)
  kind: AlertKind

  @Field()
  message: string

  @Field()
  raisedAt: Date

  /** Null while the alert is active. */
  @Field(() => Date, { nullable: true })
  clearedAt: Date | null
}

@ObjectType()
export class StationState {
  @Field(() => ID)
  stationId: string

  @Field(() => StationHealthEnum)
  state: StationHealth

  /** Station clock of the newest sample. */
  @Field()
  lastSampleAt: Date

  /** Server clock when a sample last arrived; offline is measured from this. */
  @Field()
  lastReceivedAt: Date

  /** OCPP 1.6 status of the last sample, e.g. `Faulted`. */
  @Field()
  lastStatus: string

  @Field()
  temperatureC: number

  @Field()
  powerKw: number

  @Field(() => StationFault, { nullable: true })
  activeFault: StationFault | null

  /** Active alerts only (oldest first). Cleared alerts stay in the database for history. */
  @Field(() => [StationAlert])
  alerts: StationAlert[]
}
