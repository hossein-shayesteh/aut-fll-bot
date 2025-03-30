import TelegramBot from "node-telegram-bot-api";
import { Event } from "../../database/models/Event";
import { Registration } from "../../database/models/Registration";
import dotenv from "dotenv";
import { getRegistrationStatusInPersian } from "../../utils/getRegistrationStatusInPersian";

dotenv.config();

export function getMainMenuKeyboard(
  isUserAdmin: boolean = false
): TelegramBot.ReplyKeyboardMarkup {
  const keyboard = [
    [{ text: "ثبت نام در رویدادها" }, { text: "وضعیت رویداد" }],
    [{ text: "پروفایل کاربر" }, { text: "دریافت لینک گروه و کانال" }],
  ];

  // Add admin panel button if user is an admin
  if (isUserAdmin) {
    keyboard.push([{ text: "پنل مدیریت" }]);
  }

  return {
    keyboard,
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

export function getCancelKeyboard(): TelegramBot.ReplyKeyboardMarkup {
  return {
    keyboard: [[{ text: "لغو" }]],
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
        { text: "ثبت نام", callback_data: `register_${eventId}` },
        { text: "بازگشت به رویدادها", callback_data: "back_to_events" },
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
        { text: "✅ تایید", callback_data: `approve_${registrationId}` },
        { text: "❌ رد", callback_data: `reject_${registrationId}` },
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
        text: `${registration.event.name} (${getRegistrationStatusInPersian(
          registration.status
        )})`,
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
          text: "لغو ثبت نام",
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
          text: "ارسال بازخورد",
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
        { text: "افزودن نظر", callback_data: `comment_${eventId}` },
        { text: "نه، ممنون", callback_data: "back_to_events" },
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
          text: "بله، امتیاز من را تغییر بده",
          callback_data: `change_rating_${eventId}`,
        },
        { text: "نه، همین خوبه", callback_data: "back_to_events" },
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
        { text: "2 ⭐", callback_data: `rate_${eventId}_2` },
        { text: "3 ⭐", callback_data: `rate_${eventId}_3` },
        { text: "4 ⭐", callback_data: `rate_${eventId}_4` },
        { text: "5 ⭐", callback_data: `rate_${eventId}_5` },
      ],
    ],
  };
}

export function getUserEditProfileKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "ویرایش نام", callback_data: "profile_edit_first_name" },
        {
          text: "ویرایش نام خانوادگی",
          callback_data: "profile_edit_last_name",
        },
      ],
      [
        { text: "ویرایش شماره تلفن", callback_data: "profile_edit_phone" },
        {
          text: "ویرایش شماره دانشجویی",
          callback_data: "profile_edit_student_id",
        },
      ],
    ],
  };
}
