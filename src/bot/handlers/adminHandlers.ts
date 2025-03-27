import TelegramBot from "node-telegram-bot-api";
import { checkAdminAccess } from "../../middlewares/authMiddleware";
import {
  getAdminMenuKeyboard,
  getAdminEventsKeyboard,
  getAdminEventActionsKeyboard,
  getEventEditKeyboard,
  getAnnouncementTargetKeyboard,
  getConfirmCancelEventKeyboard,
} from "../keyboards/adminKeyboards";
import {
  createEvent,
  getEventById,
  getAllEvents,
  updateEvent,
  updateEventStatus,
  getEventRegistrants,
} from "../../services/eventService";
import { EventStatus } from "../../database/models/Event";
import { getAllUsers } from "../../services/userService";
import {
  getAverageEventRating,
  getEventFeedbacks,
} from "../../services/feedbackService";
import { getMainMenuKeyboard } from "../keyboards/userKeyboards";
import { RegistrationStatus } from "../../database/models/Registration";
import dotenv from "dotenv";
import { escapeMarkdown } from "../../utils/escapeMarkdown";
import { sendMessageInTopic } from "../../utils/eventHandlers/sendMessageInTopic";
import { updateRegistration } from "../../services/registrationService";
import { getApplicableFee } from "../../utils/eventHandlers/getApplicableFee";
import { getEventStatusIcon } from "../../utils/getEventStatusIcon";

dotenv.config();

// This is the group ID where the bot will forward payment proof
const ADMIN_GROUP_ID = Number(process.env.ADMIN_GROUP_ID) || 0;

// User states for multi-step operations
export const AdminStates: Map<
  number,
  {
    state: string;
    eventId?: number;
    data?: any;
  }
> = new Map();

