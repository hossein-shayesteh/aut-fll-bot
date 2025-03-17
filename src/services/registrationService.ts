import { AppDataSource } from "../database";
import {
  Registration,
  RegistrationStatus,
} from "../database/models/Registration";
import { Event, EventStatus } from "../database/models/Event";
import { checkEventCapacity } from "./eventService";

const registrationRepository = AppDataSource.getRepository(Registration);
const eventRepository = AppDataSource.getRepository(Event);

export async function createRegistration(
  userTelegramId: number,
  eventId: number,
  receiptImageUrl?: string
): Promise<Registration | null> {
  // Check if event exists and has capacity
  const hasCapacity = await checkEventCapacity(eventId);
  if (!hasCapacity) {
    return null;
  }

  // Check if user already registered for this event
  const existingRegistration = await registrationRepository.findOne({
    where: {
      userTelegramId,
      eventId,
    },
  });

  if (existingRegistration) {
    // If already registered but was rejected, allow to re-register
    if (existingRegistration.status === RegistrationStatus.REJECTED) {
      existingRegistration.status = RegistrationStatus.PENDING;
      existingRegistration.receiptImageUrl = receiptImageUrl;
      existingRegistration.registrationDate = new Date();
      return await registrationRepository.save(existingRegistration);
    }
    return existingRegistration;
  }

  // Create new registration
  const registration = new Registration();
  registration.userTelegramId = userTelegramId;
  registration.eventId = eventId;
  registration.status = RegistrationStatus.PENDING;
  if (receiptImageUrl) {
    registration.receiptImageUrl = receiptImageUrl;
  }

  return await registrationRepository.save(registration);
}

export async function updateRegistrationStatus(
  registrationId: number,
  status: RegistrationStatus
): Promise<Registration | null> {
  const registration = await registrationRepository.findOne({
    where: { id: registrationId },
    relations: ["event"],
  });

  if (!registration) {
    return null;
  }

  registration.status = status;
  await registrationRepository.save(registration);

  // If status is approved, check if event capacity is now full
  if (status === RegistrationStatus.APPROVED) {
    await checkEventCapacity(registration.eventId);
  }

  return registration;
}

export async function cancelRegistration(
  userTelegramId: number,
  eventId: number
): Promise<boolean> {
  const registration = await registrationRepository.findOne({
    where: {
      userTelegramId,
      eventId,
    },
  });

  if (!registration) {
    return false;
  }

  registration.status = RegistrationStatus.CANCELLED;
  await registrationRepository.save(registration);

  // If event was full, change status back to active
  const event = await eventRepository.findOne({ where: { id: eventId } });
  if (event && event.status === EventStatus.FULL) {
    event.status = EventStatus.ACTIVE;
    await eventRepository.save(event);
  }

  return true;
}

export async function getUserRegistrations(
  userTelegramId: number
): Promise<Registration[]> {
  return registrationRepository.find({
    where: { userTelegramId },
    relations: ["event"],
    order: { registrationDate: "DESC" },
  });
}

export async function getRegistrationById(
  id: number
): Promise<Registration | null> {
  return registrationRepository.findOne({
    where: { id },
    relations: ["user", "event"],
  });
}
