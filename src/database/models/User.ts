import { Entity, PrimaryColumn, Column, OneToMany } from "typeorm";
import { Registration } from "./Registration";

@Entity()
export class User {
  @PrimaryColumn()
  telegramId!: number;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ nullable: true })
  studentId?: string;

  @Column({ default: false })
  isAdmin?: boolean;

  @Column({ default: false })
  isRegistered?: boolean;

  @Column({ default: true })
  notificationsEnabled?: boolean;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt?: Date;

  @OneToMany(() => Registration, (registration) => registration.user)
  registrations?: Registration[];
}
