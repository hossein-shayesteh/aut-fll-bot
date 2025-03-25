import TelegramBot from "node-telegram-bot-api";

import { moveToNextRegistrationStep } from "./moveToNextRegistrationStep";
import { getCancelKeyboard } from "../../bot/keyboards/userKeyboards";

export const validateAndUpdateField = (
  bot: TelegramBot,
  chatId: number,
  msg: TelegramBot.Message,
  state: any,
  validator: (value: string) => boolean,
  errorMessage: string,
  nextStep: string,
  nextStepMessage: string,
  fieldName: string
) => {
  if (!msg.text) {
    bot.sendMessage(chatId, errorMessage, {
      reply_markup: getCancelKeyboard(),
    });
    return false;
  }

  if (validator && !validator(msg.text)) {
    bot.sendMessage(chatId, errorMessage, {
      reply_markup: getCancelKeyboard(),
    });
    return false;
  }

  // Update state and move to next step
  state[fieldName] = msg.text;
  moveToNextRegistrationStep(bot, chatId, state, nextStep, nextStepMessage);
  return true;
};
