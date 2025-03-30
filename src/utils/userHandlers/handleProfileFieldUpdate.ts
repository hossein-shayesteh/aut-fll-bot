import TelegramBot from "node-telegram-bot-api";
import {
  getCancelKeyboard,
  getMainMenuKeyboard,
} from "../../bot/keyboards/userKeyboards";
import { updateUserProfile } from "../../services/userService";
import { userStates } from "../../bot/handlers/userHandlers";
import { isAdminUser } from "../../middlewares/authMiddleware";

export const handleProfileFieldUpdate = async (
  bot: TelegramBot,
  chatId: number,
  userId: number,
  field: string,
  value: string,
  validator?: (value: string) => boolean,
  errorMessage?: string
) => {
  const userIsAdmin = await isAdminUser(userId);

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

  // Translate field name to Persian
  let persianField = "";
  switch (field) {
    case "firstName":
      persianField = "نام";
      break;
    case "lastName":
      persianField = "نام خانوادگی";
      break;
    case "phoneNumber":
      persianField = "شماره تلفن";
      break;
    case "studentId":
      persianField = "شماره دانشجویی";
      break;
    default:
      persianField = field;
  }

  bot.sendMessage(chatId, `${persianField} با موفقیت به‌روزرسانی شد!`, {
    reply_markup: getMainMenuKeyboard(userIsAdmin),
  });
  return true;
};
