# Event Management Telegram Bot

This project is a Telegram bot for managing events, registrations, and user profiles. It includes functionality for both administrators and users. Administrators can manage events, view registrants, and send announcements, while users can register for events, view event details, and check their registration status.

## Documentation

For detailed instructions on how to use the bot:

- [User Documentation](./docs/user/README.md) - For end users of the bot
- [Admin Documentation](./docs/admin/README.md) - For administrators

## Features

### For Admins

- **Create New Events**: Create events with details such as name, description, fee, date, and location.
- **Edit Events**: Edit event details like name, description, capacity, fee, date, and location.
- **View Registrants**: View the list of people registered for an event.
- **Send Announcements**: Send notifications to all users or specific event participants.
- **Cancel Events**: Cancel events and notify all registrants.
- **Manage Registrations**: Approve, reject, or cancel event registrations.

### For Users

- **Register for Events**: Choose from active events and register.
- **View Event Details**: See event details such as date, time, description, fee, and location.
- **Check Registration Status**: View your registrations and their status (approved, pending, etc.).
- **Update Profile**: Users can update their personal details like name, phone number, and student ID.

## Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/yourusername/telegram-event-bot.git
   ```

2. **Install dependencies**:

   ```bash
   cd telegram-event-bot
   npm install
   ```

3. **Install dependencies**:

   ```bash
    DATABASE_PATH=./database.sqlite
    NODE_ENV=development
    TELEGRAM_TOKEN=your_telegram_bot_token
    BOT_ID=bot_id
    ADMIN_USER_IDS=admin_ids
    ADMIN_GROUP_ID=admin_group_id
    PUBLIC_GROUP_LINK=public_group_link
    PUBLIC_CHANNEL_LINK=public_channel_link
   ```

4. **Run the bot**:

   ```bash
   npm run build
   npm run start
   ```

## Technologies Used

- **Node.js**: Backend runtime.
- **TypeScript**: Language for writing the bot logic.
- **Telegram Bot API**: The primary API for interacting with Telegram users.
- **TypeORM**: Object-relational mapper to manage database operations.
- **SQLite**: Database to store event, registration, and user data.
