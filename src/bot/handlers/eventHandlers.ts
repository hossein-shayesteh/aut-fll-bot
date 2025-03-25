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
  updateCompletedEvents,
} from "../../services/eventService";
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
import { RegistrationStatus } from "../../database/models/Registration";
import { sendMessageInTopic } from "../../utils/eventHandlers/sendMessageInTopic";
import { sendPhotoInTopic } from "../../utils/eventHandlers/sendPhotoInTopic";
import { getApplicableFee } from "../../utils/eventHandlers/getApplicableFee";
import { handleRegisterForEvents } from "../../utils/userHandlers/handleRegisterForEvents";
import { getPaymentInstructions } from "../../utils/eventHandlers/getPaymentInstructions";
import { handleRegistrationResponse } from "../../utils/eventHandlers/handleRegistrationResponse";
import { moveToNextRegistrationStep } from "../../utils/eventHandlers/moveToNextRegistrationStep";
import { validateAndUpdateField } from "../../utils/eventHandlers/validateAndUpdateField";

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

    const registrations = await getUserRegistrations(userId);
    if (registrations.length === 0) {
      bot.sendMessage(chatId, "You have not registered for any events.", {
        reply_markup: getMainMenuKeyboard(),
      });
      return;
    }

    // Show a list of the user's registrations with pagination (page 0 = first page)
    bot.sendMessage(chatId, "Your event registrations:", {
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
        bot.answerCallbackQuery(query.id, { text: "Event not found." });
        return;
      }

      // Determine which fee to display
      const applicableFee = getApplicableFee(eventId, userId);

      // Show event details
      let textMessage = `*Event Details*\n\n`;
      textMessage += `Name: ${event.name}\n`;
      textMessage += `Description: ${event.description}\n`;
      textMessage += `Date: ${event.eventDate.toLocaleString()}\n`;
      textMessage += `Location: ${event.location ?? "N/A"}\n`;
      textMessage += `Fee: $${applicableFee}\n`;
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
    else if (query.data.startsWith("register_")) {
      const eventIdStr = query.data.replace("register_", "");
      const eventId = parseInt(eventIdStr, 10);

      // Check if event has capacity before starting registration
      const hasCapacity = await checkEventCapacity(eventId);
      if (!hasCapacity) {
        bot.sendMessage(chatId, "Sorry, this event is already full.", {
          reply_markup: getMainMenuKeyboard(),
        });
        bot.answerCallbackQuery(query.id);
        return;
      }

      // Check if user is already registered for this event
      const existingReg = await getRegistrationByUserAndEvent(userId, eventId);
      if (existingReg && existingReg.status === RegistrationStatus.APPROVED) {
        bot.sendMessage(
          chatId,
          "You are already registered and approved for this event.",
          { reply_markup: getMainMenuKeyboard() }
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
        bot.sendMessage(chatId, "Please enter your *First Name*:", {
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
          `Your current profile info:\n` +
          `• First Name: ${userProfile.firstName}\n` +
          `• Last Name: ${userProfile.lastName}\n` +
          `• Phone Number: ${userProfile.phoneNumber}\n` +
          `• Student ID: ${userProfile.studentId}\n\n` +
          `Do you want to use this info?`;

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
              [{ text: "Yes, use this info" }, { text: "No, update my info" }],
              [{ text: "Cancel" }],
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
        bot.sendMessage(chatId, "Please enter your *First Name*:", {
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
          // reply_markup: getMainMenuKeyboard(),
        });

        const applicableFee = getApplicableFee(
          registration.event.id,
          registration.user.telegramId
        );

        // Send Cancellation message to group
        await sendMessageInTopic(
          bot,
          ADMIN_GROUP_ID,
          "Registration Cancellations",
          `❌ *Registration Cancelled*\n\nName: ${
            registration.user.firstName ?? "N/A"
          } ${registration.user.lastName ?? ""}\nPhone: ${
            registration.user.phoneNumber ?? "N/A"
          }\nStudent ID: ${registration.user.studentId ?? "N/A"}\n\nEvent: "${
            registration.event.name
          }"\nFee: $${applicableFee}\n\nPlease process a refund if applicable.`,
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
      await bot.editMessageText("Your event registrations:", {
        reply_markup: getUserRegistrationsKeyboard(registrations, pageNumber),
        chat_id: chatId,
        message_id: messageId,
      });

      bot.answerCallbackQuery(query.id);
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
        reply_markup: getMainMenuKeyboard(),
      });
      return;
    }

    // Proceed through steps
    switch (state.step) {
      // 1. If we are confirming existing info
      case "confirm_existing_profile":
        if (msg.text === "Yes, use this info") {
          // Jump directly to collecting the receipt image
          state.step = "collect_receipt_image";
          const applicableFee = await getApplicableFee(state.eventId, userId);
          bot.sendMessage(chatId, getPaymentInstructions(applicableFee), {
            reply_markup: getCancelKeyboard(),
          });
        } else if (msg.text === "No, update my info") {
          // Move to normal flow
          moveToNextRegistrationStep(
            bot,
            chatId,
            state,
            "collect_first_name",
            "Please enter your *First Name*:"
          );
        } else {
          // If they typed something else, remind them
          bot.sendMessage(chatId, "Please tap Yes or No (or Cancel).");
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
          "Please enter your *Last Name*:"
        );
        break;

      case "collect_last_name":
        state.lastName = msg.text;
        moveToNextRegistrationStep(
          bot,
          chatId,
          state,
          "collect_phone_number",
          "Please enter your *Phone Number* (with country code if applicable):"
        );
        break;

      case "collect_phone_number":
        const phoneValidated = validateAndUpdateField(
          bot,
          chatId,
          msg,
          state,
          validators.phoneNumber,
          "Invalid phone number format. Please enter a valid Iranian phone number (e.g., 09123456789 or +989123456789):",
          "collect_student_id",
          "Please enter your *Student ID* if you are a university student, or enter *0* if you are not:",
          "phoneNumber"
        );
        if (!phoneValidated) return;
        break;

      case "collect_student_id":
        // Special validation for student ID (can be "0")
        if (!msg.text) {
          bot.sendMessage(
            chatId,
            "Please enter your student ID or '0' if you're not a student:",
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
            "Invalid student ID format. Please enter a valid Amirkabir University student ID or '0' if you're not a student:",
            {
              reply_markup: getCancelKeyboard(),
            }
          );
          return;
        }

        state.studentId = msg.text;
        state.step = "collect_receipt_image";

        const fee = await getApplicableFee(state.eventId, userId);
        bot.sendMessage(chatId, getPaymentInstructions(fee), {
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
          "You are already registered and approved for this event.",
          { reply_markup: getMainMenuKeyboard() }
        );
      } else if (!isFull) {
        // Probably some other error (e.g., DB error)
        bot.sendMessage(
          chatId,
          "Failed to register. The event may be full or an error occurred.",
          { reply_markup: getMainMenuKeyboard() }
        );
      } else {
        // isFull === true => event capacity is reached
        bot.sendMessage(chatId, "Sorry, this event is already full.", {
          reply_markup: getMainMenuKeyboard(),
        });
      }

      // Clear user’s registration flow
      registrationStates.delete(userId);
      return;
    }

    const event = await getEventById(registration.eventId);
    // 3) Forward the receipt image + info to admin group for approval

    // Determine which fee to display
    const applicableFee = getApplicableFee(registration.eventId, userId);

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
      "Your registration request has been submitted and is awaiting admin approval.",
      {
        reply_markup: getMainMenuKeyboard(),
      }
    );

    // Clear state
    registrationStates.delete(userId);
  });
}
