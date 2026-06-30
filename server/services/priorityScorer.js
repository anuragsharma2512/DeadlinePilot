/**
 * Calculates the priority score for a task (0 - 100).
 * Formula:
 * score = (deadline_proximity * 0.4) + (urgency * 0.3) + (impact * 0.2) + (overdue_penalty * 0.1)
 * 
 * @param {Object} task 
 * @returns {number} Priority score from 0 to 100
 */
function calculatePriorityScore(task) {
  const { deadline, urgency = 5, impact = 5, status } = task;
  
  if (status === 'complete') {
    return 0; // Completed tasks go to the bottom
  }

  const now = new Date();
  let deadlineProximity = 0;
  let overduePenalty = 0;

  if (deadline) {
    const deadlineDate = new Date(deadline);
    const timeRemainingMs = deadlineDate.getTime() - now.getTime();

    if (timeRemainingMs < 0) {
      // Overdue
      deadlineProximity = 100;
      overduePenalty = 100;
    } else {
      // Scales from 0 to 100 as deadline approaches within 24 hours
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;
      if (timeRemainingMs <= twentyFourHoursMs) {
        deadlineProximity = Math.max(0, 100 * (1 - (timeRemainingMs / twentyFourHoursMs)));
      } else {
        deadlineProximity = 0;
      }
      overduePenalty = 0;
    }
  }

  // Normalize 1-10 to 0-100
  const urgencyNormalized = Math.min(10, Math.max(1, urgency)) * 10;
  const impactNormalized = Math.min(10, Math.max(1, impact)) * 10;

  const score = (deadlineProximity * 0.4) + (urgencyNormalized * 0.3) + (impactNormalized * 0.2) + (overduePenalty * 0.1);

  return Math.min(100, Math.max(0, Math.round(score * 100) / 100));
}

module.exports = {
  calculatePriorityScore
};
