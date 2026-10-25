import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { StationAlertEntity } from './station-alert.entity'
import { StationStateEntity } from './station-state.entity'
import { loadTelemetryInterval, TELEMETRY_INTERVAL_MS } from './telemetry.config'
import { TelemetryResolver } from './telemetry.resolver'
import { TelemetryService } from './telemetry.service'

@Module({
  imports: [TypeOrmModule.forFeature([StationStateEntity, StationAlertEntity])],
  providers: [
    { provide: TELEMETRY_INTERVAL_MS, useFactory: () => loadTelemetryInterval(process.env) },
    TelemetryService,
    TelemetryResolver,
  ],
  exports: [TelemetryService],
})
export class TelemetryModule {}
