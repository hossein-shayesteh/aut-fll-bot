import TelegramBot from "node-telegram-bot-api";
import { getCancelKeyboard } from "../../bot/keyboards/userKeyboards";

export const moveToNextRegistrationStep = (
  bot: TelegramBot,
  chatId: number,
  state: any,
  nextStep: string,
  message: string
) => {
  state.step = nextStep;
  bot.sendMessage(chatId, message, {
    parse_mode: "Markdown",
    reply_markup: getCancelKeyboard(),
  });
};