export function registerAdminHandlers(bot: TelegramBot) {
  // Admin panel command handler
  bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    checkAdminAccess(bot, msg, () => {
      bot.sendMessage(chatId, "Welcome to the Admin Panel", {
        reply_markup: getAdminMenuKeyboard(),
      });
    });
  });

  // Admin menu handler
  bot.onText(/Admin Panel/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    checkAdminAccess(bot, msg, () => {
      bot.sendMessage(chatId, "Welcome to the Admin Panel", {
        reply_markup: getAdminMenuKeyboard(),
      });
    });
  });

  // Create new event handler
  bot.onText(/Create New Event/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    // TODO: Prompt for event poster image as the first step, store it, and display a preview to the admin in later confirmation steps
    checkAdminAccess(bot, msg, () => {
      AdminStates.set(userId, { state: "CREATE_EVENT_NAME" });
      bot.sendMessage(
        chatId,
        "Let's create a new event. First, please enter the event name:",
        {
          reply_markup: {
            keyboard: [[{ text: "Cancel" }]],
            resize_keyboard: true,
            one_time_keyboard: false,
          },
        }
      );
    });
  });

  // Edit events handler
  bot.onText(/Edit Events/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    checkAdminAccess(bot, msg, async () => {
      const events = await getAllEvents();
      if (events.length === 0) {
        bot.sendMessage(chatId, "There are no events to edit.", {
          reply_markup: getAdminMenuKeyboard(),
        });
        return;
      }

      bot.sendMessage(chatId, "Select an event:", {
        reply_markup: getAdminEventsKeyboard(events, 0),
      });
    });
  });

  // List of registrants handler
  bot.onText(/List of Registrants/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    checkAdminAccess(bot, msg, async () => {
      const events = await getAllEvents();
      if (events.length === 0) {
        bot.sendMessage(chatId, "There are no events with registrants.", {
          reply_markup: getAdminMenuKeyboard(),
        });
        return;
      }

      bot.sendMessage(chatId, "Select an event:", {
        reply_markup: getAdminEventsKeyboard(events, 0),
      });
    });
  });

  // Announcements & Notifications handler
  bot.onText(/Announcements & Notifications/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    checkAdminAccess(bot, msg, () => {
      bot.sendMessage(chatId, "Select announcement target:", {
        reply_markup: getAnnouncementTargetKeyboard(),
      });
    });
  });

  // Back to main menu handler
  bot.onText(/Back to Main Menu/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    bot.sendMessage(chatId, "Returning to main menu", {
      reply_markup: getMainMenuKeyboard(),
    });
  });

  // Cancel handler (for multi-step processes)
  bot.onText(/Cancel/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    if (AdminStates.has(userId)) {
      AdminStates.delete(userId);
      bot.sendMessage(chatId, "Operation cancelled.", {
        reply_markup: getAdminMenuKeyboard(),
      });
    }
  });

  // Handle callback queries for admin actions
  bot.on("callback_query", async (query) => {
    const userId = query.from.id;
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;
    const data = query.data;

    if (!chatId || !messageId || !data) return;

    // Handle pagination for admin events list
    if (data.startsWith("admin_page_")) {
      const pageNumber = parseInt(data.replace("admin_page_", ""), 10);
      // Get fresh events data
      const events = await getAllEvents();
      // Update the message with the new page
      await bot.editMessageText("Select an event:", {
        reply_markup: getAdminEventsKeyboard(events, pageNumber),
        chat_id: chatId,
        message_id: messageId,
      });
      bot.answerCallbackQuery(query.id);
    }
    // Admin event selection
    else if (data.startsWith("admin_event_")) {
      const eventId = parseInt(data.split("_")[2]);
      const event = await getEventById(eventId);

      if (!event) {
        bot.answerCallbackQuery(query.id, {
          text: "Event not found",
          show_alert: true,
        });
        return;
      }

      let message = `*Event Details*\n\n`;
      message += `*${escapeMarkdown(event.name)}*\n`;
      message += `${escapeMarkdown(event.description) || "N/A"}\n`;
      message += `Date: ${event.eventDate.toLocaleString()}\n`;
      message += `Location: ${event.location || "N/A"}\n`;
      message += `Regular Fee: $${event.fee}\n`;
      message += `University Student Fee: $${
        event.universityFee || event.fee
      }\n`;
      message += `Capacity: ${event.capacity}\n`;
      message += `Status: ${getEventStatusIcon(event)} ${event.status}\n`;

      // Get registrant count
      const registrants = await getEventRegistrants(eventId);
      const approvedCount = registrants.filter(
        (r) => r.status === RegistrationStatus.APPROVED
      ).length;
      message += `Registrations: ${approvedCount}/${event.capacity}\n`;

      bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: getAdminEventActionsKeyboard(eventId),
      });

      bot.answerCallbackQuery(query.id);
    }
    // Edit event
    else if (data.startsWith("edit_event_")) {
      const eventId = parseInt(data.split("_")[2]);
      bot.editMessageText("Select what you want to edit:", {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: getEventEditKeyboard(eventId),
      });

      bot.answerCallbackQuery(query.id);
    }
    // View registrants
    else if (data.startsWith("view_registrants_")) {
      const eventId = parseInt(data.split("_")[2]);
      const registrants = await getEventRegistrants(eventId);

      if (registrants.length === 0) {
        bot.editMessageText("No registrants for this event yet.", {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: getAdminEventActionsKeyboard(eventId),
        });
      } else {
        let message = "*Registrants List*\n\n";

        // Add an export button to the keyboard
        const keyboard = getAdminEventActionsKeyboard(eventId);
        keyboard.inline_keyboard.unshift([
          {
            text: "📊 Export to Excel",
            callback_data: `export_excel_${eventId}`,
          },
        ]);

        for (const reg of registrants) {
          const user = reg.user;
          let statusIcon = "";

          switch (reg.status) {
            case "pending":
              statusIcon = "⏳";
              break;
            case "approved":
              statusIcon = "✅";
              break;
            case "rejected":
              statusIcon = "❌";
              break;
            case "cancelled":
              statusIcon = "🚫";
              break;
          }

          message += `${statusIcon} *${escapeMarkdown(user.firstName)} ${
            user.lastName || ""
          }*\n`;
          message += `   Status: ${reg.status}\n`;
          message += `   Phone: ${user.phoneNumber || "N/A"}\n`;
          message += `   Student ID: ${user.studentId || "N/A"}\n\n`;
        }

        // Send as new message if it's too long
        if (message.length > 4000) {
          bot.sendMessage(
            chatId,
            "Registrants list is too long. Here's a summary:",
            {
              parse_mode: "Markdown",
            }
          );

          bot.sendMessage(
            chatId,
            `Total: ${registrants.length}\n` +
              `Approved: ${
                registrants.filter((r) => r.status === "approved").length
              }\n` +
              `Pending: ${
                registrants.filter((r) => r.status === "pending").length
              }\n` +
              `Rejected: ${
                registrants.filter((r) => r.status === "rejected").length
              }\n` +
              `Cancelled: ${
                registrants.filter((r) => r.status === "cancelled").length
              }`,
            {
              reply_markup: keyboard,
            }
          );
        } else {
          bot.editMessageText(message, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            reply_markup: keyboard,
          });
        }
      }

      bot.answerCallbackQuery(query.id);
    }
    // Cancel event
    else if (data.startsWith("cancel_event_")) {
      const eventId = parseInt(data.split("_")[2]);
      bot.editMessageText(
        "Are you sure you want to cancel this event? This will notify all registrants.",
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: getConfirmCancelEventKeyboard(eventId),
        }
      );

      bot.answerCallbackQuery(query.id);
    }

    // Confirm cancel event
    else if (data.startsWith("confirm_cancel_event_")) {
      const eventId = parseInt(data.split("_")[3]);

      // Get the event to check its status
      const event = await getEventById(eventId);

      if (!event) {
        bot.answerCallbackQuery(query.id, {
          text: "Event not found",
          show_alert: true,
        });
        return;
      }

      // Only allow cancellation of ACTIVE or FULL events
      if (
        event.status !== EventStatus.ACTIVE &&
        event.status !== EventStatus.FULL
      ) {
        bot.answerCallbackQuery(query.id, {
          text: `Cannot cancel event with status: ${event.status}. Only ACTIVE or FULL events can be cancelled.`,
          show_alert: true,
        });
        return;
      }

      // Update the event status to CANCELLED
      const updatedEvent = await updateEventStatus(
        eventId,
        EventStatus.CANCELLED
      );

      if (!updatedEvent) {
        bot.answerCallbackQuery(query.id, {
          text: "Failed to cancel event",
          show_alert: true,
        });
        return;
      }

      // Update the status of all related registrations to CANCELLED
      const registrants = await getEventRegistrants(eventId);
      const affectedRegistrants = registrants.filter(
        (r) =>
          r.status === RegistrationStatus.APPROVED ||
          r.status === RegistrationStatus.PENDING
      );

      for (const reg of affectedRegistrants) {
        try {
          // Update registration status to CANCELLED
          await updateRegistration(reg.id, {
            status: RegistrationStatus.CANCELLED,
          });

          const applicableFee = await getApplicableFee(
            reg.event.id,
            reg.user.telegramId
          );

          // Send cancellation message in topic for refund
          await sendMessageInTopic(
            bot,
            ADMIN_GROUP_ID,
            "Registration Cancellations",
            `❌ *Registration Cancelled*\n\nName: ${
              escapeMarkdown(reg.user.firstName) ?? "N/A"
            } ${escapeMarkdown(reg.user.lastName) ?? ""}\nPhone: ${
              reg.user.phoneNumber ?? "N/A"
            }\nStudent ID: ${
              reg.user.studentId ?? "N/A"
            }\n\nEvent: "${escapeMarkdown(
              updatedEvent.name
            )}"\nFee: $${applicableFee}\nPrevious Status: ${
              reg.status
            }\n\nPlease process a refund if applicable.`,
            {
              parse_mode: "Markdown",
            }
          );

          await bot.sendMessage(
            reg.user.telegramId,
            `⚠️ *Event Cancelled* ⚠️\n\nThe event "${escapeMarkdown(
              updatedEvent.name
            )}" scheduled for ${updatedEvent.eventDate.toLocaleString()} has been cancelled.`,
            { parse_mode: "Markdown" }
          );
        } catch (error) {}
      }

      bot.editMessageText(
        `Event "${updatedEvent.name}" has been cancelled and all approved registrants have been notified.`,
        {
          chat_id: chatId,
          message_id: messageId,
        }
      );

      bot.answerCallbackQuery(query.id, {
        text: "Event cancelled successfully",
      });
    }
    // View feedback
    else if (data.startsWith("view_feedback_")) {
      const eventId = parseInt(data.split("_")[2]);
      const feedbacks = await getEventFeedbacks(eventId);
      const avgRating = await getAverageEventRating(eventId);

      if (feedbacks.length === 0) {
        bot.editMessageText("No feedback for this event yet.", {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: getAdminEventActionsKeyboard(eventId),
        });
      } else {
        let message = "*Event Feedback*\n";

        message += `Average Rating: ${
          avgRating ? `${avgRating.toFixed(1)}⭐` : "N/A"
        }\n\n`;

        // Limit how many feedback items to display (for example, 10)
        const limit = 10;
        const displayedCount = Math.min(feedbacks.length, limit);

        for (let i = 0; i < displayedCount; i++) {
          const { user, rating, comment } = feedbacks[i];

          message += `*User:* ${user?.firstName} ${user?.lastName}\n`;
          message += `*Rating:* ${"⭐".repeat(rating)}\n`;
          if (comment) message += `*Comment:* ${escapeMarkdown(comment)}\n`;
          message += "\n";
        }

        if (feedbacks.length > limit) {
          message += `... and ${
            feedbacks.length - limit
          } more feedback submissions.`;
        }

        bot.editMessageText(message, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: getAdminEventActionsKeyboard(eventId),
        });
      }

      bot.answerCallbackQuery(query.id);
    }
    // Send notification to event participants
    else if (data.startsWith("notify_event_")) {
      const eventId = parseInt(data.split("_")[2]);
      AdminStates.set(userId, { state: "SEND_EVENT_NOTIFICATION", eventId });

      bot.sendMessage(
        chatId,
        "Please enter the notification message to send to all participants of this event:",
        {
          reply_markup: {
            keyboard: [[{ text: "Cancel" }]],
            resize_keyboard: true,
            one_time_keyboard: false,
          },
        }
      );

      bot.deleteMessage(chatId, messageId);
      bot.answerCallbackQuery(query.id);
    }
    // Back to events list
    else if (data === "admin_back_to_events") {
      const events = await getAllEvents();
      bot.editMessageText("Select an event:", {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: getAdminEventsKeyboard(events, 0),
      });

      bot.answerCallbackQuery(query.id);
    }
    // Edit event attributes
    else if (data.startsWith("edit_")) {
      const parts = data.split("_");
      const attribute = parts[1];
      const eventId = parseInt(parts[2]);

      AdminStates.set(userId, {
        state: `EDIT_EVENT_${attribute.toUpperCase()}`,
        eventId,
      });

      let promptMessage = "Please enter the new ";

      switch (attribute) {
        case "name":
          promptMessage += "event name:";
          break;
        case "description":
          promptMessage += "event description:";
          break;
        case "capacity":
          promptMessage += "event capacity (number):";
          break;
        case "fee":
          promptMessage += "regular event fee (number):";
          break;
        case "universityfee":
          promptMessage += "university student fee (number):";
          break;
        case "date":
          promptMessage += "event date and time (YYYY-MM-DD HH:MM):";
          break;
        case "location":
          promptMessage += "event location:";
          break;
        case "poster":
          promptMessage += "event poster (please upload an image):";
          AdminStates.set(userId, {
            state: "EDIT_EVENT_POSTER_UPLOAD",
            eventId,
          });
          break;
      }

      bot.sendMessage(chatId, promptMessage, {
        reply_markup: {
          keyboard: [[{ text: "Cancel" }]],
          resize_keyboard: true,
          one_time_keyboard: false,
        },
      });

      bot.deleteMessage(chatId, messageId);
      bot.answerCallbackQuery(query.id);
    }
    // Announcement target selection
    else if (data.startsWith("announce_")) {
      const target = data.split("_")[1];

      if (target === "all") {
        AdminStates.set(userId, { state: "SEND_ALL_NOTIFICATION" });
        bot.sendMessage(
          chatId,
          "Please enter the message to send to all bot users:",
          {
            reply_markup: {
              keyboard: [[{ text: "Cancel" }]],
              resize_keyboard: true,
              one_time_keyboard: false,
            },
          }
        );

        bot.deleteMessage(chatId, messageId);
      } else if (target === "event") {
        const events = await getAllEvents();
        bot.editMessageText("Select an event:", {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: getAdminEventsKeyboard(events, 0),
        });
      }

      bot.answerCallbackQuery(query.id);
    }
  });

  // Handle text messages for admin actions in progress
  bot.on("message", async (msg) => {
    const userId = msg.from?.id;
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!userId || !text || text === "Cancel") return;

    const userState = AdminStates.get(userId);
    if (!userState) return;

    // Create event flow
    if (userState.state === "CREATE_EVENT_NAME") {
      userState.data = { name: text };
      userState.state = "CREATE_EVENT_DESCRIPTION";

      bot.sendMessage(chatId, "Great! Now enter the event description:", {
        reply_markup: {
          keyboard: [[{ text: "Cancel" }]],
          resize_keyboard: true,
        },
      });
    } else if (userState.state === "CREATE_EVENT_DESCRIPTION") {
      userState.data.description = text;
      userState.state = "CREATE_EVENT_CAPACITY";

      bot.sendMessage(
        chatId,
        "Enter the event capacity (maximum number of participants):",
        {
          reply_markup: {
            keyboard: [[{ text: "Cancel" }]],
            resize_keyboard: true,
          },
        }
      );
    } else if (userState.state === "CREATE_EVENT_CAPACITY") {
      const capacity = parseInt(text);

      if (isNaN(capacity) || capacity <= 0) {
        bot.sendMessage(chatId, "Please enter a valid number for capacity:", {
          reply_markup: {
            keyboard: [[{ text: "Cancel" }]],
            resize_keyboard: true,
          },
        });
        return;
      }

      userState.data.capacity = capacity;
      userState.state = "CREATE_EVENT_FEE";

      bot.sendMessage(chatId, "Enter the event fee:", {
        reply_markup: {
          keyboard: [[{ text: "Cancel" }]],
          resize_keyboard: true,
        },
      });
    } else if (userState.state === "CREATE_EVENT_FEE") {
      const fee = parseFloat(text);

      if (isNaN(fee) || fee < 0) {
        bot.sendMessage(
          chatId,
          "Please enter a valid number for the regular fee:",
          {
            reply_markup: {
              keyboard: [[{ text: "Cancel" }]],
              resize_keyboard: true,
            },
          }
        );
        return;
      }

      userState.data.fee = fee;
      userState.state = "CREATE_EVENT_UNIVERSITY_FEE";

      bot.sendMessage(
        chatId,
        "Enter the event fee for university students (with student ID):",
        {
          reply_markup: {
            keyboard: [[{ text: "Cancel" }]],
            resize_keyboard: true,
          },
        }
      );
    } else if (userState.state === "CREATE_EVENT_UNIVERSITY_FEE") {
      const universityFee = parseFloat(text);

      if (isNaN(universityFee) || universityFee < 0) {
        bot.sendMessage(
          chatId,
          "Please enter a valid number for the university student fee:",
          {
            reply_markup: {
              keyboard: [[{ text: "Cancel" }]],
              resize_keyboard: true,
            },
          }
        );
        return;
      }

      userState.data.universityFee = universityFee;
      userState.state = "CREATE_EVENT_DATE";

      bot.sendMessage(
        chatId,
        "Enter the event date and time (format: YYYY-MM-DD HH:MM):",
        {
          reply_markup: {
            keyboard: [[{ text: "Cancel" }]],
            resize_keyboard: true,
          },
        }
      );
    } else if (userState.state === "CREATE_EVENT_DATE") {
      const eventDate = new Date(text);

      if (isNaN(eventDate.getTime())) {
        bot.sendMessage(
          chatId,
          "Please enter a valid date and time (format: YYYY-MM-DD HH:MM):",
          {
            reply_markup: {
              keyboard: [[{ text: "Cancel" }]],
              resize_keyboard: true,
            },
          }
        );
        return;
      }

      userState.data.eventDate = eventDate;
      userState.state = "CREATE_EVENT_LOCATION";

      bot.sendMessage(chatId, "Enter the event location:", {
        reply_markup: {
          keyboard: [[{ text: "Cancel" }]],
          resize_keyboard: true,
        },
      });
    } else if (userState.state === "CREATE_EVENT_LOCATION") {
      userState.data.location = text;
      userState.state = "CREATE_EVENT_CONFIRM";

      let message = "*Please confirm the event details:*\n\n";
      message += `Name: ${escapeMarkdown(userState.data.name)}\n`;
      message += `Description: ${escapeMarkdown(userState.data.description)}\n`;
      message += `Capacity: ${userState.data.capacity}\n`;
      message += `Regular Fee: $${userState.data.fee}\n`;
      message += `University Student Fee: $${userState.data.universityFee}\n`;
      message += `Date: ${userState.data.eventDate.toLocaleString()}\n`;
      message += `Location: ${userState.data.location}\n\n`;
      message +=
        "Is this correct? Type 'yes' to create the event or 'no' to cancel.";

      bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        reply_markup: {
          keyboard: [[{ text: "Yes" }], [{ text: "No" }]],
          resize_keyboard: true,
        },
      });
    } else if (userState.state === "CREATE_EVENT_CONFIRM") {
      if (text.toLowerCase() === "yes") {
        try {
          const event = await createEvent(userState.data);

          bot.sendMessage(
            chatId,
            `Event "${event.name}" created successfully!\n`,
            {
              reply_markup: getAdminMenuKeyboard(),
            }
          );

          AdminStates.delete(userId);
        } catch (error) {
          bot.sendMessage(chatId, "Failed to create event. Please try again.", {
            reply_markup: getAdminMenuKeyboard(),
          });
        }
      } else {
        bot.sendMessage(chatId, "Event creation cancelled.", {
          reply_markup: getAdminMenuKeyboard(),
        });
      }

      AdminStates.delete(userId);
    }
    // Event editing flows
    else if (userState.state.startsWith("EDIT_EVENT_") && userState.eventId) {
      const eventId = userState.eventId;
      const event = await getEventById(eventId);

      if (!event) {
        bot.sendMessage(chatId, "Event not found. Operation cancelled.", {
          reply_markup: getAdminMenuKeyboard(),
        });
        AdminStates.delete(userId);
        return;
      }

      const attribute = userState.state
        .replace("EDIT_EVENT_", "")
        .toLowerCase();
      const updateData: any = {};

      try {
        switch (attribute) {
          case "name":
            updateData.name = text;
            break;
          case "description":
            updateData.description = text;
            break;
          case "capacity":
            const capacity = parseInt(text);
            if (isNaN(capacity) || capacity <= 0) {
              bot.sendMessage(
                chatId,
                "Please enter a valid number for capacity. Operation cancelled.",
                {
                  reply_markup: getAdminMenuKeyboard(),
                }
              );
              AdminStates.delete(userId);
              return;
            }
            updateData.capacity = capacity;
            break;
          case "fee":
            const fee = parseFloat(text);
            if (isNaN(fee) || fee < 0) {
              bot.sendMessage(
                chatId,
                "Please enter a valid number for fee. Operation cancelled.",
                {
                  reply_markup: getAdminMenuKeyboard(),
                }
              );
              AdminStates.delete(userId);
              return;
            }
            updateData.fee = fee;
            break;
          case "universityfee":
            const universityFee = parseFloat(text);
            if (isNaN(universityFee) || universityFee < 0) {
              bot.sendMessage(
                chatId,
                "Please enter a valid number for university fee. Operation cancelled.",
                {
                  reply_markup: getAdminMenuKeyboard(),
                }
              );
              AdminStates.delete(userId);
              return;
            }
            updateData.universityFee = universityFee;
            break;
          case "date":
            const eventDate = new Date(text);
            if (isNaN(eventDate.getTime())) {
              bot.sendMessage(
                chatId,
                "Please enter a valid date (YYYY-MM-DD HH:MM). Operation cancelled.",
                {
                  reply_markup: getAdminMenuKeyboard(),
                }
              );
              AdminStates.delete(userId);
              return;
            }
            updateData.eventDate = eventDate;
            break;
          case "location":
            updateData.location = text;
            break;
        }

        await updateEvent(eventId, updateData);

        bot.sendMessage(chatId, `Event ${attribute} updated successfully!`, {
          reply_markup: getAdminMenuKeyboard(),
        });

        AdminStates.delete(userId);
      } catch (error) {
        bot.sendMessage(
          chatId,
          `Failed to update event ${attribute}. Please try again.`,
          {
            reply_markup: getAdminMenuKeyboard(),
          }
        );
        AdminStates.delete(userId);
      }
    }
    // Handle notifications
    else if (userState.state === "SEND_ALL_NOTIFICATION") {
      try {
        const users = await getAllUsers();
        let successCount = 0;
        let failCount = 0;

        for (const user of users) {
          try {
            await bot.sendMessage(user.telegramId, text);
            successCount++;
          } catch (error) {
            failCount++;
          }
        }

        bot.sendMessage(
          chatId,
          `Notification sent successfully to ${successCount} users. Failed: ${failCount}`,
          {
            reply_markup: getAdminMenuKeyboard(),
          }
        );

        AdminStates.delete(userId);
      } catch (error) {
        bot.sendMessage(
          chatId,
          "Failed to send notifications. Please try again.",
          {
            reply_markup: getAdminMenuKeyboard(),
          }
        );
        AdminStates.delete(userId);
      }
    } else if (
      userState.state === "SEND_EVENT_NOTIFICATION" &&
      userState.eventId
    ) {
      try {
        const event = await getEventById(userState.eventId);

        if (!event) {
          bot.sendMessage(chatId, "Event not found. Operation cancelled.", {
            reply_markup: getAdminMenuKeyboard(),
          });
          AdminStates.delete(userId);
          return;
        }

        // Get registrants instead of all users
        const registrants = await getEventRegistrants(userState.eventId);
        // Filter only approved registrants
        const approvedRegistrants = registrants.filter(
          (r) => r.status === RegistrationStatus.APPROVED
        );

        let successCount = 0;
        let failCount = 0;

        for (const reg of approvedRegistrants) {
          try {
            await bot.sendMessage(
              reg.user.telegramId,
              `*📢 Notification for event "${escapeMarkdown(
                event.name
              )}"*\n\n${text}`,
              { parse_mode: "Markdown" }
            );
            successCount++;
          } catch (error) {
            failCount++;
          }
        }

        bot.sendMessage(
          chatId,
          `Notification for event "${event.name}" sent successfully to ${successCount} approved participants. Failed: ${failCount}`,
          {
            reply_markup: getAdminMenuKeyboard(),
          }
        );

        AdminStates.delete(userId);
      } catch (error) {
        bot.sendMessage(
          chatId,
          "Failed to send notifications. Please try again.",
          {
            reply_markup: getAdminMenuKeyboard(),
          }
        );
        AdminStates.delete(userId);
      }
    }
  });

  // Handle photo uploads for event poster
  bot.on("photo", async (msg) => {
    const userId = msg.from?.id;
    const chatId = msg.chat.id;

    if (!userId) return;

    const userState = AdminStates.get(userId);
    if (
      !userState ||
      userState.state !== "EDIT_EVENT_POSTER_UPLOAD" ||
      !userState.eventId
    )
      return;

    try {
      const photoId = msg.photo?.[msg.photo.length - 1]?.file_id;

      if (!photoId) {
        bot.sendMessage(
          chatId,
          "Failed to process the image. Please try again.",
          {
            reply_markup: getAdminMenuKeyboard(),
          }
        );
        AdminStates.delete(userId);
        return;
      }

      // Store the file ID as the poster URL
      await updateEvent(userState.eventId, { posterImageUrl: photoId });

      bot.sendMessage(chatId, "Event poster updated successfully!", {
        reply_markup: getAdminMenuKeyboard(),
      });

      AdminStates.delete(userId);
    } catch (error) {
      bot.sendMessage(
        chatId,
        "Failed to update event poster. Please try again.",
        {
          reply_markup: getAdminMenuKeyboard(),
        }
      );
      AdminStates.delete(userId);
    }
  });
}
