import TelegramBot from "node-telegram-bot-api";
import { getMainMenuKeyboard } from "../../bot/keyboards/userKeyboards";
import { getFullAndActiveEvents } from "../../services/eventService";

// Helper function for “Register for Events”
export const handleRegisterForEvents = async (
  bot: TelegramBot,
  msg: TelegramBot.Message | undefined
) => {
  const chatId = msg?.chat.id;
  // Get only active and full  events
  const events = await getFullAndActiveEvents();

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
