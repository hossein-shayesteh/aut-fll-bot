import TelegramBot, { Message } from "node-telegram-bot-api";
import { findOrCreateForumTopic } from "../services/forumTopicService";

export async function sendPhotoInTopic(
  bot: TelegramBot,
  chatId: number,
  topicName: string,
  photo: string,
  options: TelegramBot.SendPhotoOptions = {}
): Promise<Message> {
  try {
    const messageThreadId = await findOrCreateForumTopic(
      bot,
      chatId,
      topicName
    );

    // Send the photo to the thread
    return await bot.sendPhoto(chatId, photo, {
      ...options,
      message_thread_id: messageThreadId,
    });
  } catch (error) {
    throw error;
  }
}
