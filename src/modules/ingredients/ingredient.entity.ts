import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";

@Entity({ name: "ingredients" })
export class Ingredient {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text" })
  unit!: string;

  @Column({ name: "price_usd", type: "numeric", precision: 12, scale: 4 })
  priceUsd!: string;

  @Column({
    name: "current_stock",
    type: "numeric",
    precision: 12,
    scale: 3,
    default: 0
  })
  currentStock!: string;

  @Column({
    name: "min_stock",
    type: "numeric",
    precision: 12,
    scale: 3,
    default: 0
  })
  minStock!: string;

  @Column({ type: "text", nullable: true })
  category!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

