import type { FaultClass } from '@charge-portal/fault-taxonomy'
import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { DataSource, In, IsNull, type EntityManager } from 'typeorm'
import { offlineAlertMessage, planAlertChanges } from './alerts'
import { effectiveHealth, isOffline, rollupStationState, type AlertKind, type StationState as DomainState } from './rollup'
import { parseTelemetrySample, TelemetrySampleError } from './sample'
import { StationAlertEntity } from './station-alert.entity'
import { StationStateEntity } from './station-state.entity'
import { TELEMETRY_INTERVAL_MS } from './telemetry.config'
import type { StationAlert, StationState } from './telemetry.model'

@Injectable()
export class TelemetryService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(TELEMETRY_INTERVAL_MS) private readonly intervalMs: number,
  ) {}

  /** Validates one untrusted sample, rolls it into the station's state and raises/clears alerts atomically. */
  async ingest(input: unknown, now = new Date()): Promise<StationState> {
    let sample
    try {
      sample = parseTelemetrySample(input)
    } catch (error) {
      if (error instanceof TelemetrySampleError) throw new BadRequestException(error.message)
      throw error
    }

    return this.dataSource.transaction(async (manager) => {
      await this.lockStation(manager, sample.stationId)
      const existing = await manager.findOneBy(StationStateEntity, { stationId: sample.stationId })
      const prev = existing ? toDomain(existing) : null
      const next = rollupStationState(prev, sample, now)
      await manager.save(StationStateEntity, toEntity(next))

      const changes = planAlertChanges(prev, next)
      // A sample proves the station is reporting again, so an offline alert always ends here.
      const cleared: AlertKind[] = [...changes.clear, 'offline']
      await manager.update(StationAlertEntity, { stationId: next.stationId, kind: In(cleared), clearedAt: IsNull() }, { clearedAt: now })
      if (changes.raise.length > 0) {
        await manager
          .createQueryBuilder()
          .insert()
          .into(StationAlertEntity)
          .values(changes.raise.map((alert) => ({ stationId: next.stationId, kind: alert.kind, message: alert.message, raisedAt: now })))
          .orIgnore()
          .execute()
      }
      const [view] = await this.views(manager, [next.stationId], now)
      return view!
    })
  }

  /** Every station that ever reported, with its active alerts. Offline stations get one offline alert. */
  async stationStates(now = new Date()): Promise<StationState[]> {
    await this.raiseOfflineAlerts(undefined, now)
    return this.views(this.dataSource.manager, undefined, now)
  }

  async stationState(stationId: string, now = new Date()): Promise<StationState | null> {
    await this.raiseOfflineAlerts(stationId, now)
    const [view] = await this.views(this.dataSource.manager, [stationId], now)
    return view ?? null
  }

  /** Serialises writers per station, including the very first sample of a station (no row to lock yet). */
  private async lockStation(manager: EntityManager, stationId: string): Promise<void> {
    await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`station_state:${stationId}`])
  }

  /**
   * Offline is computed at read time, but a transition still deserves an alert. Reading therefore records it,
   * idempotently (partial unique index) and under the station lock so it cannot race a fresh sample.
   */
  private async raiseOfflineAlerts(stationId: string | undefined, now: Date): Promise<void> {
    const rows = await this.dataSource.manager.find(StationStateEntity, stationId ? { where: { stationId } } : {})
    for (const row of rows.filter((candidate) => isOffline(candidate, now, this.intervalMs))) {
      await this.dataSource.transaction(async (manager) => {
        await this.lockStation(manager, row.stationId)
        const current = await manager.findOneBy(StationStateEntity, { stationId: row.stationId })
        if (!current || !isOffline(current, now, this.intervalMs)) return
        await manager
          .createQueryBuilder()
          .insert()
          .into(StationAlertEntity)
          .values({
            stationId: current.stationId,
            kind: 'offline',
            message: offlineAlertMessage(current.stationId, now.getTime() - current.lastReceivedAt.getTime()),
            raisedAt: now,
          })
          .orIgnore()
          .execute()
      })
    }
  }

  private async views(manager: EntityManager, stationIds: string[] | undefined, now: Date): Promise<StationState[]> {
    const rows = await manager.find(StationStateEntity, {
      where: stationIds ? { stationId: In(stationIds) } : {},
      order: { stationId: 'ASC' },
    })
    if (rows.length === 0) return []
    const alerts = await manager.find(StationAlertEntity, {
      where: { stationId: In(rows.map((row) => row.stationId)), clearedAt: IsNull() },
      order: { raisedAt: 'ASC', id: 'ASC' },
    })
    return rows.map((row) => ({
      stationId: row.stationId,
      state: effectiveHealth(row, now, this.intervalMs),
      lastSampleAt: row.lastSampleAt,
      lastReceivedAt: row.lastReceivedAt,
      lastStatus: row.lastStatus,
      temperatureC: row.temperatureC,
      powerKw: row.powerKw,
      activeFault: row.activeFault,
      alerts: alerts.filter((alert) => alert.stationId === row.stationId).map(toAlert),
    }))
  }
}

function toAlert(entity: StationAlertEntity): StationAlert {
  const { id, stationId, kind, message, raisedAt, clearedAt } = entity
  return { id, stationId, kind, message, raisedAt, clearedAt }
}

function toDomain(entity: StationStateEntity): DomainState {
  return {
    stationId: entity.stationId,
    state: entity.state,
    conditions: entity.conditions,
    lastSampleAt: entity.lastSampleAt,
    lastReceivedAt: entity.lastReceivedAt,
    lastStatus: entity.lastStatus as DomainState['lastStatus'],
    temperatureC: entity.temperatureC,
    powerKw: entity.powerKw,
    activeFault: entity.activeFault as FaultClass | null,
    consecutiveHotSamples: entity.consecutiveHotSamples,
    recentFaults: entity.recentFaults,
    updatedAt: entity.updatedAt,
  }
}

function toEntity(state: DomainState): StationStateEntity {
  return Object.assign(new StationStateEntity(), state)
}
