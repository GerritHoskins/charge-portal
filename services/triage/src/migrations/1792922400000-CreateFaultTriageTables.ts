import type { MigrationInterface, QueryRunner } from 'typeorm'

/** Faults, tickets and the append-only audit log (ADR 0008, ADR 0010). */
export class CreateFaultTriageTables1792922400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "faults" (
        "id" uuid NOT NULL,
        "station_id" text NOT NULL,
        "connector_id" integer NOT NULL,
        "ocpp_error_code" text NOT NULL,
        "vendor_id" text,
        "vendor_error_code" text,
        "taxonomy_code" text NOT NULL,
        "component" text NOT NULL,
        "severity" text NOT NULL,
        "requires_site_visit" boolean NOT NULL,
        "source" text NOT NULL,
        "raw" jsonb NOT NULL,
        "occurred_at" timestamptz NOT NULL,
        "received_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_faults_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_faults_connector_id" CHECK ("connector_id" >= 0),
        CONSTRAINT "CHK_faults_source" CHECK ("source" IN ('vendor-table', 'ocpp-default', 'unclassified'))
      )`,
    )
    // Recent-faults lookup of the drafting step: one station, a time window.
    await queryRunner.query(`CREATE INDEX "IDX_faults_station_occurred_at" ON "faults" ("station_id", "occurred_at")`)

    await queryRunner.query(
      `CREATE TABLE "tickets" (
        "id" uuid NOT NULL,
        "fault_id" uuid NOT NULL,
        "station_id" text NOT NULL,
        "state" text NOT NULL DEFAULT 'draft',
        "taxonomy_code" text NOT NULL,
        "probable_cause" text NOT NULL,
        "suggested_action" text NOT NULL,
        "requires_site_visit" boolean NOT NULL,
        "confidence" numeric(3,2) NOT NULL,
        "provider" text NOT NULL,
        "reject_reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "decided_at" timestamptz,
        "decided_by" text,
        CONSTRAINT "PK_tickets_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tickets_fault" FOREIGN KEY ("fault_id") REFERENCES "faults" ("id"),
        CONSTRAINT "CHK_tickets_state" CHECK ("state" IN ('draft', 'approved', 'edited', 'rejected')),
        CONSTRAINT "CHK_tickets_confidence" CHECK ("confidence" >= 0 AND "confidence" <= 1),
        CONSTRAINT "CHK_tickets_reject_reason" CHECK ("state" <> 'rejected' OR btrim(coalesce("reject_reason", '')) <> '')
      )`,
    )
    await queryRunner.query(`CREATE INDEX "IDX_tickets_state_created_at" ON "tickets" ("state", "created_at" DESC)`)
    await queryRunner.query(`CREATE INDEX "IDX_tickets_fault_id" ON "tickets" ("fault_id")`)

    await queryRunner.query(
      `CREATE TABLE "audit_entries" (
        "id" uuid NOT NULL,
        "ticket_id" uuid NOT NULL,
        "action" text NOT NULL,
        "actor" text NOT NULL,
        "before" jsonb,
        "after" jsonb NOT NULL,
        "at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_entries_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_entries_ticket" FOREIGN KEY ("ticket_id") REFERENCES "tickets" ("id"),
        CONSTRAINT "CHK_audit_entries_action" CHECK ("action" IN ('draft-created', 'approved', 'edited', 'rejected')),
        CONSTRAINT "CHK_audit_entries_actor" CHECK (btrim("actor") <> '')
      )`,
    )
    await queryRunner.query(`CREATE INDEX "IDX_audit_entries_ticket_at" ON "audit_entries" ("ticket_id", "at")`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "audit_entries"')
    await queryRunner.query('DROP TABLE "tickets"')
    await queryRunner.query('DROP TABLE "faults"')
  }
}
