// src/bot/index.ts
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import { registerAdminHandlers } from "./handlers/adminHandlers";
import { registerUserHandlers } from "./handlers/userHandlers";
import { registerEventHandlers } from "./handlers/eventHandlers";
import { initializeDatabase } from "../database";

dotenv.config();

const TOKEN = process.env.TELEGRAM_TOKEN as string;
if (!TOKEN) {
  throw new Error("TELEGRAM_TOKEN is not defined in the .env file");
}

(async () => {
  try {
    await initializeDatabase();
    console.log("Database initialized successfully.");

    const bot = new TelegramBot(TOKEN, {
      polling: true,
    });

    // Register various handlers
    registerAdminHandlers(bot);
    registerUserHandlers(bot);
    registerEventHandlers(bot);
  } catch (error) {
    process.exit(1);
  }
})();
