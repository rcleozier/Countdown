import moment from 'moment';

/**
 * Recurrence rule types
 */
export const RECURRENCE_TYPES = {
  NONE: 'none',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
};

/**
 * Computes the next occurrence date based on recurrence rule
 * @param {Date|string} currentOccurrence - Current occurrence date
 * @param {string} rule - Recurrence rule ('daily', 'weekly', 'monthly', 'yearly')
 * @returns {Date} Next occurrence date
 */
export const computeNextOccurrence = (currentOccurrence, rule) => {
  if (!rule || rule === RECURRENCE_TYPES.NONE) {
    return null;
  }

  const current = moment(currentOccurrence);
  let next;

  switch (rule) {
    case RECURRENCE_TYPES.DAILY:
      next = current.clone().add(1, 'day');
      break;

    case RECURRENCE_TYPES.WEEKLY:
      next = current.clone().add(1, 'week');
      break;

    case RECURRENCE_TYPES.MONTHLY:
      // Same day-of-month if possible; if day doesn't exist, clamp to last day
      next = current.clone().add(1, 'month');
      const originalDay = current.date();
      const daysInNextMonth = next.daysInMonth();
      
      if (originalDay > daysInNextMonth) {
        // Clamp to last day of month (e.g., Jan 31 -> Feb 28/29)
        next.date(daysInNextMonth);
      } else {
        next.date(originalDay);
      }
      break;

    case RECURRENCE_TYPES.YEARLY:
      // Same month/day; handle Feb 29 -> Feb 28 on non-leap years
      next = current.clone().add(1, 'year');
      const originalMonth = current.month();
      const originalDate = current.date();
      
      // If original date was Feb 29 and next year is not leap, use Feb 28
      if (originalMonth === 1 && originalDate === 29 && !next.isLeapYear()) {
        next.date(28);
      } else {
        next.month(originalMonth).date(originalDate);
      }
      break;

    default:
      return null;
  }

  return next.toDate();
};

/**
 * Rolls forward a recurring event if its next occurrence has passed
 * @param {Object} event - Event object with recurrence and nextOccurrenceAt
 * @param {Date|string} now - Current date/time (defaults to now)
 * @param {number} maxIterations - Maximum iterations to avoid infinite loops (default 100)
 * @returns {Object} Updated event object (or original if no roll-forward needed)
 */
export const rollForwardIfNeeded = (event, now = new Date(), maxIterations = 100) => {
  // If not recurring, no roll-forward needed
  if (!event.recurrence || event.recurrence === RECURRENCE_TYPES.NONE) {
    return event;
  }

  const nowMoment = moment(now);
  let nextOccurrence = moment(event.nextOccurrenceAt || event.date);
  let iterations = 0;

  // Keep rolling forward until we're in the future
  while (nextOccurrence.isSameOrBefore(nowMoment) && iterations < maxIterations) {
    const nextDate = computeNextOccurrence(nextOccurrence.toDate(), event.recurrence);
    if (!nextDate) {
      break; // Can't compute next, stop
    }
    nextOccurrence = moment(nextDate);
    iterations++;
  }

  if (iterations === 0) {
    // No roll-forward needed
    return event;
  }

  if (iterations >= maxIterations) {
    console.warn(`⚠️ [RECURRENCE] Max iterations reached for event ${event.id}, stopping roll-forward`);
  }

  // Return updated event with normalized fields
  return {
    ...event,
    recurrence: event.recurrence, // Preserve recurrence
    nextOccurrenceAt: nextOccurrence.toISOString(),
    // Preserve originalDateAt if it exists, otherwise set it to the original date
    originalDateAt: event.originalDateAt || event.date,
  };
};

/**
 * Gets human-readable recurrence label
 * @param {string} recurrence - Recurrence type
 * @returns {string} Human-readable label
 */
export const getRecurrenceLabel = (recurrence) => {
  switch (recurrence) {
    case RECURRENCE_TYPES.DAILY:
      return 'Daily';
    case RECURRENCE_TYPES.WEEKLY:
      return 'Weekly';
    case RECURRENCE_TYPES.MONTHLY:
      return 'Monthly';
    case RECURRENCE_TYPES.YEARLY:
      return 'Yearly';
    default:
      return 'None';
  }
};

/**
 * Checks if recurrence is a Pro feature
 * @returns {boolean} Always true (recurrence is Pro-only)
 */
export const isRecurrencePro = () => {
  return true;
};

