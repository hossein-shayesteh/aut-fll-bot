import TelegramBot from "node-telegram-bot-api";
import { getMainMenuKeyboard } from "../bot/keyboards/userKeyboards";
import { getActiveEvents } from "../services/eventService";

// userHandlers.ts (or wherever the "Register for Events" logic lives)
export async function handleRegisterForEvents(
  bot: TelegramBot,
  chatId: number,
  userId: number
) {
  const events = await getActiveEvents(); // or getAllEvents(), etc.
  if (events.length === 0) {
    bot.sendMessage(chatId, "No upcoming events at the moment.", {
      reply_markup: getMainMenuKeyboard(false),
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
}
