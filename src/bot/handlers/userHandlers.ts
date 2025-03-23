import TelegramBot from "node-telegram-bot-api";
import {
  findOrCreateUser,
  getUserProfile,
  updateUserProfile,
} from "../../services/userService";
import {
  getMainMenuKeyboard,
  getCancelKeyboard,
} from "../keyboards/userKeyboards";
import { getActiveEvents } from "../../services/eventService";
import dotenv from "dotenv";
import { registrationStates } from "./eventHandlers";
import { AdminStates } from "./adminHandlers";

dotenv.config();

// Export userStates so it can be accessed from other files
export const userStates: Map<
  number,
  {
    state: string;
    data?: any;
  }
> = new Map();

export function registerUserHandlers(bot: TelegramBot) {
  // Handle /start command
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const firstName = msg.from?.first_name;
    const lastName = msg.from?.last_name;

    if (!userId) return;

    // Clear any ongoing processes for this user
    userStates.delete(userId);

    // Also clear any registration states if they exist
    if (registrationStates) {
      registrationStates.delete(userId);
    }

    if (AdminStates) {
      AdminStates.delete(userId);
    }

    // Create or retrieve user from DB
    await findOrCreateUser(userId, firstName, lastName);

    // Send welcome message + main menu
    bot.sendMessage(
      chatId,
      "Welcome to the Amirkabir University Language Center Bot.",
      {
        reply_markup: getMainMenuKeyboard(false),
      }
    );
  });

  // Handle direct clicks on main menu text options
  bot.on("message", async (msg) => {
    if (!msg.text) return;
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (!userId) return;

    // Check if we are in the middle of a multi-step flow
    if (userStates.has(userId)) {
      const { state } = userStates.get(userId)!;

      // If the user sends "Cancel" mid-flow
      if (msg.text.toLowerCase() === "cancel") {
        userStates.delete(userId);
        bot.sendMessage(chatId, "Operation cancelled.", {
          reply_markup: getMainMenuKeyboard(false),
        });
        return;
      }

      // Handle possible user profile updates, etc.
      if (state === "EDIT_USER_PROFILE_NAME") {
        userStates.delete(userId);
        await updateUserProfile(userId, { firstName: msg.text });
        bot.sendMessage(chatId, "Name updated successfully!", {
          reply_markup: getMainMenuKeyboard(false),
        });
        return;
      } else if (state === "EDIT_USER_PROFILE_PHONE") {
        userStates.delete(userId);
        await updateUserProfile(userId, { phoneNumber: msg.text });
        bot.sendMessage(chatId, "Phone number updated successfully!", {
          reply_markup: getMainMenuKeyboard(false),
        });
        return;
      } else if (state === "EDIT_USER_PROFILE_STUDENTID") {
        userStates.delete(userId);
        await updateUserProfile(userId, { studentId: msg.text });
        bot.sendMessage(chatId, "Student ID updated successfully!", {
          reply_markup: getMainMenuKeyboard(false),
        });
        return;
      }
    }

    // Main menu actions
    switch (msg.text) {
      case "Register for Events":
        await handleRegisterForEvents(bot, msg);
        break;

      case "Event Status":
        bot.emit("check_event_status", msg);
        break;

      case "User Profile":
        bot.emit("view_user_profile", msg);
        break;

      case "Get Group & Channel Links":
        bot.emit("get_group_channel_links", msg);
        break;

      default:
        // Let other handlers catch
        break;
    }
  });

  // Separate events for clarity:
  bot.on("check_event_status", async (msg) => {
    if (!msg.from?.id) return;
    const chatId = msg.chat.id;
    // We’ll handle the actual listing in `eventHandlers.ts`
    // For clarity, we trigger a function in `eventHandlers`.
    bot.emit("user_view_event_status", msg);
  });

  bot.on("view_user_profile", async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (!userId) return;

    const profile = await getUserProfile(userId);
    if (!profile) {
      bot.sendMessage(chatId, "Profile not found.", {
        reply_markup: getMainMenuKeyboard(false),
      });
      return;
    }

    let message = `*Your Profile*\n\n`;
    message += `First Name: ${profile.firstName ?? ""}\n`;
    message += `Last Name: ${profile.lastName ?? ""}\n`;
    message += `Phone Number: ${profile.phoneNumber ?? ""}\n`;
    message += `Student ID: ${profile.studentId ?? ""}\n`;

    message += `\nYou can update your info:\n`;
    message += "• Type /editname to update name\n";
    message += "• Type /editphone to update phone number\n";
    message += "• Type /editstudentid to update student ID";

    bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: getMainMenuKeyboard(false),
    });
  });

  bot.on("get_group_channel_links", async (msg) => {
    const chatId = msg.chat.id;

    // Provide the relevant group/channel links
    // (Replace the placeholders with your actual links)
    const groupLink = process.env.PUBLIC_GROUP_LINK;
    const channelLink = process.env.PUBLIC_CHANNEL_LINK;

    const message = `*Group & Channel Links*\n\n• Group: ${groupLink}\n• Channel: ${channelLink}`;
    bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: getMainMenuKeyboard(false),
    });
  });

  // Profile edit commands
  bot.onText(/\/editname/, (msg) => {
    if (!msg.from?.id) return;
    const chatId = msg.chat.id;
    userStates.set(msg.from.id, { state: "EDIT_USER_PROFILE_NAME" });
    bot.sendMessage(chatId, "Please enter your new name:", {
      reply_markup: getCancelKeyboard(),
    });
  });

  bot.onText(/\/editphone/, (msg) => {
    if (!msg.from?.id) return;
    const chatId = msg.chat.id;
    userStates.set(msg.from.id, { state: "EDIT_USER_PROFILE_PHONE" });
    bot.sendMessage(chatId, "Please enter your new phone number:", {
      reply_markup: getCancelKeyboard(),
    });
  });

  bot.onText(/\/editstudentid/, (msg) => {
    if (!msg.from?.id) return;
    const chatId = msg.chat.id;
    userStates.set(msg.from.id, { state: "EDIT_USER_PROFILE_STUDENTID" });
    bot.sendMessage(chatId, "Please enter your new student ID:", {
      reply_markup: getCancelKeyboard(),
    });
  });
}

// Helper function for “Register for Events”
async function handleRegisterForEvents(
  bot: TelegramBot,
  msg: TelegramBot.Message
) {
  const chatId = msg.chat.id;
  // Get only active (or upcoming) events
  const events = await getActiveEvents();
  if (events.length === 0) {
    bot.sendMessage(chatId, "No upcoming events at the moment.", {
      reply_markup: getMainMenuKeyboard(false),
    });
    return;
  }

  // Ask user to choose from a list of events (inline keyboard)
  const inlineKeyboard = events.map((ev) => [
    {
      text: ev.name,
      callback_data: `view_event_${ev.id}`, // We'll handle in eventHandlers
    },
  ]);

  bot.sendMessage(chatId, "Select an event to register:", {
    reply_markup: {
      inline_keyboard: inlineKeyboard,
    },
  });
}
