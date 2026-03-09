import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotifications1720000000000 implements MigrationInterface {
  name = "AddNotifications1720000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar columna fcm_token a users
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "fcm_token" TEXT;
    `);

    // Crear tabla notifications
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "title" TEXT NOT NULL,
        "body" TEXT NOT NULL,
        "read" BOOLEAN NOT NULL DEFAULT false,
        "type" TEXT,
        "data" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Crear índices
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_user" ON "notifications"("user_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_read" ON "notifications"("read");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_created" ON "notifications"("created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_created";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_read";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_user";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications";`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "fcm_token";`);
  }
}
