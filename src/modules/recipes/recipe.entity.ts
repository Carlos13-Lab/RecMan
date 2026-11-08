import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
import { User } from "../auth/user.entity";
import { RecipeIngredient } from "./recipe-ingredient.entity";

@Entity({ name: "recipes" })
export class Recipe {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "user_id" })
  userId!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({
    name: "profit_percentage",
    type: "numeric",
    precision: 5,
    scale: 2
  })
  profitPercentage!: string;

  @Column({ type: "text", nullable: true })
  category!: string | null;

  @Column({ name: "base_servings", type: "int", default: 1 })
  baseServings!: number;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  // Relative path ("/uploads/recipes/<file>"); clients prefix it with the API origin.
  @Column({ name: "image_url", type: "varchar", length: 255, nullable: true })
  imageUrl!: string | null;

  @OneToMany(() => RecipeIngredient, (ri) => ri.recipe)
  ingredients!: RecipeIngredient[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

