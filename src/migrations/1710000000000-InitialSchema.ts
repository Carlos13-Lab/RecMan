import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1710000000000 implements MigrationInterface {
  name = "InitialSchema1710000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" UUID PRIMARY KEY,
        "device_info" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ingredients" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" TEXT NOT NULL,
        "unit" TEXT NOT NULL,
        "price_usd" NUMERIC(12,4) NOT NULL,
        "current_stock" NUMERIC(12,3) NOT NULL DEFAULT 0,
        "min_stock" NUMERIC(12,3) NOT NULL DEFAULT 0,
        "category" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "recipes" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "profit_percentage" NUMERIC(5,2) NOT NULL,
        "category" TEXT,
        "base_servings" INT NOT NULL DEFAULT 1,
        "notes" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "recipe_ingredients" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "recipe_id" UUID NOT NULL REFERENCES "recipes"("id") ON DELETE CASCADE,
        "ingredient_id" UUID NOT NULL REFERENCES "ingredients"("id") ON DELETE RESTRICT,
        "quantity" NUMERIC(12,3) NOT NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sales" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "recipe_id" UUID NOT NULL REFERENCES "recipes"("id") ON DELETE RESTRICT,
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "quantity" INT NOT NULL,
        "date" DATE NOT NULL,
        "total_usd" NUMERIC(12,2) NOT NULL,
        "total_bs" NUMERIC(12,2) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_sales_date" ON "sales"("date");`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_recipes_user" ON "recipes"("user_id");`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_sales_user" ON "sales"("user_id");`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sales_user";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_recipes_user";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sales_date";`);

    await queryRunner.query(`DROP TABLE IF EXISTS "sales";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "recipe_ingredients";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "recipes";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ingredients";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
  }
}

