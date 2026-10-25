import { Field, ObjectType, registerEnumType } from '@nestjs/graphql'

// Lower-case members on purpose: the wire value is `ok` / `degraded`, which is what the BFF contract
// (shared/contracts/triage.ts) and the work-package acceptance criteria use.
export enum HealthStatus {
  ok = 'ok',
  degraded = 'degraded',
}
registerEnumType(HealthStatus, { name: 'HealthStatus' })

@ObjectType()
export class Health {
  @Field(() => HealthStatus)
  status: HealthStatus

  /** True when the service can run a query against PostgreSQL. */
  @Field()
  database: boolean
}
