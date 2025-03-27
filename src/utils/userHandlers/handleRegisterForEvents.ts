import TelegramBot from "node-telegram-bot-api";
import { getMainMenuKeyboard } from "../../bot/keyboards/userKeyboards";
import { getFullAndActiveEvents } from "../../services/eventService";
import { isAdminUser } from "../../middlewares/authMiddleware";

// Helper function for “Register for Events”
export const handleRegisterForEvents = async (
  bot: TelegramBot,
  msg: TelegramBot.Message | undefined
) => {
  const chatId = msg?.chat.id;
  const userId = msg?.from?.id;
  if (!userId) return;

  const userIsAdmin = await isAdminUser(userId);

  // Get only active and full  events
  const events = await getFullAndActiveEvents();

  if (events.length === 0) {
    if (chatId)
      bot.sendMessage(chatId, "No upcoming events at the moment.", {
        reply_markup: getMainMenuKeyboard(userIsAdmin),
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
