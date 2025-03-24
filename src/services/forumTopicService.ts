import TelegramBot from "node-telegram-bot-api";
import { AppDataSource } from "../database";
import { ForumTopic } from "../database/models/ForumTopic";

export async function findOrCreateForumTopic(
  bot: TelegramBot,
  chatId: number,
  topicName: string,
  options: TelegramBot.CreateForumTopicOptions = {}
): Promise<number> {
  const forumTopicRepo = AppDataSource.getRepository(ForumTopic);

  try {
    // 1) Check if we already have a forum topic
    let existingRecord = await forumTopicRepo.findOne({
      where: {
        chatId,
        topicName,
      },
    });

    if (existingRecord) {
      return existingRecord.messageThreadId;
    }

    // 2) Otherwise, create a new forum topic
    const forumTopic = (await bot.createForumTopic(
      chatId,
      topicName,
      options
    )) as any;
    const messageThreadId = forumTopic.message_thread_id;

    // 3) Save the new record in the database
    const newRecord = new ForumTopic();
    newRecord.chatId = chatId;
    newRecord.topicName = topicName;
    newRecord.messageThreadId = messageThreadId;
    await forumTopicRepo.save(newRecord);

    return messageThreadId;
  } catch (error) {
    throw error;
  }
}
