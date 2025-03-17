import { AppDataSource } from "../database";
import { Feedback } from "../database/models/Feedback";

const feedbackRepository = AppDataSource.getRepository(Feedback);

export async function createFeedback(
  userTelegramId: number,
  eventId: number,
  rating: number,
  comment?: string
): Promise<Feedback> {
  // Check if user already submitted feedback for this event
  const existingFeedback = await feedbackRepository.findOne({
    where: {
      userTelegramId,
      eventId,
    },
  });

  if (existingFeedback) {
    // Update existing feedback
    existingFeedback.rating = rating;
    if (comment) {
      existingFeedback.comment = comment;
    }
    return await feedbackRepository.save(existingFeedback);
  }

  // Create new feedback
  const feedback = new Feedback();
  feedback.userTelegramId = userTelegramId;
  feedback.eventId = eventId;
  feedback.rating = rating;
  if (comment) {
    feedback.comment = comment;
  }

  return await feedbackRepository.save(feedback);
}

export async function getEventFeedbacks(eventId: number): Promise<Feedback[]> {
  return feedbackRepository.find({
    where: { eventId },
    relations: ["user"],
    order: { createdAt: "DESC" },
  });
}

export async function getAverageEventRating(
  eventId: number
): Promise<number | null> {
  const result = await feedbackRepository
    .createQueryBuilder("feedback")
    .select("AVG(feedback.rating)", "average")
    .where("feedback.eventId = :eventId", { eventId })
    .getRawOne();

  return result?.average || null;
}
