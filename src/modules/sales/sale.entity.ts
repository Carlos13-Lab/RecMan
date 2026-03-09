import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm";
import { Recipe } from "../recipes/recipe.entity";
import { User } from "../auth/user.entity";

@Entity({ name: "sales" })
export class Sale {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Recipe, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "recipe_id" })
  recipe!: Recipe;

  @Column({ name: "recipe_id" })
  recipeId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "user_id" })
  userId!: string;

  @Column({ type: "int" })
  quantity!: number;

  @Column({ type: "date" })
  date!: string;

  @Column({ name: "total_usd", type: "numeric", precision: 12, scale: 2 })
  totalUsd!: string;

  @Column({ name: "total_bs", type: "numeric", precision: 12, scale: 2 })
  totalBs!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}

