import type { MigrationInterface, QueryRunner } from 'typeorm'

/** WP-08: rolled-up station state (one row per station) and the alerts raised by state transitions. */
export class CreateStationTelemetry1793005200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "station_state" (
        "station_id" character varying(100) NOT NULL,
        "state" character varying(20) NOT NULL,
        "conditions" jsonb NOT NULL,
        "last_sample_at" timestamptz NOT NULL,
        "last_received_at" timestamptz NOT NULL,
        "last_status" character varying(30) NOT NULL,
        "temperature_c" double precision NOT NULL,
        "power_kw" double precision NOT NULL,
        "active_fault" jsonb,
        "consecutive_hot_samples" integer NOT NULL,
        "recent_faults" jsonb NOT NULL,
        "updated_at" timestamptz NOT NULL,
        CONSTRAINT "PK_station_state_station_id" PRIMARY KEY ("station_id"),
        CONSTRAINT "CHK_station_state_state" CHECK ("state" IN ('ok', 'degraded', 'needs-visit'))
      )`,
    )
    await queryRunner.query(
      `CREATE TABLE "station_alert" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "station_id" character varying(100) NOT NULL,
        "kind" character varying(40) NOT NULL,
        "message" text NOT NULL,
        "raised_at" timestamptz NOT NULL,
        "cleared_at" timestamptz,
        CONSTRAINT "PK_station_alert_id" PRIMARY KEY ("id")
      )`,
    )
    await queryRunner.query(`CREATE INDEX "IDX_station_alert_station_id" ON "station_alert" ("station_id")`)
    // Idempotency for concurrent writers: a condition has at most one active alert per station.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_station_alert_active" ON "station_alert" ("station_id", "kind") WHERE "cleared_at" IS NULL`,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "station_alert"')
    await queryRunner.query('DROP TABLE "station_state"')
  }
}
