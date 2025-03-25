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
import dotenv from "dotenv";
import { registrationStates } from "./eventHandlers";
import { AdminStates } from "./adminHandlers";
import { startProfileEdit } from "../../utils/userHandlers/startProfileEdit";
import { handleRegisterForEvents } from "../../utils/userHandlers/handleRegisterForEvents";

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
        reply_markup: getMainMenuKeyboard(),
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
          reply_markup: getMainMenuKeyboard(),
        });
        return;
      }

      // Handle possible user profile updates, etc.
      if (state === "EDIT_USER_FIRST_NAME") {
        userStates.delete(userId);
        await updateUserProfile(userId, { firstName: msg.text });
        bot.sendMessage(chatId, "First name updated successfully!", {
          reply_markup: getMainMenuKeyboard(),
        });
        return;
      } else if (state === "EDIT_USER_LAST_NAME") {
        userStates.delete(userId);
        await updateUserProfile(userId, { lastName: msg.text });
        bot.sendMessage(chatId, "Last name updated successfully!", {
          reply_markup: getMainMenuKeyboard(),
        });
        return;
      } else if (state === "EDIT_USER_PROFILE_PHONE") {
        // Validate phone number format
        const phoneRegex = /((09)|(\+?989))\d{2}[-\s]?\d{3}[-\s]?\d{4}/g;
        if (!phoneRegex.test(msg.text)) {
          bot.sendMessage(
            chatId,
            "Invalid phone number format. Please enter a valid Iranian phone number (e.g., 09123456789 or +989123456789):",
            {
              reply_markup: getCancelKeyboard(),
            }
          );
          return;
        }

        userStates.delete(userId);
        await updateUserProfile(userId, { phoneNumber: msg.text });
        bot.sendMessage(chatId, "Phone number updated successfully!", {
          reply_markup: getMainMenuKeyboard(),
        });
        return;
      } else if (state === "EDIT_USER_PROFILE_STUDENTID") {
        // Validate student ID format
        const studentIdRegex =
          /^(?:(?:9[6-9]|40[0-4])(?:(?:2[2-9]|3[0-4]|39|1[0-3])|1(?:2[2-9]|3[0-4]|39|1[0-3])|2(?:2[2-9]|3[0-4]|39|1[0-3]))(?:\d{3}))$/;
        if (!studentIdRegex.test(msg.text)) {
          bot.sendMessage(
            chatId,
            "Invalid student ID format. Please enter a valid Amirkabir University student ID:",
            {
              reply_markup: getCancelKeyboard(),
            }
          );
          return;
        }

        userStates.delete(userId);
        await updateUserProfile(userId, { studentId: msg.text });
        bot.sendMessage(chatId, "Student ID updated successfully!", {
          reply_markup: getMainMenuKeyboard(),
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
        reply_markup: getMainMenuKeyboard(),
      });
      return;
    }

    let message = `*Your Profile*\n\n`;
    message += `First Name: ${profile.firstName ?? ""}\n`;
    message += `Last Name: ${profile.lastName ?? ""}\n`;
    message += `Phone Number: ${profile.phoneNumber ?? ""}\n`;
    message += `Student ID: ${profile.studentId ?? ""}\n`;

    message += `\nYou can update your info:\n`;
    message += "• Type /editfirstname to update first name\n";
    message += "• Type /editlastname to update last name\n";
    message += "• Type /editphone to update phone number\n";
    message += "• Type /editstudentid to update student ID";

    bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: getMainMenuKeyboard(),
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
      reply_markup: getMainMenuKeyboard(),
    });
  });

  // Profile edit commands
  bot.onText(/\/editfirstname/, (msg) => {
    startProfileEdit(
      bot,
      msg,
      "EDIT_USER_FIRST_NAME",
      "Please enter your new first name:"
    );
  });

  bot.onText(/\/editlastname/, (msg) => {
    startProfileEdit(
      bot,
      msg,
      "EDIT_USER_LAST_NAME",
      "Please enter your new last name:"
    );
  });

  bot.onText(/\/editphone/, (msg) => {
    startProfileEdit(
      bot,
      msg,
      "EDIT_USER_PROFILE_PHONE",
      "Please enter your new phone number:"
    );
  });

  bot.onText(/\/editstudentid/, (msg) => {
    startProfileEdit(
      bot,
      msg,
      "EDIT_USER_PROFILE_STUDENTID",
      "Please enter your new student ID:"
    );
  });
}
