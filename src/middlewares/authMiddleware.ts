import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import { isAdmin } from "../services/userService";

dotenv.config();

// Admin group ID
const ADMIN_GROUP_ID = Number(process.env.ADMIN_GROUP_ID);

// Get admin user IDs from environment variables
const ADMIN_USER_IDS =
  process.env.ADMIN_USER_IDS?.split(",").map((id) => Number(id.trim())) || [];

export async function isAdminUser(userId: number): Promise<boolean> {
  // Check if user ID is in the admin list or if they have admin flag in database
  return ADMIN_USER_IDS.includes(userId) || (await isAdmin(userId));
}

export async function checkAdminAccess(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  callback: () => void
): Promise<void> {
  const userId = msg.from?.id;

  if (!userId) {
    return;
  }

  const userIsAdmin = await isAdminUser(userId);

  if (userIsAdmin) {
    callback();
  } else {
    bot.sendMessage(
      msg.chat.id,
      "Sorry, this feature is only available to administrators."
    );
  }
}

export function checkGroupAdmin(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery,
  callback: () => void
): void {
  const userId = query.from.id;
  const chatId = query.message?.chat.id;

  if (!chatId || chatId !== ADMIN_GROUP_ID) {
    return;
  }

  // Check if user is admin
  bot
    .getChatMember(ADMIN_GROUP_ID, userId)
    .then((chatMember) => {
      const isAdmin = ["administrator", "creator"].includes(chatMember.status);

      if (isAdmin) {
        callback();
      } else {
        bot.answerCallbackQuery(query.id, {
          text: "Sorry, only administrators can perform this action.",
          show_alert: true,
        });
      }
    })
    .catch((error) => {
      bot.answerCallbackQuery(query.id, {
        text: "Error verifying your admin status. Please try again.",
        show_alert: true,
      });
    });
}
