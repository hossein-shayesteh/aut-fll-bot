import { getEventById } from "../services/eventService";
import { getUserProfile } from "../services/userService";

export const getApplicableFee = async (eventId: number, userId: number) => {
  // Get event details to show fee
  const event = await getEventById(eventId);
  const userProfile = await getUserProfile(userId);

  if (!event) return 0;

  const hasValidStudentId =
    userProfile?.studentId && userProfile.studentId !== "0";

  // Return university fee if user is a student and university fee exists, otherwise return regular fee
  return hasValidStudentId
    ? event.universityFee || event.fee || 0
    : event.fee || 0;
};
