import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class ForumTopic {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  chatId!: number;

  @Column()
  topicName!: string;

  @Column()
  messageThreadId!: number;
}
