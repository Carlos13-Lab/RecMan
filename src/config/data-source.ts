import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../modules/auth/user.entity";
import { Ingredient } from "../modules/ingredients/ingredient.entity";
import { Recipe } from "../modules/recipes/recipe.entity";
import { RecipeIngredient } from "../modules/recipes/recipe-ingredient.entity";
import { Sale } from "../modules/sales/sale.entity";
import { Notification } from "../modules/notifications/notification.entity";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASS || "12345678",
  database: process.env.DB_NAME || "recman_db",
  entities: [User, Ingredient, Recipe, RecipeIngredient, Sale, Notification],
  migrations: ["src/migrations/*.ts"],
  synchronize: false,
  logging: false
});

