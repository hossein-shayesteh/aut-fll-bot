import { AppDataSource } from "../database";
import { User } from "../database/models/User";

const userRepository = AppDataSource.getRepository(User);

export async function findOrCreateUser(
  telegramId: number,
  firstName?: string,
  lastName?: string
): Promise<User> {
  const userRepository = AppDataSource.getRepository(User);
  let user = await userRepository.findOne({ where: { telegramId } });

  if (user) {
    return user;
  }

  try {
    user = new User();
    user.telegramId = telegramId;
    user.firstName = firstName || "";
    user.lastName = lastName || "";
    user.isRegistered = false;
    await userRepository.save(user);

    return user;
  } catch (e) {
    const error: any = e;
    if (error?.code === "SQLITE_CONSTRAINT" || error?.errno === 19) {
      return userRepository.findOneOrFail({ where: { telegramId } });
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
  if (data.isRegistered !== undefined) user.isRegistered = data.isRegistered;

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
