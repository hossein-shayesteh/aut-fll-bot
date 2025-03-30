# Announcements & Notifications

This guide explains how to send announcements and notifications to users through the FLL Telegram Bot's admin features.

## Types of Announcements

The bot supports two types of announcements:

1. **Global Announcements**: Sent to all users of the bot
2. **Event-Specific Notifications**: Sent only to participants of a specific event

## Sending Global Announcements

To send a message to all bot users:

1. From the admin panel, click "Announcements & Notifications"
2. Select "All Users"
3. Enter the message you want to send
4. The bot will send the message to all registered users
5. After completion, you'll receive a summary showing how many messages were sent successfully and how many failed

## Sending Event-Specific Notifications

To send a message to participants of a specific event:

1. From the admin panel, click "Announcements & Notifications"
2. Select "Event Participants"
3. Choose the event from the list
4. Enter the message you want to send
5. The bot will send the message only to users with approved registrations for that event
6. After completion, you'll receive a summary showing how many messages were sent successfully and how many failed

Alternatively, you can also send notifications to event participants from the event details page:

1. From the admin panel, click "Edit Events"
2. Select the event
3. Click "Send Notification to Participants"
4. Enter your message
5. The bot will send the message to all approved participants

## Event Cancellation Notifications

When you cancel an event, the system automatically:

1. Changes the event status to "CANCELLED"
2. Sends a notification to all approved registrants
3. Sends a summary message to the admin group

The cancellation notification includes:

- The event name
- The original event date
- A notice that the event has been cancelled

## Best Practices for Announcements

When sending announcements:

1. **Be Clear and Concise**: Keep messages clear and to the point
2. **Include Necessary Information**: Make sure to include all relevant details
3. **Consider Timing**: Avoid sending announcements at very late or early hours
4. **Use Sparingly**: Send announcements only when necessary to avoid overwhelming users
5. **Format Properly**: You can use Markdown formatting in your messages (e.g., _italic_, **bold**)

## Notification Delivery

The bot attempts to deliver messages to all intended recipients, but delivery may fail for some users if:

- They have blocked the bot
- They have deleted their Telegram account
- There are network issues

The summary you receive after sending announcements will show how many messages were delivered successfully and how many failed.
