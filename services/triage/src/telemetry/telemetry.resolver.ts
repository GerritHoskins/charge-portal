import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql'
import { Json } from '../faults/json.scalar'
import { StationState } from './telemetry.model'
import { TelemetryService } from './telemetry.service'

@Resolver(() => StationState)
export class TelemetryResolver {
  constructor(private readonly telemetry: TelemetryService) {}

  @Mutation(() => StationState, {
    description:
      'Rolls one station telemetry sample ({ stationId, at, status, temperatureC, powerKw, faultClass? }) into its state. ' +
      'Invalid samples are rejected with a message that names the invalid fields.',
  })
  ingestTelemetry(@Args('sample', { type: () => Json }) sample: unknown): Promise<StationState> {
    return this.telemetry.ingest(sample)
  }

  @Query(() => [StationState], { description: 'Every station that reported, with its active alerts.' })
  stationStates(): Promise<StationState[]> {
    return this.telemetry.stationStates()
  }

  @Query(() => StationState, { nullable: true, description: 'Null when the station never reported.' })
  stationState(@Args('stationId', { type: () => ID }) stationId: string): Promise<StationState | null> {
    return this.telemetry.stationState(stationId)
  }
}
