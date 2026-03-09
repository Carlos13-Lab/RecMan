import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm";
import { Recipe } from "./recipe.entity";
import { Ingredient } from "../ingredients/ingredient.entity";

@Entity({ name: "recipe_ingredients" })
export class RecipeIngredient {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Recipe, (recipe) => recipe.ingredients, {
    onDelete: "CASCADE"
  })
  @JoinColumn({ name: "recipe_id" })
  recipe!: Recipe;

  @Column({ name: "recipe_id" })
  recipeId!: string;

  @ManyToOne(() => Ingredient, {
    onDelete: "RESTRICT"
  })
  @JoinColumn({ name: "ingredient_id" })
  ingredient!: Ingredient;

  @Column({ name: "ingredient_id" })
  ingredientId!: string;

  @Column({ type: "numeric", precision: 12, scale: 3 })
  quantity!: string;
}

