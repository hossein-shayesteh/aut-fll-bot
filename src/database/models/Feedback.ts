import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";
import { Event } from "./Event";

@Entity()
export class Feedback {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userTelegramId" })
  user!: User;

  @Column()
  userTelegramId!: number;

  @ManyToOne(() => Event)
  @JoinColumn({ name: "eventId" })
  event!: Event;

  @Column()
  eventId!: number;

  @Column({ type: "int" })
  rating!: number;

  @Column({ nullable: true })
  comment?: string;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;
}
