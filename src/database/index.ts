import { DataSource } from "typeorm";
import { User } from "./models/User";
import { Event } from "./models/Event";
import { Registration } from "./models/Registration";
import { Feedback } from "./models/Feedback";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "sqlite",
  database:
    process.env.DATABASE_PATH ||
    path.resolve(__dirname, "../../database.sqlite"),
  entities: [User, Event, Registration, Feedback],
  synchronize: true,
  logging: process.env.NODE_ENV !== "production",
});

export async function initializeDatabase() {
  try {
    await AppDataSource.initialize();
    return AppDataSource;
  } catch (error) {
    throw error;
  }
}
