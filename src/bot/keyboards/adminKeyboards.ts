import TelegramBot from "node-telegram-bot-api";
import { Event } from "../../database/models/Event";

export function getAdminMenuKeyboard(): TelegramBot.ReplyKeyboardMarkup {
  return {
    keyboard: [
      [{ text: "Create New Event" }, { text: "Edit Events" }],
      [
        { text: "List of Registrants" },
        { text: "Announcements & Notifications" },
      ],
      [{ text: "Back to Main Menu" }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

export function getAdminEventsKeyboard(
  events: Event[],
  page: number = 0,
  pageSize: number = 5
): TelegramBot.InlineKeyboardMarkup {
  // Calculate total pages
  const totalPages = Math.ceil(events.length / pageSize);

  // Get current page items
  const startIndex = page * pageSize;
  const currentPageItems = events.slice(startIndex, startIndex + pageSize);

  // Create keyboard buttons for current page items
  const keyboard = currentPageItems.map((event) => {
    return [{ text: event.name, callback_data: `admin_event_${event.id}` }];
  });

  // Add navigation buttons if needed
  const navigationRow = [];
  if (page > 0) {
    navigationRow.push({ text: "◀️", callback_data: `admin_page_${page - 1}` });
  }

  if (page < totalPages - 1) {
    navigationRow.push({ text: "▶️", callback_data: `admin_page_${page + 1}` });
  }

  // Add page indicator if multiple pages
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

export function getAdminEventActionsKeyboard(
  eventId: number
): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "Edit Details", callback_data: `edit_event_${eventId}` },
        {
          text: "View Registrants",
          callback_data: `view_registrants_${eventId}`,
        },
      ],
      [
        { text: "Send Notification", callback_data: `notify_event_${eventId}` },
        { text: "Cancel Event", callback_data: `cancel_event_${eventId}` },
      ],
      [
        { text: "View Feedback", callback_data: `view_feedback_${eventId}` },
        { text: "Back", callback_data: "admin_back_to_events" },
      ],
    ],
  };
}

export function getEventEditKeyboard(eventId: number) {
  return {
    inline_keyboard: [
      [
        { text: "Edit Name", callback_data: `edit_name_${eventId}` },
        {
          text: "Edit Description",
          callback_data: `edit_description_${eventId}`,
        },
      ],
      [
        { text: "Edit Capacity", callback_data: `edit_capacity_${eventId}` },
        { text: "Edit Regular Fee", callback_data: `edit_fee_${eventId}` },
      ],
      [
        {
          text: "Edit University Fee",
          callback_data: `edit_universityfee_${eventId}`,
        },
        { text: "Edit Date", callback_data: `edit_date_${eventId}` },
      ],
      [
        { text: "Edit Location", callback_data: `edit_location_${eventId}` },
        { text: "Edit Poster", callback_data: `edit_poster_${eventId}` },
      ],
      [{ text: "Back", callback_data: `admin_event_${eventId}` }],
    ],
  };
}

export function getAnnouncementTargetKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "All Users", callback_data: "announce_all" }],
      [{ text: "Specific Event", callback_data: "announce_event" }],
    ],
  };
}

export function getConfirmCancelEventKeyboard(
  eventId: number
): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: "Yes, Cancel Event",
          callback_data: `confirm_cancel_event_${eventId}`,
        },
        { text: "No, Keep Event", callback_data: `admin_event_${eventId}` },
      ],
    ],
  };
}
