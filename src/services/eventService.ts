import { MoreThan, LessThan } from "typeorm";
import { AppDataSource } from "../database";
import { Event, EventStatus } from "../database/models/Event";
import {
  Registration,
  RegistrationStatus,
} from "../database/models/Registration";

const eventRepository = AppDataSource.getRepository(Event);
const registrationRepository = AppDataSource.getRepository(Registration);

export async function createEvent(eventData: Partial<Event>): Promise<Event> {
  const event = new Event();

  // Set properties from eventData
  Object.assign(event, eventData);

  return await eventRepository.save(event);
}

export async function updateEvent(
  id: number,
  newData: Partial<Event>
): Promise<Event | null> {
  const event = await eventRepository.findOne({ where: { id } });

  if (!event) {
    return null;
  }

  const originalStatus = event.status;
  const originalCapacity = event.capacity;
  const originalEventDate = event.eventDate;

  const newCapacity = newData.capacity;
  const newEventDate = newData.eventDate;

  // Store the updated event data
  Object.assign(event, newData);

  if (newEventDate || newCapacity) {
    const now = new Date();

    // If event was COMPLETED but new date is in the future, make it ACTIVE
    if (
      originalStatus === EventStatus.COMPLETED &&
      newEventDate &&
      newEventDate > now
    ) {
      event.status = EventStatus.ACTIVE;
    }

    // If event was CANCELLED but new date is later than original, make it ACTIVE
    if (
      originalStatus === EventStatus.CANCELLED &&
      newEventDate &&
      newEventDate > originalEventDate
    ) {
      event.status = EventStatus.ACTIVE;
    }

    // If event was FULL but capacity increased, make it ACTIVE
    if (
      originalStatus === EventStatus.FULL &&
      newCapacity &&
      newCapacity > originalCapacity
    ) {
      event.status = EventStatus.ACTIVE;
    }
  }

  await eventRepository.save(event);
  return event;
}

export async function getEventById(id: number): Promise<Event | null> {
  return eventRepository.findOne({
    where: { id },
    relations: ["registrations", "registrations.user"],
  });
}

export async function getAllEvents(): Promise<Event[]> {
  return eventRepository.find({ order: { eventDate: "ASC" } });
}

export async function getFullAndActiveEvents(): Promise<Event[]> {
  return eventRepository.find({
    where: [{ status: EventStatus.ACTIVE }, { status: EventStatus.FULL }],
    order: { eventDate: "ASC" },
  });
}

export async function checkEventCapacity(eventId: number): Promise<boolean> {
  const event = await eventRepository.findOne({
    where: { id: eventId },
    relations: ["registrations"],
  });

  if (!event) {
    return false;
  }

  const approvedRegistrations = await registrationRepository.count({
    where: {
      eventId,
      status: RegistrationStatus.APPROVED,
    },
  });

  // If the number of approved registrations reaches the capacity
  if (approvedRegistrations >= event.capacity) {
    // Update event status to FULL
    event.status = EventStatus.FULL;
    await eventRepository.save(event);
    return false;
  }

  return true;
}

export async function updateEventStatus(
  eventId: number,
  status: EventStatus
): Promise<Event | null> {
  const event = await eventRepository.findOne({ where: { id: eventId } });

  if (!event) {
    return null;
  }

  event.status = status;
  await eventRepository.save(event);
  return event;
}

export async function getUpcomingEvents(): Promise<Event[]> {
  const now = new Date();

  return eventRepository.find({
    where: [
      { eventDate: MoreThan(now), status: EventStatus.ACTIVE },
      { eventDate: MoreThan(now), status: EventStatus.FULL },
    ],
    order: { eventDate: "ASC" },
  });
}

export async function getEventRegistrants(
  eventId: number
): Promise<Registration[]> {
  return registrationRepository.find({
    where: { eventId },
    relations: ["user"],
    order: { registrationDate: "DESC" },
  });
}

export async function updateCompletedEvents(): Promise<void> {
  const now = new Date();
  // Calculate the time 2 hours ago
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  // Find events that have ended (event date is more than 2 hours ago)
  // and are still marked as ACTIVE or FULL
  const eventsToComplete = await eventRepository.find({
    where: [
      { eventDate: LessThan(twoHoursAgo), status: EventStatus.ACTIVE },
      { eventDate: LessThan(twoHoursAgo), status: EventStatus.FULL },
    ],
  });

  // Update each event's status to COMPLETED
  for (const event of eventsToComplete) {
    event.status = EventStatus.COMPLETED;
    await eventRepository.save(event);
  }
}
