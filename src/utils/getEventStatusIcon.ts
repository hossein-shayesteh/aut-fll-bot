import { EventStatus, Event } from "../database/models/Event";

export const getEventStatusIcon = (event: Event): string => {
  const statusIcons = {
    [EventStatus.ACTIVE]: "🟢",
    [EventStatus.FULL]: "🟠",
    [EventStatus.COMPLETED]: "🔵",
    [EventStatus.CANCELLED]: "🔴",
  };

  return statusIcons[event.status] || "";
};
