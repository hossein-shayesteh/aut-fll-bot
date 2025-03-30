import { EventStatus } from "../database/models/Event";

export function getEventStatusInPersian(status: EventStatus): string {
  switch (status) {
    case EventStatus.ACTIVE:
      return "فعال";
    case EventStatus.COMPLETED:
      return "به پایان رسیده";
    case EventStatus.CANCELLED:
      return "لغو شده";
    case EventStatus.FULL:
      return "تکمیل ظرفیت";
    default:
      return status;
  }
}
