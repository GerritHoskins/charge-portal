import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import type { AlertKind } from './rollup'

/** An alert is active while `clearedAt` is null. At most one active alert per station and kind (partial unique index). */
@Entity({ name: 'station_alert' })
export class StationAlertEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'station_id', type: 'varchar', length: 100 })
  stationId: string

  @Column({ type: 'varchar', length: 40 })
  kind: AlertKind

  @Column({ type: 'text' })
  message: string

  @Column({ name: 'raised_at', type: 'timestamptz' })
  raisedAt: Date

  @Column({ name: 'cleared_at', type: 'timestamptz', nullable: true })
  clearedAt: Date | null
}
