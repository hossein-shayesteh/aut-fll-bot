import { RegistrationStatus } from "../database/models/Registration";

export function getRegistrationStatusInPersian(
  status: RegistrationStatus
): string {
  switch (status) {
    case RegistrationStatus.PENDING:
      return "در انتظار تأیید";
    case RegistrationStatus.APPROVED:
      return "تأیید شده";
    case RegistrationStatus.REJECTED:
      return "رد شده";
    case RegistrationStatus.CANCELLED:
      return "لغو شده";
    default:
      return status;
  }
}
