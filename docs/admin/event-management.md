# Event Management

This guide explains how to create, edit, and manage events using the FLL Telegram Bot's admin features.

## Creating a New Event

To create a new event:

1. From the admin panel, click "Create New Event"
2. The bot will guide you through a step-by-step process to collect all necessary information:
   - **Event Name**: Enter a name for the event
   - **Description**: Provide a detailed description of the event
   - **Capacity**: Set the maximum number of participants
   - **Regular Fee**: Set the standard registration fee
   - **University Student Fee**: Set a discounted fee for university students
   - **Date and Time**: Enter the event date and time in YYYY-MM-DD HH:MM format
   - **Location**: Specify where the event will take place
3. After entering all details, the bot will show a summary and ask for confirmation
4. Type "Yes" to create the event or "No" to cancel

## Viewing Events

To view all events:

1. From the admin panel, click "Edit Events"
2. The bot will display a list of all events
3. Use the pagination buttons to navigate through the list if there are many events

## Editing an Event

To edit an existing event:

1. From the admin panel, click "Edit Events"
2. Select the event you want to edit from the list
3. Click "Edit Event" from the event actions menu
4. Choose which attribute you want to edit:
   - Name
   - Description
   - Capacity
   - Fee
   - University Fee
   - Date
   - Location
   - Poster
5. Enter the new value for the selected attribute
6. The bot will update the event and show the edit options again

### Important Notes About Editing Events

When editing certain attributes, the event status may automatically change:

- If an event was marked as COMPLETED but you change the date to a future date, it will become ACTIVE again
- If an event was CANCELLED but you set a new date later than the original date, it will become ACTIVE
- If an event was FULL but you increase the capacity, it will become ACTIVE again

## Canceling an Event

To cancel an event:

1. From the admin panel, click "Edit Events"
2. Select the event you want to cancel
3. Click "Cancel Event" from the event actions menu
4. Confirm your decision

When you cancel an event:

- The event status will change to CANCELLED
- All approved registrants will receive a notification
- A summary message will be sent to the admin group
- Only ACTIVE or FULL events can be cancelled

## Event Statuses

Events can have one of the following statuses:

- **ACTIVE**: The event is upcoming and accepting registrations
- **FULL**: The event has reached its capacity and is no longer accepting registrations
- **COMPLETED**: The event has already taken place (automatically updated by the system)
- **CANCELLED**: The event has been cancelled by an administrator

## Viewing Event Feedback

To view feedback for an event:

1. From the admin panel, click "Edit Events"
2. Select the event
3. Click "View Feedback" from the event actions menu

The feedback section shows:

- Average rating for the event
- Individual feedback entries with ratings and comments
