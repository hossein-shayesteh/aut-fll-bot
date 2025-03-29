import TelegramBot from "node-telegram-bot-api";
import { findOrCreateUser, getUserProfile } from "../../services/userService";
import {
  getMainMenuKeyboard,
  getUserEditProfileKeyboard,
} from "../keyboards/userKeyboards";
import dotenv from "dotenv";
import { handleRegisterForEvents } from "../../utils/userHandlers/handleRegisterForEvents";
import { clearUserStates } from "../../utils/userHandlers/clearUserStates";
import { handleProfileFieldUpdate } from "../../utils/userHandlers/handleProfileFieldUpdate";
import { validators } from "../../utils/validators";
import { isAdminUser } from "../../middlewares/authMiddleware";
import { escapeMarkdown } from "../../utils/escapeMarkdown";

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

    const userIsAdmin = await isAdminUser(userId);

    // Clear any ongoing processes for this user
    clearUserStates(userId);

    // Create or retrieve user from DB
    await findOrCreateUser(userId, firstName, lastName);

    // Send welcome message + main menu
    bot.sendMessage(
      chatId,
      "Welcome to the Amirkabir University Language Center Bot.",
      {
        reply_markup: getMainMenuKeyboard(userIsAdmin),
      }
    );
  });

  // Handle direct clicks on main menu text options
  bot.on("message", async (msg) => {
    if (!msg.text) return;
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (!userId) return;

    const userIsAdmin = await isAdminUser(userId);

    // Check if we are in the middle of a multi-step flow
    if (userStates.has(userId)) {
      const { state, data } = userStates.get(userId)!;

      // If the user sends "Cancel" mid-flow
      if (msg.text.toLowerCase() === "cancel") {
        userStates.delete(userId);
        bot.sendMessage(chatId, "Operation cancelled.", {
          reply_markup: getMainMenuKeyboard(userIsAdmin),
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

          // If we should return to profile view after update
          if (data?.returnToProfile) {
            const updatedProfile = await getUserProfile(userId);
            if (updatedProfile) {
              bot.sendMessage(chatId, buildProfileMessage(updatedProfile), {
                parse_mode: "Markdown",
                reply_markup: getUserEditProfileKeyboard(),
              });
            }
          }
          return;

        case "EDIT_USER_LAST_NAME":
          await handleProfileFieldUpdate(
            bot,
            chatId,
            userId,
            "lastName",
            msg.text
          );

          // If we should return to profile view after update
          if (data?.returnToProfile) {
            const updatedProfile = await getUserProfile(userId);
            if (updatedProfile) {
              bot.sendMessage(chatId, buildProfileMessage(updatedProfile), {
                parse_mode: "Markdown",
                reply_markup: getUserEditProfileKeyboard(),
              });
            }
          }
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

          // If we should return to profile view after update
          if (data?.returnToProfile) {
            const updatedProfile = await getUserProfile(userId);
            if (updatedProfile) {
              bot.sendMessage(chatId, buildProfileMessage(updatedProfile), {
                parse_mode: "Markdown",
                reply_markup: getUserEditProfileKeyboard(),
              });
            }
          }
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

          // If we should return to profile view after update
          if (data?.returnToProfile) {
            const updatedProfile = await getUserProfile(userId);
            if (updatedProfile) {
              bot.sendMessage(chatId, buildProfileMessage(updatedProfile), {
                parse_mode: "Markdown",
                reply_markup: getUserEditProfileKeyboard(),
              });
            }
          }
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

      case "Go to Admin Panel":
        bot.emit("command", {
          ...msg,
          text: "/admin",
        });
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
    message += `First Name: ${escapeMarkdown(profile.firstName) ?? ""}\n`;
    message += `Last Name: ${escapeMarkdown(profile.lastName) ?? ""}\n`;
    message += `Phone Number: ${profile.phoneNumber ?? ""}\n`;
    message += `Student ID: ${profile.studentId ?? ""}\n`;

    return message;
  };

  bot.on("view_user_profile", async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (!userId) return;

    const userIsAdmin = await isAdminUser(userId);

    const profile = await getUserProfile(userId);
    if (!profile) {
      bot.sendMessage(chatId, "Profile not found.", {
        reply_markup: getMainMenuKeyboard(userIsAdmin),
      });
      return;
    }

    bot.sendMessage(chatId, buildProfileMessage(profile), {
      parse_mode: "Markdown",
      reply_markup: getUserEditProfileKeyboard(),
    });
  });

  // Handle inline keyboard callbacks for profile editing
  bot.on("callback_query", async (query) => {
    if (!query.data) return;

    const chatId = query.message?.chat.id;
    const userId = query.from.id;
    const data = query.data;
    const messageId = query.message?.message_id;

    if (!chatId || !messageId) return;

    // Acknowledge the callback query
    bot.answerCallbackQuery(query.id);

    const userIsAdmin = await isAdminUser(userId);

    // Only delete messages for profile-related actions
    const profileActions = [
      "profile_edit_first_name",
      "profile_edit_last_name",
      "profile_edit_phone",
      "profile_edit_student_id",
      "back_to_main",
    ];

    if (profileActions.includes(data)) {
      // Delete the current profile message only for profile-related actions
      bot.deleteMessage(chatId, messageId);
    }

    if (data === "back_to_main") {
      clearUserStates(userId);
      bot.sendMessage(chatId, "Returning to main menu", {
        reply_markup: getMainMenuKeyboard(userIsAdmin),
      });
      return;
    }

    // Handle profile edit options
    switch (data) {
      case "profile_edit_first_name":
        userStates.set(userId, {
          state: "EDIT_USER_FIRST_NAME",
          data: { returnToProfile: true },
        });
        bot.sendMessage(chatId, "Please enter your new first name:");
        break;

      case "profile_edit_last_name":
        userStates.set(userId, {
          state: "EDIT_USER_LAST_NAME",
          data: { returnToProfile: true },
        });
        bot.sendMessage(chatId, "Please enter your new last name:");
        break;

      case "profile_edit_phone":
        userStates.set(userId, {
          state: "EDIT_USER_PROFILE_PHONE",
          data: { returnToProfile: true },
        });
        bot.sendMessage(chatId, "Please enter your new phone number:");
        break;

      case "profile_edit_student_id":
        userStates.set(userId, {
          state: "EDIT_USER_PROFILE_STUDENTID",
          data: { returnToProfile: true },
        });
        bot.sendMessage(chatId, "Please enter your new student ID:");
        break;
    }
  });

  bot.on("get_group_channel_links", async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (!userId) return;

    const userIsAdmin = await isAdminUser(userId);

    // Provide the relevant group/channel links
    const groupLink = process.env.PUBLIC_GROUP_LINK;
    const channelLink = process.env.PUBLIC_CHANNEL_LINK;

    const message = `*Group & Channel Links*\n\n• Group: ${groupLink}\n• Channel: ${channelLink}`;
    bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: getMainMenuKeyboard(userIsAdmin),
    });
  });
}
