import type { MigrationInterface, QueryRunner } from 'typeorm'

/** Proves the migration path (ADR 0009: explicit migrations only). Domain tables arrive with WP-03. */
export class Init1792918800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "schema_meta" (
        "key" character varying(100) NOT NULL,
        "value" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_schema_meta_key" PRIMARY KEY ("key")
      )`,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "schema_meta"')
  }
}
