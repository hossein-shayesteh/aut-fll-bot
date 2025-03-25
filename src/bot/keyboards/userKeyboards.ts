import TelegramBot from "node-telegram-bot-api";
import { Event } from "../../database/models/Event";
import { Registration } from "../../database/models/Registration";
import dotenv from "dotenv";

dotenv.config();

export function getMainMenuKeyboard(): TelegramBot.ReplyKeyboardMarkup {
  const keyboard = [
    [{ text: "Register for Events" }, { text: "Event Status" }],
    [{ text: "User Profile" }, { text: "Get Group & Channel Links" }],
  ];

  return {
    keyboard,
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

export function getCancelKeyboard(): TelegramBot.ReplyKeyboardMarkup {
  return {
    keyboard: [[{ text: "Cancel" }]],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

export function getEventsKeyboard(
  events: Event[]
): TelegramBot.InlineKeyboardMarkup {
  const keyboard = events.map((event) => {
    return [{ text: event.name, callback_data: `event_${event.id}` }];
  });

  return {
    inline_keyboard: keyboard,
  };
}

export function getEventDetailsKeyboard(
  eventId: number
): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "Register", callback_data: `register_${eventId}` },
        { text: "Back to Events", callback_data: "back_to_events" },
      ],
    ],
  };
}

export function getRegistrationApprovalKeyboard(
  registrationId: number
): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `approve_${registrationId}` },
        { text: "❌ Reject", callback_data: `reject_${registrationId}` },
      ],
    ],
  };
}

export function getUserRegistrationsKeyboard(
  registrations: Registration[],
  page: number = 0,
  pageSize: number = 5
): TelegramBot.InlineKeyboardMarkup {
  // Calculate total pages
  const totalPages = Math.ceil(registrations.length / pageSize);

  // Get current page items
  const startIndex = page * pageSize;
  const currentPageItems = registrations.slice(
    startIndex,
    startIndex + pageSize
  );

  // Create keyboard buttons for current page items
  const keyboard = currentPageItems.map((registration) => {
    return [
      {
        text: `${registration.event.name} (${registration.status})`,
        callback_data: `view_registration_${registration.id}`,
      },
    ];
  });

  // Add navigation buttons if needed
  const navigationRow = [];
  if (page > 0) {
    navigationRow.push({
      text: "◀️",
      callback_data: `reg_page_${page - 1}`,
    });
  }

  if (page < totalPages - 1) {
    navigationRow.push({
      text: "▶️",
      callback_data: `reg_page_${page + 1}`,
    });
  }

  // Add page indicator
  if (totalPages > 1) {
    navigationRow.push({
      text: `${page + 1}/${totalPages}`,
      callback_data: "ignore",
    });
  }

  // Add navigation row if it has buttons
  if (navigationRow.length > 0) {
    keyboard.push(navigationRow);
  }

  return {
    inline_keyboard: keyboard,
  };
}

export function getRegistrationDetailsKeyboard(
  registration: Registration
): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: "Cancel Registration",
          callback_data: `cancel_registration_${registration.id}`,
        },
      ],
    ],
  };
}

export function getFeedbackSubmissionKeyboard(
  registration: Registration
): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: "Submit Feedback",
          callback_data: `feedback_${registration.event.id}`,
        },
      ],
    ],
  };
}

export function getAddCommentKeyboard(
  eventId: number
): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "Add Comment", callback_data: `comment_${eventId}` },
        { text: "No, Thanks", callback_data: "back_to_events" },
      ],
    ],
  };
}

export function getChangeFeedbackKeyboard(
  eventId: number
): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: "Yes, change my rating",
          callback_data: `change_rating_${eventId}`,
        },
        { text: "No, keep it", callback_data: "back_to_events" },
      ],
    ],
  };
}

export function getFeedbackRatingKeyboard(
  eventId: number
): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "1 ⭐", callback_data: `rate_${eventId}_1` },
        { text: "2 ⭐⭐", callback_data: `rate_${eventId}_2` },
        { text: "3 ⭐⭐⭐", callback_data: `rate_${eventId}_3` },
        { text: "4 ⭐⭐⭐⭐", callback_data: `rate_${eventId}_4` },
        { text: "5 ⭐⭐⭐⭐⭐", callback_data: `rate_${eventId}_5` },
      ],
    ],
  };
}
