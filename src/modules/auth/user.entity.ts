import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn
} from "typeorm";

@Entity({ name: "users" })
export class User {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "device_info", type: "jsonb", nullable: true })
  deviceInfo!: Record<string, unknown> | null;

  @Column({ name: "fcm_token", type: "text", nullable: true })
  fcmToken!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

