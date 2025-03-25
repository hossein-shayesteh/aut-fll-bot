import TelegramBot from "node-telegram-bot-api";
import { findOrCreateUser, getUserProfile } from "../../services/userService";
import { getMainMenuKeyboard } from "../keyboards/userKeyboards";
import dotenv from "dotenv";
import { startProfileEdit } from "../../utils/userHandlers/startProfileEdit";
import { handleRegisterForEvents } from "../../utils/userHandlers/handleRegisterForEvents";
import { clearUserStates } from "../../utils/userHandlers/clearUserStates";
import { handleProfileFieldUpdate } from "../../utils/userHandlers/handleProfileFieldUpdate";
import { validators } from "../../utils/validators";

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
    clearUserStates(userId);

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

      // Handle possible user profile updates using the helper function
      switch (state) {
        case "EDIT_USER_FIRST_NAME":
          await handleProfileFieldUpdate(
            bot,
            chatId,
            userId,
            "firstName",
            msg.text
          );
          return;
        case "EDIT_USER_LAST_NAME":
          await handleProfileFieldUpdate(
            bot,
            chatId,
            userId,
            "lastName",
            msg.text
          );
          return;
        case "EDIT_USER_PROFILE_PHONE":
          await handleProfileFieldUpdate(
            bot,
            chatId,
            userId,
            "phoneNumber",
            msg.text,
            validators.phoneNumber,
            "Invalid phone number format. Please enter a valid Iranian phone number (e.g., 09123456789 or +989123456789):"
          );
          return;
        case "EDIT_USER_PROFILE_STUDENTID":
          await handleProfileFieldUpdate(
            bot,
            chatId,
            userId,
            "studentId",
            msg.text,
            validators.studentId,
            "Invalid student ID format. Please enter a valid Amirkabir University student ID:"
          );
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
    // We'll handle the actual listing in `eventHandlers.ts`
    // For clarity, we trigger a function in `eventHandlers`.
    bot.emit("user_view_event_status", msg);
  });

  // Helper function to build profile message
  const buildProfileMessage = (profile: any) => {
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

    return message;
  };

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

    bot.sendMessage(chatId, buildProfileMessage(profile), {
      parse_mode: "Markdown",
      reply_markup: getMainMenuKeyboard(),
    });
  });

  bot.on("get_group_channel_links", async (msg) => {
    const chatId = msg.chat.id;

    // Provide the relevant group/channel links
    const groupLink = process.env.PUBLIC_GROUP_LINK;
    const channelLink = process.env.PUBLIC_CHANNEL_LINK;

    const message = `*Group & Channel Links*\n\n• Group: ${groupLink}\n• Channel: ${channelLink}`;
    bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: getMainMenuKeyboard(),
    });
  });

  // Profile edit commands - using the same helper function for all commands
  const profileEditCommands = [
    {
      command: /\/editfirstname/,
      state: "EDIT_USER_FIRST_NAME",
      message: "Please enter your new first name:",
    },
    {
      command: /\/editlastname/,
      state: "EDIT_USER_LAST_NAME",
      message: "Please enter your new last name:",
    },
    {
      command: /\/editphone/,
      state: "EDIT_USER_PROFILE_PHONE",
      message: "Please enter your new phone number:",
    },
    {
      command: /\/editstudentid/,
      state: "EDIT_USER_PROFILE_STUDENTID",
      message: "Please enter your new student ID:",
    },
  ];

  profileEditCommands.forEach(({ command, state, message }) => {
    bot.onText(command, (msg) => {
      startProfileEdit(bot, msg, state, message);
    });
  });
}
