import { validators } from "./../../utils/validators";
import TelegramBot from "node-telegram-bot-api";
import {
  createRegistration,
  getRegistrationById,
  getUserRegistrations,
  cancelRegistration,
  updateRegistration,
  getRegistrationByUserAndEvent,
} from "../../services/registrationService";
import {
  checkEventCapacity,
  getEventById,
  getEventRegistrants,
  updateCompletedEvents,
} from "../../services/eventService";
import {
  getEventDetailsKeyboard,
  getMainMenuKeyboard,
  getUserRegistrationsKeyboard,
  getRegistrationDetailsKeyboard,
  getCancelKeyboard,
  getRegistrationApprovalKeyboard,
  getFeedbackRatingKeyboard,
  getFeedbackSubmissionKeyboard,
  getAddCommentKeyboard,
  getChangeFeedbackKeyboard,
} from "../keyboards/userKeyboards";
import { getUserProfile, updateUserProfile } from "../../services/userService";
import {
  createFeedback,
  getFeedbackByUserAndEvent,
  updateFeedbackComment,
} from "../../services/feedbackService";
import dotenv from "dotenv";
import { RegistrationStatus } from "../../database/models/Registration";
import { sendMessageInTopic } from "../../utils/eventHandlers/sendMessageInTopic";
import { sendPhotoInTopic } from "../../utils/eventHandlers/sendPhotoInTopic";
import { getApplicableFee } from "../../utils/eventHandlers/getApplicableFee";
import { handleRegisterForEvents } from "../../utils/userHandlers/handleRegisterForEvents";
import { getPaymentInstructions } from "../../utils/eventHandlers/getPaymentInstructions";
import { handleRegistrationResponse } from "../../utils/eventHandlers/handleRegistrationResponse";
import { moveToNextRegistrationStep } from "../../utils/eventHandlers/moveToNextRegistrationStep";
import { validateAndUpdateField } from "../../utils/eventHandlers/validateAndUpdateField";
import { EventStatus } from "../../database/models/Event";
import { escapeMarkdown } from "../../utils/escapeMarkdown";
import { generateExcelFile } from "../../utils/adminHandlers/generateExcelFile";
import { getEventStatusIcon } from "../../utils/getEventStatusIcon";
import { isAdminUser } from "../../middlewares/authMiddleware";
import { formatCurrency } from "../../utils/eventHandlers/formatCurrency";
import { getRegistrationStatusInPersian } from "../../utils/getRegistrationStatusInPersian";
import { getEventStatusInPersian } from "../../utils/getEventStatusInPersian";

dotenv.config();

// This is the group ID where the bot will forward payment proof
const ADMIN_GROUP_ID = Number(process.env.ADMIN_GROUP_ID) || 0;

// For multi-step user registration
export const registrationStates: Map<
  number,
  {
    eventId: number;
    step: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    studentId?: string;
  }
> = new Map();

