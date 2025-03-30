import TelegramBot from "node-telegram-bot-api";
import { RegistrationStatus } from "../../database/models/Registration";
import { updateRegistrationStatus } from "../../services/registrationService";

export const handleRegistrationResponse = async (
  bot: TelegramBot,
  registration: any,
  status: RegistrationStatus,
  query: TelegramBot.CallbackQuery
) => {
  try {
    if (!registration) {
      bot.answerCallbackQuery(query.id, {
        text: "Registration not found.",
        show_alert: true,
      });
      return;
    }

    // Update registration status
    await updateRegistrationStatus(registration.id, status);

    // Notify the user about the status change
    const userChatId = registration.user.telegramId;
    const statusEmoji = status === RegistrationStatus.APPROVED ? "🎉" : "❌";
    const statusText = status === RegistrationStatus.APPROVED ? "تأیید" : "رد";

    bot.sendMessage(
      userChatId,
      `${statusEmoji} ثبت‌نام شما برای رویداد "${registration.event.name}" ${statusText} شد.`
    );

    // Edit the message in the admin group
    const { approvalMessageId, approvalChatId } = registration;
    const statusEmojiCaption =
      status === RegistrationStatus.APPROVED ? "✅" : "❌";
    const statusCaption =
      status === RegistrationStatus.APPROVED ? "Approved" : "Rejected";

    await bot.editMessageCaption(
      `${statusEmojiCaption} *Registration ${statusCaption}*\n\nName: ${registration.user.firstName} ${registration.user.lastName}\nPhone: ${registration.user.phoneNumber}\nStudent ID: ${registration.user.studentId}`,
      {
        chat_id: approvalChatId,
        message_id: approvalMessageId,
        parse_mode: "Markdown",
        reply_markup: undefined,
      }
    );
  } catch (error) {
    bot.answerCallbackQuery(query.id, {
      text: `Error ${
        status === RegistrationStatus.APPROVED ? "approving" : "rejecting"
      } registration.`,
      show_alert: true,
    });
  }
};
