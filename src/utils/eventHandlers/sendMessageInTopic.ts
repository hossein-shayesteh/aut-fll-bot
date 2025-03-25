import TelegramBot from "node-telegram-bot-api";
import { findOrCreateForumTopic } from "../../services/forumTopicService";

export async function sendMessageInTopic(
  bot: TelegramBot,
  chatId: number,
  topicName: string,
  text: string,
  options: TelegramBot.SendMessageOptions = {}
): Promise<void> {
  try {
    const messageThreadId = await findOrCreateForumTopic(
      bot,
      chatId,
      topicName
    );

    // 2) Send the message to that thread
    await bot.sendMessage(chatId, text, {
      ...options,
      message_thread_id: messageThreadId,
    });
  } catch (error) {
    throw error;
  }
}
