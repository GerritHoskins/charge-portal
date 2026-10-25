import type { FaultClass } from '@charge-portal/fault-taxonomy'
import { Column, Entity, PrimaryColumn } from 'typeorm'
import type { ConditionKind, RecentFault } from './rollup'

/** One row per station (upserted on every sample). The rollup state; `offline` is never stored. */
@Entity({ name: 'station_state' })
export class StationStateEntity {
  @PrimaryColumn({ name: 'station_id', type: 'varchar', length: 100 })
  stationId: string

  @Column({ type: 'varchar', length: 20 })
  state: 'ok' | 'degraded' | 'needs-visit'

  @Column({ type: 'jsonb' })
  conditions: ConditionKind[]

  @Column({ name: 'last_sample_at', type: 'timestamptz' })
  lastSampleAt: Date

  @Column({ name: 'last_received_at', type: 'timestamptz' })
  lastReceivedAt: Date

  @Column({ name: 'last_status', type: 'varchar', length: 30 })
  lastStatus: string

  @Column({ name: 'temperature_c', type: 'double precision' })
  temperatureC: number

  @Column({ name: 'power_kw', type: 'double precision' })
  powerKw: number

  @Column({ name: 'active_fault', type: 'jsonb', nullable: true })
  activeFault: FaultClass | null

  @Column({ name: 'consecutive_hot_samples', type: 'integer' })
  consecutiveHotSamples: number

  @Column({ name: 'recent_faults', type: 'jsonb' })
  recentFaults: RecentFault[]

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
