import TelegramBot from "node-telegram-bot-api";
import { userStates } from "../../bot/handlers/userHandlers";
import { getCancelKeyboard } from "../../bot/keyboards/userKeyboards";

// Helper function for profile editing commands
export function startProfileEdit(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  state: string,
  promptMessage: string
) {
  if (!msg.from?.id) return;
  const chatId = msg.chat.id;
  userStates.set(msg.from.id, { state });
  bot.sendMessage(chatId, promptMessage, {
    reply_markup: getCancelKeyboard(),
  });
}
