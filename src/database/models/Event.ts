import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Registration } from "./Registration";

export enum EventStatus {
  ACTIVE = "active",
  FULL = "full",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

@Entity()
export class Event {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  description!: string;

  @Column()
  capacity!: number;

  @Column("decimal", { precision: 10, scale: 2 })
  fee!: number;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  universityFee!: number;

  @Column({ type: "datetime" })
  eventDate!: Date;

  @Column({ nullable: true })
  location?: string;

  @Column({ nullable: true })
  posterImageUrl?: string;

  @Column({
    type: "simple-enum",
    enum: EventStatus,
    default: EventStatus.ACTIVE,
  })
  status!: EventStatus;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @OneToMany(() => Registration, (registration) => registration.event)
  registrations?: Registration[];
}
