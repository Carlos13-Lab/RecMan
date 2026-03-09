import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm";
import { User } from "../auth/user.entity";

@Entity({ name: "notifications" })
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "user_id" })
  userId!: string;

  @Column({ type: "text" })
  title!: string;

  @Column({ type: "text" })
  body!: string;

  @Column({ type: "boolean", default: false })
  read!: boolean;

  @Column({ type: "text", nullable: true })
  type!: string | null; // 'low_stock', 'delivery_date', etc.

  @Column({ type: "jsonb", nullable: true })
  data!: Record<string, any> | null; // Datos adicionales para navegación

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
