import { Query, Resolver } from '@nestjs/graphql'
import { Health } from './health.model'
import { HealthService } from './health.service'

@Resolver(() => Health)
export class HealthResolver {
  constructor(private readonly healthService: HealthService) {}

  @Query(() => Health, { description: 'Liveness plus database connectivity.' })
  health(): Promise<Health> {
    return this.healthService.check()
  }
}
