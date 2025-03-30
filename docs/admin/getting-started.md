# Getting Started with Admin Features

Welcome to the admin section of the FLL Telegram Bot. This guide will help you understand how to access and use the administrative features of the bot.

## Accessing the Admin Panel

There are two ways to access the admin panel:

1. Send the `/admin` command to the bot
2. Click on the "Admin Panel" button in the main menu (only visible to administrators)

The bot will verify your admin status before granting access to the admin panel. Only users whose Telegram IDs are listed in the `ADMIN_USER_IDS` environment variable will have access.

## Admin Panel Overview

The admin panel provides access to the following features:

- **Create New Event**: Create new events with all necessary details
- **Edit Events**: Modify existing events' details
- **List of Registrants**: View and manage event registrations
- **Announcements & Notifications**: Send messages to users or event participants
- **Back to Main Menu**: Return to the regular user interface

## Navigation

- You can navigate through the admin panel using the provided buttons
- You can cancel any multi-step process by clicking the "Cancel" button
- You can return to the main menu at any time by clicking "Back to Main Menu"

## Admin Responsibilities

As an administrator, you have the following responsibilities:

1. **Event Management**: Creating, editing, and canceling events
2. **Registration Approval**: Reviewing and approving/rejecting registration requests
3. **Communication**: Sending announcements and notifications to users
4. **Monitoring**: Keeping track of event attendance and feedback

## Next Steps

Now that you're familiar with the admin panel, you can:

1. [Create and manage events](./event-management.md)
2. [Manage users](./user-management.md)
3. [Handle registrations](./registrations.md)
4. [Send announcements](./announcements.md)
5. [View reports and analytics](./reports.md)
