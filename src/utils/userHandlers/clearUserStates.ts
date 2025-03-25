import { AdminStates } from "../../bot/handlers/adminHandlers";
import { registrationStates } from "../../bot/handlers/eventHandlers";
import { userStates } from "../../bot/handlers/userHandlers";

export const clearUserStates = (userId: number) => {
  userStates.delete(userId);

  if (registrationStates) {
    registrationStates.delete(userId);
  }

  if (AdminStates) {
    AdminStates.delete(userId);
  }
};
