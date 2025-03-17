import TelegramBot from "node-telegram-bot-api";
import {
  createRegistration,
  getRegistrationById,
  getUserRegistrations,
  cancelRegistration,
} from "../../services/registrationService";
import { getEventById } from "../../services/eventService";
import {
  getEventDetailsKeyboard,
  getMainMenuKeyboard,
  getUserRegistrationsKeyboard,
  getRegistrationDetailsKeyboard,
  getCancelKeyboard,
  getRegistrationApprovalKeyboard,
} from "../keyboards/userKeyboards";
import {
  findOrCreateUser,
  getUserProfile,
  updateUserProfile,
} from "../../services/userService";

import dotenv from "dotenv";
import { handleRegisterForEvents } from "../../utils/handleRegisterForEvents";

dotenv.config();

// This is the group ID where the bot will forward payment proof
const ADMIN_GROUP_ID = Number(process.env.ADMIN_GROUP_ID) || 0;

// For multi-step user registration
interface IUserRegistrationState {
  eventId: number;
  step: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  studentId?: string;
}
const registrationStates: Map<number, IUserRegistrationState> = new Map();

export function registerEventHandlers(bot: TelegramBot) {
  // Event status
  bot.on("user_view_event_status", async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (!userId) return;

    const registrations = await getUserRegistrations(userId);
    if (registrations.length === 0) {
      bot.sendMessage(chatId, "You have not registered for any events.", {
        reply_markup: getMainMenuKeyboard(false),
      });
      return;
    }

    // Show a list of the user’s registrations (inline keyboard)
    bot.sendMessage(chatId, "Your event registrations:", {
      reply_markup: getUserRegistrationsKeyboard(registrations),
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
        bot.answerCallbackQuery(query.id, { text: "Event not found." });
        return;
      }

      // Show event details
      let textMessage = `*Event Details*\n\n`;
      textMessage += `Name: ${event.name}\n`;
      textMessage += `Description: ${event.description}\n`;
      textMessage += `Date: ${event.eventDate.toLocaleString()}\n`;
      textMessage += `Location: ${event.location ?? "N/A"}\n`;
      textMessage += `Fee: $${event.fee}\n`;
      textMessage += `Capacity: ${event.capacity}\n`;
      textMessage += `Status: ${event.status}\n`;

      await bot.editMessageText(textMessage, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: getEventDetailsKeyboard(event.id),
      });
      bot.answerCallbackQuery(query.id);
    }

    // 2. User wants to register for the event
    // TODO: Get user data from database if they are available
    else if (query.data.startsWith("register_")) {
      const eventIdStr = query.data.replace("register_", "");
      const eventId = parseInt(eventIdStr, 10);

      // Initialize multi-step registration
      registrationStates.set(userId, {
        eventId,
        step: "collect_first_name",
      });

      // Ask user for first name
      bot.sendMessage(chatId, "Please enter your *First Name*:", {
        parse_mode: "Markdown",
        reply_markup: getCancelKeyboard(),
      });

      bot.answerCallbackQuery(query.id);
    }
    // 3. Back to event list (from event details)
    else if (query.data === "back_to_events") {
      // from userHandlers. Let’s do it here for simplicity:
      bot.deleteMessage(chatId, messageId);

      await handleRegisterForEvents(bot, chatId);

      bot.answerCallbackQuery(query.id);
    }
    // 4. Viewing a single registration from "Event Status"
    else if (query.data.startsWith("view_registration_")) {
      const regId = parseInt(query.data.replace("view_registration_", ""), 10);
      const registration = await getRegistrationById(regId);
      if (!registration) {
        bot.answerCallbackQuery(query.id, { text: "Registration not found." });
        return;
      }

      let message = `*Registration Details*\n\n`;
      message += `Event: ${registration.event.name}\n`;
      message += `Status: ${registration.status}\n`;
      message += `Date: ${registration.registrationDate.toLocaleString()}\n`;

      bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup:
          registration.status === "approved" ||
          registration.status === "pending"
            ? getRegistrationDetailsKeyboard(registration)
            : undefined,
      });

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
        bot.editMessageText("Registration cancelled successfully.", {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          // TODO: Fix line below
          // reply_markup: getMainMenuKeyboard(false),
        });
      } else {
        bot.answerCallbackQuery(query.id, {
          text: "Unable to cancel registration.",
          show_alert: true,
        });
      }
    }
    // 6. Handling admin's "Approve"/"Reject" from the admin group inline button
    else if (
      query.data.startsWith("approve_") ||
      query.data.startsWith("reject_")
    ) {
      // This is typically done from the admin group context, so you might put it in adminHandlers.

      bot.answerCallbackQuery(query.id, {
        text: "Handled in adminHandlers or here.",
      });
    }
  });

  // 7. Handle messages for multi-step user registration flow
  bot.on("message", async (msg) => {
    const userId = msg.from?.id;
    if (!userId) return;

    // If we’re not in the middle of the registration flow, skip
    if (!registrationStates.has(userId)) return;

    const state = registrationStates.get(userId)!;
    const chatId = msg.chat.id;
    if (!msg.text && !msg.photo) return;

    // If user typed "Cancel", we handle that in userHandlers or globally
    if (msg.text && msg.text.toLowerCase() === "cancel") {
      registrationStates.delete(userId);
      bot.sendMessage(chatId, "Registration cancelled.", {
        reply_markup: getMainMenuKeyboard(false),
      });
      return;
    }

    // Proceed through steps
    switch (state.step) {
      case "collect_first_name":
        state.firstName = msg.text;
        state.step = "collect_last_name";
        bot.sendMessage(chatId, "Please enter your *Last Name*:", {
          parse_mode: "Markdown",
          reply_markup: getCancelKeyboard(),
        });
        break;

      case "collect_last_name":
        state.lastName = msg.text;
        state.step = "collect_phone_number";
        bot.sendMessage(
          chatId,
          "Please enter your *Phone Number* (with country code if applicable):",
          {
            parse_mode: "Markdown",
            reply_markup: getCancelKeyboard(),
          }
        );
        break;

      case "collect_phone_number":
        state.phoneNumber = msg.text;
        state.step = "collect_student_id";
        bot.sendMessage(
          chatId,
          "Please enter your *Student ID* (if relevant):",
          {
            parse_mode: "Markdown",
            reply_markup: getCancelKeyboard(),
          }
        );
        break;

      case "collect_student_id":
        state.studentId = msg.text;
        state.step = "collect_receipt_image";
        bot.sendMessage(chatId, "Please upload your *payment receipt image*:", {
          parse_mode: "Markdown",
          reply_markup: getCancelKeyboard(),
        });
        break;

      case "collect_receipt_image":
        // The next message from the user should be a photo; so we handle in `on("photo", ...)` below
        break;
    }
  });

  // Handle photo upload for payment receipt
  bot.on("photo", async (msg) => {
    const userId = msg.from?.id;
    if (!userId) return;

    if (!registrationStates.has(userId)) return;
    const chatId = msg.chat.id;
    const state = registrationStates.get(userId)!;

    if (state.step !== "collect_receipt_image") return;

    // The largest photo is the last in the array
    const photo = msg.photo?.[msg.photo.length - 1];
    if (!photo?.file_id) {
      bot.sendMessage(chatId, "Could not process the image. Please try again.");
      return;
    }

    // 1) Update user profile info in DB
    await findOrCreateUser(userId, state.firstName, state.lastName);
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
      // Likely the event is full or there's an error
      bot.sendMessage(
        chatId,
        "Failed to register. The event may be full or an error occurred.",
        { reply_markup: getMainMenuKeyboard(false) }
      );
      registrationStates.delete(userId);
      return;
    }

    // 3) Forward the receipt image + info to admin group for approval
    const caption = `*New Registration*\n\nName: ${state.firstName} ${state.lastName}\nPhone: ${state.phoneNumber}\nStudent ID: ${state.studentId}\n\nEvent ID: ${state.eventId}\nRegistration ID: ${registration.id}`;
    bot.sendPhoto(ADMIN_GROUP_ID, photo.file_id, {
      caption,
      parse_mode: "Markdown",
      reply_markup: getRegistrationApprovalKeyboard(registration.id),
    });

    // 4) Confirm to user
    bot.sendMessage(
      chatId,
      "Your registration request has been submitted and is awaiting admin approval.",
      {
        reply_markup: getMainMenuKeyboard(false),
      }
    );

    // Clear state
    registrationStates.delete(userId);
  });
}
