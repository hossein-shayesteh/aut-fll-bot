# Registration Management

This guide explains how to manage event registrations using the FLL Telegram Bot's admin features.

## Viewing Registrations

To view registrations for an event:

1. From the admin panel, click "List of Registrants"
2. Select the event you want to view
3. The bot will display a list of all registrants with their status

For each registration, you can see:

- User's name
- Registration status (Pending, Approved, Rejected, Cancelled)
- Phone number
- Student ID (if applicable)

If there are many registrants, the bot will provide a summary showing:

- Total number of registrations
- Number of approved registrations
- Number of pending registrations
- Number of rejected registrations
- Number of cancelled registrations

## Approving and Rejecting Registrations

When a user registers for an event, their registration is initially in the "Pending" status. You'll receive a notification in the admin group with the registration details and payment proof.

To approve or reject a registration:

1. Use the inline buttons provided in the notification message
2. Click "Approve" to approve the registration or "Reject" to reject it
3. The user will be notified of your decision

When you approve a registration:

- The user's status changes to "Approved"
- The user receives a confirmation message
- The event's available capacity is updated

When you reject a registration:

- The user's status changes to "Rejected"
- The user receives a notification

## Exporting Registrant Data

To export registrant data to an Excel file:

1. View the registrants for an event
2. Click the "Export to Excel" button
3. The bot will generate and send an Excel file containing all registrant information

The Excel file includes:

- User names
- Phone numbers
- Student IDs
- Registration status
- Registration date

## Managing Event Capacity

The system automatically manages event capacity:

- When a registration is approved, it counts toward the event's capacity
- When the number of approved registrations reaches the event's capacity, the event status automatically changes to "FULL"
- If you increase an event's capacity and it was previously "FULL", it will automatically change back to "ACTIVE"

## Handling Cancellations

When a user cancels their registration:

1. You'll receive a notification in the admin group
2. The notification will include the user's details and a reminder to process a refund if applicable
3. The system automatically frees up a spot in the event's capacity

## Registration Statuses

Registrations can have one of the following statuses:

- **PENDING**: The registration has been submitted and is awaiting admin approval
- **APPROVED**: The registration has been approved by an administrator
- **REJECTED**: The registration has been rejected by an administrator
- **CANCELLED**: The registration has been cancelled by the user