export function registerEventHandlers(bot: TelegramBot) {
  // Run the update function when the bot starts
  updateCompletedEvents();

  // Set up an interval to check for completed events every hour
  setInterval(updateCompletedEvents, 60 * 60 * 1000);

  // Event status
  bot.on("user_view_event_status", async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (!userId) return;

    const userIsAdmin = await isAdminUser(userId);

    const registrations = await getUserRegistrations(userId);
    if (registrations.length === 0) {
      bot.sendMessage(chatId, "شما در هیچ رویدادی ثبت‌نام نکرده‌اید.", {
        reply_markup: getMainMenuKeyboard(userIsAdmin),
      });
      return;
    }

    // Show a list of the user's registrations with pagination (page 0 = first page)
    bot.sendMessage(chatId, "رویدادهای شما:", {
      reply_markup: getUserRegistrationsKeyboard(registrations, 0),
    });
  });

  // Handle callback queries for user event flows
  bot.on("callback_query", async (query) => {
    if (!query.data) return;

    const userId = query.from.id;
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;
    if (!chatId || !messageId) return;

    // 1. View event details
    if (query.data.startsWith("view_event_")) {
      const eventIdStr = query.data.replace("view_event_", "");
      const eventId = parseInt(eventIdStr, 10);

      const event = await getEventById(eventId);
      if (!event) {
        bot.answerCallbackQuery(query.id, { text: "رویداد یافت نشد." });
        return;
      }

      const userProfile = await getUserProfile(userId);

      // Determine which fee to display
      const applicableFee = await getApplicableFee(eventId, userId);

      const eventData = new Intl.DateTimeFormat("fa-IR", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(event.eventDate);

      // TODO: Convert and display eventDate in Jalali calendar
      // Show event details
      let textMessage = `*${escapeMarkdown(event.name)}*\n`;
      textMessage += `${escapeMarkdown(event.description)}\n\n`;
      textMessage += `تاریخ: ${eventData}\n`;
      textMessage += `مکان: ${event.location ?? "نامشخصص"}\n`;
      if (userProfile?.studentId)
        textMessage += `هزینه: ${formatCurrency(applicableFee)} تومان\n`;
      textMessage += `ظرفیت: ${event.capacity.toLocaleString("fa-IR")}\n`;
      textMessage += `وضعیت: ${getEventStatusInPersian(
        event.status
      )} ${getEventStatusIcon(event)}\n`;

      await bot.editMessageText(textMessage, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: getEventDetailsKeyboard(event.id),
      });
      bot.answerCallbackQuery(query.id);
    }

    // 2. User wants to register for the event
    else if (query.data.startsWith("register_")) {
      const eventIdStr = query.data.replace("register_", "");
      const eventId = parseInt(eventIdStr, 10);

      const userId = query.from.id;
      const userIsAdmin = await isAdminUser(userId);

      // Check if event has capacity before starting registration
      const hasCapacity = await checkEventCapacity(eventId);
      if (!hasCapacity) {
        bot.sendMessage(chatId, "متأسفیم، این رویداد قبلاً پر شده است.", {
          reply_markup: getMainMenuKeyboard(userIsAdmin),
        });
        bot.answerCallbackQuery(query.id);
        return;
      }

      // Check if user is already registered for this event
      const existingReg = await getRegistrationByUserAndEvent(userId, eventId);
      if (existingReg && existingReg.status === RegistrationStatus.APPROVED) {
        bot.sendMessage(
          chatId,
          "شما قبلاً در این رویداد ثبت‌نام کرده‌اید و تأیید شده‌اید.",
          { reply_markup: getMainMenuKeyboard(userIsAdmin) }
        );
        bot.answerCallbackQuery(query.id);
        return;
      }

      // Retrieve user profile
      const userProfile = await getUserProfile(userId);
      if (!userProfile) {
        // If somehow user not found, fallback
        registrationStates.set(userId, {
          eventId,
          step: "collect_first_name",
        });
        bot.sendMessage(chatId, "لطفاً *نام* خود را وارد کنید:", {
          parse_mode: "Markdown",
          reply_markup: getCancelKeyboard(),
        });
        bot.answerCallbackQuery(query.id);
        return;
      }

      // If user is already fully registered
      // ask if they want to confirm using that info or enter new info
      if (userProfile.isRegistered) {
        const previewMsg =
          `اطلاعات پروفایل فعلی شما:\n` +
          `• نام: ${userProfile.firstName}\n` +
          `• نام خانوادگی: ${userProfile.lastName}\n` +
          `• شماره تلفن: ${userProfile.phoneNumber}\n` +
          `• شماره دانشجویی: ${userProfile.studentId}\n\n` +
          `آیا می‌خواهید از این اطلاعات استفاده کنید؟`;

        // Save the user’s existing info in the registration state so we can keep track
        registrationStates.set(userId, {
          eventId,
          step: "confirm_existing_profile",
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          phoneNumber: userProfile.phoneNumber,
          studentId: userProfile.studentId,
        });

        // Show two custom reply buttons: "Yes, use it" / "No, update info"
        bot.sendMessage(chatId, previewMsg, {
          reply_markup: {
            keyboard: [
              [
                { text: "بله، از این اطلاعات استفاده کن" },
                { text: "خیر، اطلاعات من را به‌روز کن" },
              ],
              [{ text: "لغو" }],
            ],
            resize_keyboard: true,
            one_time_keyboard: false,
          },
        });
      } else {
        // If user not fully registered, go through the normal multi-step flow
        registrationStates.set(userId, {
          eventId,
          step: "collect_first_name",
        });
        bot.sendMessage(chatId, "لطفاً *نام* خود را وارد کنید:", {
          parse_mode: "Markdown",
          reply_markup: getCancelKeyboard(),
        });
      }

      bot.answerCallbackQuery(query.id);
    }
    // 3. Back to event list (from event details)
    else if (query.data === "back_to_events") {
      // from userHandlers. Let’s do it here for simplicity:
      bot.deleteMessage(chatId, messageId);

      await handleRegisterForEvents(bot, query?.message);

      bot.answerCallbackQuery(query.id);
    }
    // 4. Viewing a single registration from "Event Status"
    else if (query.data.startsWith("view_registration_")) {
      const regId = parseInt(query.data.replace("view_registration_", ""), 10);
      const registration = await getRegistrationById(regId);
      if (!registration) {
        bot.answerCallbackQuery(query.id, { text: "ثبت‌نام یافت نشد." });
        return;
      }

      const isEventCancelled =
        registration.event.status === EventStatus.CANCELLED;
      const isEventCompleted =
        registration.event.status === EventStatus.COMPLETED;
      const isRegistrationApproved =
        registration.status === RegistrationStatus.APPROVED;

      const registrationDate = new Intl.DateTimeFormat("fa-IR", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(registration.registrationDate);

      let message = `*جزئیات ثبت‌نام*\n\n`;
      message += `رویداد: ${escapeMarkdown(registration.event.name)}\n`;
      message += `وضعیت: ${getRegistrationStatusInPersian(
        registration.status
      )}\n`;
      message += `تاریخ: ${registrationDate}\n`;

      if (isEventCancelled) {
        message += `\n⚠️ *مهم: این رویداد لغو شده است.*`;
      } else if (isEventCompleted) {
        message += `\n✅ این رویداد به پایان رسیده است.`;
      } else if (isRegistrationApproved) {
        message += `\n🎉 ثبت‌نام شما تأیید شده است!`;
      }

      let replyMarkup;
      if (isRegistrationApproved) {
        if (isEventCompleted) {
          // For completed events, show feedback options
          replyMarkup = getFeedbackSubmissionKeyboard(registration);
        } else if (!isEventCancelled) {
          // For upcoming events, show only cancel option
          replyMarkup = getRegistrationDetailsKeyboard(registration);
        }
      }

      bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: replyMarkup,
      });

      bot.answerCallbackQuery(query.id);
    }
    // Handle feedback button click
    else if (query.data.startsWith("feedback_")) {
      const eventId = parseInt(query.data.replace("feedback_", ""), 10);

      // Check if user has already submitted feedback for this event
      const existingFeedback = await getFeedbackByUserAndEvent(userId, eventId);

      if (existingFeedback) {
        // User has already submitted feedback, show it and ask if they want to change
        const stars = "⭐".repeat(existingFeedback.rating);

        let message = `شما قبلاً به این رویداد ${stars} (${existingFeedback.rating}/5) امتیاز داده‌اید`;
        if (existingFeedback.comment)
          message += `\n\nنظر شما: "${escapeMarkdown(
            existingFeedback.comment
          )}"`;
        message += "\n\nآیا می‌خواهید بازخورد خود را تغییر دهید؟";

        bot.editMessageText(message, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: getChangeFeedbackKeyboard(eventId),
        });
      } else {
        // User hasn't submitted feedback yet, show rating options
        bot.editMessageText(
          "لطفاً تجربه خود را برای این رویداد ارزیابی کنید:",
          {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: getFeedbackRatingKeyboard(eventId),
          }
        );
      }

      bot.answerCallbackQuery(query.id);
    }
    // Handle request to change rating
    else if (query.data.startsWith("change_rating_")) {
      const eventId = parseInt(query.data.replace("change_rating_", ""), 10);

      bot.editMessageText(
        "لطفا امتیاز جدید خود را برای این رویداد انتخاب کنید:",
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: getFeedbackRatingKeyboard(eventId),
        }
      );

      bot.answerCallbackQuery(query.id);
    }
    // Handle rating selection
    else if (query.data.startsWith("rate_")) {
      const parts = query.data.split("_");
      const eventId = parseInt(parts[1], 10);
      const rating = parseInt(parts[2], 10);

      // Save the rating
      await createFeedback(userId, eventId, rating);

      // Ask for optional comment
      bot.editMessageText(
        `با تشکر از امتیاز ${rating} ستاره‌ای شما! آیا می‌خواهید نظری اضافه کنید؟`,
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: getAddCommentKeyboard(eventId),
        }
      );

      bot.answerCallbackQuery(query.id);
    }
    // Handle comment request
    else if (query.data.startsWith("comment_")) {
      const eventId = parseInt(query.data.replace("comment_", ""), 10);

      // Store state for collecting comment
      registrationStates.set(userId, {
        eventId,
        step: "collect_feedback_comment",
      });

      bot.sendMessage(chatId, "لطفا کامنت خود را وارد کنید:", {
        reply_markup: getCancelKeyboard(),
      });

      // Delete the previous message to avoid confusion
      bot.deleteMessage(chatId, messageId);

      bot.answerCallbackQuery(query.id);
    }
    // 5. Canceling a registration
    else if (query.data.startsWith("cancel_registration_")) {
      const regId = parseInt(
        query.data.replace("cancel_registration_", ""),
        10
      );
      const registration = await getRegistrationById(regId);
      if (!registration) {
        bot.answerCallbackQuery(query.id, { text: "Registration not found." });
        return;
      }

      const success = await cancelRegistration(userId, registration.eventId);
      if (success) {
        bot.editMessageText("ثبت‌نام با موفقیت لغو شد.", {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
        });

        const applicableFee = await getApplicableFee(
          registration.event.id,
          registration.user.telegramId
        );

        // Send Cancellation message to group
        await sendMessageInTopic(
          bot,
          ADMIN_GROUP_ID,
          "Registration Cancellations",
          `❌ *Registration Cancelled*\n\nName: ${
            escapeMarkdown(registration.user.firstName) ?? "N/A"
          } ${escapeMarkdown(registration.user.lastName) ?? ""}\nPhone: ${
            registration.user.phoneNumber ?? "N/A"
          }\nStudent ID: ${
            registration.user.studentId ?? "N/A"
          }\n\nEvent: "${escapeMarkdown(
            registration.event.name
          )}"\nFee: ${applicableFee}\nPrevious Status: ${
            registration.status
          }\n\nPlease process a refund if applicable.`,
          {
            parse_mode: "Markdown",
          }
        );
      } else {
        bot.answerCallbackQuery(query.id, {
          text: "Unable to cancel registration.",
          show_alert: true,
        });
      }
    }

    // 6. Handling admin's "Approve"/"Reject" from the admin group inline button
    else if (query.data.startsWith("approve_")) {
      const regId = parseInt(query.data.replace("approve_", ""), 10);
      const registration = await getRegistrationById(regId);
      await handleRegistrationResponse(
        bot,
        registration,
        RegistrationStatus.APPROVED,
        query
      );
    } else if (query.data.startsWith("reject_")) {
      const regId = parseInt(query.data.replace("reject_", ""), 10);
      const registration = await getRegistrationById(regId);
      await handleRegistrationResponse(
        bot,
        registration,
        RegistrationStatus.REJECTED,
        query
      );
    }
    // Handle pagination for registrations list
    else if (query.data.startsWith("reg_page_")) {
      const pageNumber = parseInt(query.data.replace("reg_page_", ""), 10);
      const userId = query.from.id;

      // Get fresh registrations data
      const registrations = await getUserRegistrations(userId);

      // Update the message with the new page
      await bot.editMessageText("رویدادهای شما:", {
        reply_markup: getUserRegistrationsKeyboard(registrations, pageNumber),
        chat_id: chatId,
        message_id: messageId,
      });

      bot.answerCallbackQuery(query.id);
    }
    // Export registrants to Excel
    else if (query.data.startsWith("export_excel_")) {
      const eventId = parseInt(query.data.split("_")[2]);

      try {
        const event = await getEventById(eventId);
        const registrants = await getEventRegistrants(eventId);

        if (!event || registrants.length === 0) {
          bot.answerCallbackQuery(query.id, {
            text: "No registrants to export",
            show_alert: true,
          });
          return;
        }

        // Generate Excel file
        const excelBuffer = generateExcelFile(event, registrants);

        // Send the Excel file
        bot.sendDocument(
          chatId,
          excelBuffer,
          {
            caption: `Registrants list for "${event.name}"`,
          },
          {
            filename: `${event.name.replace(/\s+/g, "_")}_registrants_${
              new Date().toISOString().split("T")[0]
            }.xlsx`,
            contentType: "application/vnd.ms-excel",
          }
        );

        bot.answerCallbackQuery(query.id, {
          text: "Exporting registrants to Excel...",
        });
      } catch (error) {
        console.error("Excel export error:", error);
        bot.answerCallbackQuery(query.id, {
          text: "Failed to export registrants",
          show_alert: true,
        });
      }
    }
  });

  // 7. Handle messages for multi-step user registration flow
  bot.on("message", async (msg) => {
    const userId = msg.from?.id;
    if (!userId) return;

    const userIsAdmin = await isAdminUser(userId);

    // If we're not in the middle of the registration flow, skip
    if (!registrationStates.has(userId)) return;

    const state = registrationStates.get(userId)!;
    const chatId = msg.chat.id;
    if (!msg.text && !msg.photo) return;

    // If user typed "Cancel", we handle that in userHandlers or globally
    if (msg.text && msg.text.toLowerCase() === "لغو") {
      registrationStates.delete(userId);
      bot.sendMessage(chatId, "ثبت‌نام لغو شد.", {
        reply_markup: getMainMenuKeyboard(userIsAdmin),
      });
      return;
    }

    // Proceed through steps
    switch (state.step) {
      // 1. If we are confirming existing info
      case "confirm_existing_profile":
        if (msg.text === "بله، از این اطلاعات استفاده کن") {
          // Jump directly to collecting the receipt image
          state.step = "collect_receipt_image";
          const applicableFee = await getApplicableFee(state.eventId, userId);
          const user = await getUserProfile(userId);

          const paymentInstructions = getPaymentInstructions(
            applicableFee,
            user?.studentId
          );

          bot.sendMessage(chatId, paymentInstructions, {
            reply_markup: getCancelKeyboard(),
          });
        } else if (msg.text === "خیر، اطلاعات من را به‌روز کن") {
          // Move to normal flow
          moveToNextRegistrationStep(
            bot,
            chatId,
            state,
            "collect_first_name",
            "لطفاً *نام* خود را وارد کنید:"
          );
        }
        break;

      // 2. Normal flow for collecting user information
      case "collect_first_name":
        state.firstName = msg.text;
        moveToNextRegistrationStep(
          bot,
          chatId,
          state,
          "collect_last_name",
          "لطفاً *نام خانوادگی* خود را وارد کنید:"
        );
        break;

      case "collect_last_name":
        state.lastName = msg.text;
        moveToNextRegistrationStep(
          bot,
          chatId,
          state,
          "collect_phone_number",
          "لطفاً *شماره تلفن* خود را وارد کنید:"
        );
        break;

      case "collect_phone_number":
        const phoneValidated = validateAndUpdateField(
          bot,
          chatId,
          msg,
          state,
          validators.phoneNumber,
          "شماره تلفن نامعتبر است. لطفاً یک شماره تلفن معتبر وارد کنید (مثال: 09123456789 یا +989123456789):",
          "collect_student_id",
          "لطفا *شماره دانشجویی* خود را وارد کنید یا اگر دانشجوی امیرکبیر نیستید عدد 0 وارد کنید:",
          "phoneNumber"
        );
        if (!phoneValidated) return;
        break;

      case "collect_student_id":
        // Special validation for student ID (can be "0")
        if (!msg.text) {
          bot.sendMessage(
            chatId,
            "لطفا *شماره دانشجویی* خود را وارد کنید یا اگر دانشجوی امیرکبیر نیستید عدد 0 وارد کنید:",
            {
              reply_markup: getCancelKeyboard(),
            }
          );
          return;
        }

        // Validate student ID format if not "0"
        if (msg.text !== "0" && !validators.studentId(msg.text)) {
          bot.sendMessage(
            chatId,
            "فرمت شماره دانشجویی نامعتبر است. لطفاً یک شماره دانشجویی معتبر دانشگاه امیرکبیر وارد کنید یا اگر دانشجو نیستید '0' وارد کنید:",
            {
              reply_markup: getCancelKeyboard(),
            }
          );
          return;
        }

        state.studentId = msg.text;
        state.step = "collect_receipt_image";

        const event = await getEventById(state.eventId);

        const hasValidStudentId = state.studentId && state.studentId !== "0";

        const fee = hasValidStudentId
          ? event?.universityFee || event?.fee || 0
          : event?.fee || 0;

        const paymentInstructions = getPaymentInstructions(
          fee,
          state.studentId
        );

        bot.sendMessage(chatId, paymentInstructions, {
          reply_markup: getCancelKeyboard(),
        });
        break;

      case "collect_receipt_image":
        // The next message from the user should be a photo; so we handle in `on("photo", ...)` below
        break;

      case "collect_feedback_comment":
        if (!msg.text) {
          bot.sendMessage(chatId, "لطفاً کامنت خود را وارد کنید:", {
            reply_markup: getCancelKeyboard(),
          });
          return;
        }

        // Save the comment to the database using the new helper function
        await updateFeedbackComment(userId, state.eventId, msg.text);

        bot.sendMessage(chatId, "با تشکر از بازخورد شما! نظر شما ثبت شد.", {
          reply_markup: getMainMenuKeyboard(userIsAdmin),
        });

        registrationStates.delete(userId);
        break;
    }
  });

  // Handle photo upload for payment receipt
  bot.on("photo", async (msg) => {
    const userId = msg.from?.id;
    if (!userId) return;

    const userIsAdmin = await isAdminUser(userId);

    if (!registrationStates.has(userId)) return;
    const chatId = msg.chat.id;
    const state = registrationStates.get(userId)!;

    if (state.step !== "collect_receipt_image") return;

    // The largest photo is the last in the array
    const photo = msg.photo?.[msg.photo.length - 1];
    if (!photo?.file_id) {
      bot.sendMessage(
        chatId,
        "امکان پردازش تصویر وجود ندارد. لطفاً دوباره تلاش کنید."
      );
      return;
    }

    // 1) Update user profile info in DB
    await updateUserProfile(userId, {
      firstName: state.firstName,
      lastName: state.lastName,
      phoneNumber: state.phoneNumber,
      studentId: state.studentId,
    });

    // 2) Create registration in DB (status = pending)
    const registration = await createRegistration(
      userId,
      state.eventId,
      photo.file_id
    );

    if (!registration) {
      // Check if user is already approved for this event
      const existingReg = await getRegistrationByUserAndEvent(
        userId,
        state.eventId
      );

      // Check if the event has capacity left
      const isFull = await checkEventCapacity(state.eventId);
      if (existingReg && existingReg.status === RegistrationStatus.APPROVED) {
        // Already approved for this event
        bot.sendMessage(
          chatId,
          "شما قبلاً در این رویداد ثبت‌نام کرده‌اید و تأیید شده‌اید.",
          { reply_markup: getMainMenuKeyboard(userIsAdmin) }
        );
      } else if (!isFull) {
        // Probably some other error (e.g., DB error)
        bot.sendMessage(
          chatId,
          "ثبت‌نام با شکست مواجه شد. ممکن است رویداد پر شده باشد یا خطایی رخ داده باشد.",
          { reply_markup: getMainMenuKeyboard(userIsAdmin) }
        );
      } else {
        // isFull === true => event capacity is reached
        bot.sendMessage(chatId, "متأسفیم، این رویداد قبلاً پر شده است.", {
          reply_markup: getMainMenuKeyboard(userIsAdmin),
        });
      }

      // Clear user's registration flow
      registrationStates.delete(userId);
      return;
    }

    const event = await getEventById(registration.eventId);
    // 3) Forward the receipt image + info to admin group for approval

    // Determine which fee to display
    const applicableFee = await getApplicableFee(registration.eventId, userId);

    const caption = `*New Registration*\n\nName: ${state.firstName} ${
      state.lastName
    }\nPhone: ${state.phoneNumber}\nStudent ID: ${
      state.studentId || "None"
    }\nFee Amount: $${applicableFee}\n`;

    const adminGroupMessage = await sendPhotoInTopic(
      bot,
      ADMIN_GROUP_ID,
      event?.name || "",
      photo.file_id,
      {
        caption,
        parse_mode: "Markdown",
        reply_markup: getRegistrationApprovalKeyboard(registration.id),
      }
    );

    // Store message ID and chat ID in the registration object
    await updateRegistration(registration.id, {
      approvalChatId: ADMIN_GROUP_ID,
      approvalMessageId: adminGroupMessage.message_id,
    });

    // 4) Confirm to user
    bot.sendMessage(
      chatId,
      "درخواست ثبت‌نام شما ثبت شده و در انتظار تأیید مدیر است.",
      {
        reply_markup: getMainMenuKeyboard(userIsAdmin),
      }
    );

    // Clear state
    registrationStates.delete(userId);
  });
}
