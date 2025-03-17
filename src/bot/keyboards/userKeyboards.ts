import TelegramBot from "node-telegram-bot-api";
import { Event } from "../../database/models/Event";
import { Registration } from "../../database/models/Registration";

export function getMainMenuKeyboard(
  isAdmin: boolean
): TelegramBot.ReplyKeyboardMarkup {
  const keyboard = [
    [{ text: "Register for Events" }, { text: "Event Status" }],
    [{ text: "User Profile" }, { text: "Get Group & Channel Links" }],
  ];

  if (isAdmin) {
    keyboard.push([{ text: "Admin Panel" }]);
  }

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
  registrations: Registration[]
): TelegramBot.InlineKeyboardMarkup {
  const keyboard = registrations.map((registration) => {
    return [
      {
        text: `${registration.event.name} (${registration.status})`,
        callback_data: `view_registration_${registration.id}`,
      },
    ];
  });

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

export function getEventShareKeyboard(
  eventId: number
): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: "Share This Event",
          url: `https://t.me/share/url?url=https://t.me/YourBotUsername?start=event_${eventId}`,
        },
      ],
    ],
  };
}
