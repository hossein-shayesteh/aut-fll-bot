import TelegramBot from "node-telegram-bot-api";
import { getMainMenuKeyboard } from "../../bot/keyboards/userKeyboards";
import { getActiveEvents } from "../../services/eventService";

// Helper function for “Register for Events”
export const handleRegisterForEvents = async (
  bot: TelegramBot,
  msg: TelegramBot.Message | undefined
) => {
  const chatId = msg?.chat.id;
  // Get only active (or upcoming) events
  const events = await getActiveEvents();

  if (events.length === 0) {
    if (chatId)
      bot.sendMessage(chatId, "No upcoming events at the moment.", {
        reply_markup: getMainMenuKeyboard(),
      });
    return;
  }

  // Ask user to choose from a list of events (inline keyboard)
  const inlineKeyboard = events.map((ev) => [
    {
      text: ev.name,
      callback_data: `view_event_${ev.id}`, // We'll handle in eventHandlers
    },
  ]);

  if (chatId)
    bot.sendMessage(chatId, "Select an event to register:", {
      reply_markup: {
        inline_keyboard: inlineKeyboard,
      },
    });
};
