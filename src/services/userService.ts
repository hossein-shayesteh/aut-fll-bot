import { AppDataSource } from "../database";
import { User } from "../database/models/User";

const userRepository = AppDataSource.getRepository(User);

export async function findOrCreateUser(
  telegramId: number,
  firstName?: string,
  lastName?: string
): Promise<User> {
  try {
    // First, try to find the existing user
    let user = await userRepository.findOne({
      where: { telegramId },
    });

    // If user doesn't exist, create a new one
    if (!user) {
      user = userRepository.create({
        telegramId,
        firstName: firstName || "",
        lastName: lastName || "",
        isRegistered: false,
      });

      await userRepository.save(user);
    }

    return user;
  } catch (error) {
    // If unique constraint violation, try to fetch the existing user
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      return userRepository.findOneOrFail({
        where: { telegramId },
      });
    }

    throw error;
  }
}

export async function updateUserProfile(
  telegramId: number,
  data: Partial<User>
): Promise<User | null> {
  const user = await userRepository.findOne({ where: { telegramId } });

  if (!user) {
    return null;
  }

  // Update fields if provided
  if (data.firstName) user.firstName = data.firstName;
  if (data.lastName) user.lastName = data.lastName;
  if (data.phoneNumber) user.phoneNumber = data.phoneNumber;
  if (data.studentId) user.studentId = data.studentId;

  // Set isRegistered to true if all fields are provided
  if (user.firstName && user.lastName && user.phoneNumber && user.studentId) {
    user.isRegistered = true;
  } else {
    user.isRegistered = false;
  }

  await userRepository.save(user);
  return user;
}

export async function getUserProfile(telegramId: number): Promise<User | null> {
  return userRepository.findOne({
    where: { telegramId },
    relations: ["registrations", "registrations.event"],
  });
}

export async function isAdmin(telegramId: number): Promise<boolean> {
  const user = await userRepository.findOne({ where: { telegramId } });
  return user?.isAdmin || false;
}

export async function getAllUsers(): Promise<User[]> {
  return userRepository.find();
}

export async function getUsersByEventId(eventId: number): Promise<User[]> {
  const users = await userRepository
    .createQueryBuilder("user")
    .innerJoin("user.registrations", "registration")
    .where("registration.eventId = :eventId", { eventId })
    .getMany();

  return users;
}

export async function getAllUsersWithNotificationsEnabled(): Promise<User[]> {
  try {
    return await userRepository.find({
      where: {
        notificationsEnabled: true,
      },
    });
  } catch (error) {
    return [];
  }
}
