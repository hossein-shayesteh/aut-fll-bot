import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";
import { Event } from "./Event";

export enum RegistrationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
}

@Entity()
export class Registration {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (user) => user.registrations)
  @JoinColumn({ name: "userTelegramId" })
  user!: User;

  @Column()
  userTelegramId!: number;

  @ManyToOne(() => Event, (event) => event.registrations)
  @JoinColumn({ name: "eventId" })
  event!: Event;

  @Column()
  eventId!: number;

  @Column({ nullable: true })
  receiptImageUrl?: string;

  @Column({
    type: "simple-enum",
    enum: RegistrationStatus,
    default: RegistrationStatus.PENDING,
  })
  status!: RegistrationStatus;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  registrationDate!: Date;
}
