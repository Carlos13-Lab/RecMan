import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRecipeImageUrl1730000000000 implements MigrationInterface {
  name = "AddRecipeImageUrl1730000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "recipes"
      ADD COLUMN IF NOT EXISTS "image_url" VARCHAR(255);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "recipes" DROP COLUMN IF EXISTS "image_url";
    `);
  }
}
