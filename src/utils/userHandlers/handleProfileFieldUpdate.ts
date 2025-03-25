import TelegramBot from "node-telegram-bot-api";
import {
  getCancelKeyboard,
  getMainMenuKeyboard,
} from "../../bot/keyboards/userKeyboards";
import { updateUserProfile } from "../../services/userService";
import { userStates } from "../../bot/handlers/userHandlers";

export const handleProfileFieldUpdate = async (
  bot: TelegramBot,
  chatId: number,
  userId: number,
  field: string,
  value: string,
  validator?: (value: string) => boolean,
  errorMessage?: string
) => {
  // Validate if validator is provided
  if (validator && !validator(value)) {
    bot.sendMessage(
      chatId,
      errorMessage || "Invalid input. Please try again:",
      {
        reply_markup: getCancelKeyboard(),
      }
    );
    return false;
  }

  // Update profile and clear state
  userStates.delete(userId);
  await updateUserProfile(userId, { [field]: value });
  bot.sendMessage(
    chatId,
    `${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully!`,
    {
      reply_markup: getMainMenuKeyboard(),
    }
  );
  return true;
};
