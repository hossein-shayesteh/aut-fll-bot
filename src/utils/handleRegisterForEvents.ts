import TelegramBot from "node-telegram-bot-api";
import { getMainMenuKeyboard } from "../bot/keyboards/userKeyboards";
import { getActiveEvents } from "../services/eventService";

export const handleRegisterForEvents = async (
  bot: TelegramBot,
  chatId: number
) => {
  const events = await getActiveEvents();

  if (events.length === 0) {
    bot.sendMessage(chatId, "No upcoming events at the moment.", {
      reply_markup: getMainMenuKeyboard(),
    });
    return;
  }

  // Build an inline keyboard
  const inlineKeyboard = events.map((ev) => [
    {
      text: ev.name,
      callback_data: `view_event_${ev.id}`,
    },
  ]);

  bot.sendMessage(chatId, "Select an event to register:", {
    reply_markup: {
      inline_keyboard: inlineKeyboard,
    },
  });
};
