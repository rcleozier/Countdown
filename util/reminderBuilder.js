import moment from 'moment';
import { isPresetPro, getPresetDescription } from './reminderPresets';

/**
 * Gets reminder offsets in minutes for a preset
 * @param {string} preset - Preset ID ('off', 'simple', 'standard', 'intense')
 * @returns {Array} Array of offsets in minutes (negative values, closest to 0 = closest to event)
 */
export const getPresetOffsets = (preset) => {
  if (preset === 'off' || preset === 'none') {
    return []; // No notifications
  }
  
  if (preset === 'simple') {
    return [0]; // Just "on time"
  }
  
  if (preset === 'standard') {
    return [-1440, 0]; // 24 hours before, on time
  }
  
  if (preset === 'intense') {
    return [-10080, -1440, -60, 0]; // 7 days before, 24 hours before, 1 hour before, on time
  }
  
  return []; // Default to no notifications
};

/**
 * Builds reminder entries for an event based on its reminderPlan
 * @param {Object} event - Event object with date, reminderPlan, etc.
 * @param {boolean} isPro - Whether user has Pro subscription (optional, defaults to false)
 * @returns {Array} Array of reminder objects
 */
export const buildRemindersForEvent = (event, isPro = false) => {
  if (!event || !event.date) {
    return [];
  }

  const eventDate = moment(event.date);
  const now = moment();
  
  // If event is in the past, no reminders
  if (eventDate.isBefore(now)) {
    return [];
  }

  // Check if reminders are enabled for this event
  const reminderPlan = event.reminderPlan || { enabled: true, preset: 'off' };
  const preset = reminderPlan.preset || 'off';
  
  // If preset is 'off' or reminders are disabled, return empty array
  if (preset === 'off' || preset === 'none' || !reminderPlan.enabled) {
    return [];
  }

  // Check if preset requires Pro and user doesn't have it
  if (isPresetPro(preset) && !isPro) {
    // Fallback to 'simple' for free users trying to use Pro presets
    return buildRemindersForEvent({ ...event, reminderPlan: { ...reminderPlan, preset: 'simple' } }, isPro);
  }

  const reminders = [];
  const allOffsets = getPresetOffsets(preset);
  
  // Convert offsets to reminder objects
  allOffsets.forEach(offsetMinutes => {
    const abs = Math.abs(offsetMinutes);
    let unit, offset, typeLabel;
    
    if (offsetMinutes === 0) {
      typeLabel = 'At start';
      unit = 'minutes';
      offset = 0;
    } else if (abs < 60) {
      typeLabel = `${abs} minute${abs !== 1 ? 's' : ''} before`;
      unit = 'minutes';
      offset = abs;
    } else if (abs < 1440) {
      const hours = Math.floor(abs / 60);
      typeLabel = `${hours} hour${hours !== 1 ? 's' : ''} before`;
      unit = 'hours';
      offset = hours;
    } else {
      const days = Math.floor(abs / 1440);
      typeLabel = `${days} day${days !== 1 ? 's' : ''} before`;
      unit = 'days';
      offset = days;
    }
    
    reminders.push({ offset, unit, typeLabel });
  });

  // Convert to reminder entries with fireAt times
  const reminderEntries = reminders.map((reminder, index) => {
    let fireAt = eventDate.clone();
    
    // Subtract the offset
    if (reminder.unit === 'minutes') {
      fireAt.subtract(reminder.offset, 'minutes');
    } else if (reminder.unit === 'hours') {
      fireAt.subtract(reminder.offset, 'hours');
    } else if (reminder.unit === 'days') {
      fireAt.subtract(reminder.offset, 'days');
    }

    // Only include reminders in the future
    if (fireAt.isBefore(now)) {
      return null;
    }

    return {
      id: `${event.id}_reminder_${index}_${Date.now()}`,
      eventId: event.id,
      fireAtISO: fireAt.toISOString(),
      typeLabel: reminder.typeLabel,
      enabled: true,
      notificationId: null, // Will be set when scheduled
    };
  }).filter(Boolean); // Remove null entries (past reminders)

  // Sort by fireAt ascending
  reminderEntries.sort((a, b) => {
    return moment(a.fireAtISO).diff(moment(b.fireAtISO));
  });

  return reminderEntries;
};

/**
 * Generates a default reminderPlan for an event
 * @param {string} preset - Preset ID ('off', 'simple', 'standard', 'intense')
 * @returns {Object} reminderPlan object
 */
export const createDefaultReminderPlan = (preset = 'off') => {
  return {
    preset,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    enabled: preset !== 'off' && preset !== 'none',
  };
};

// Export helper for UI
export { isPresetPro, getPresetDescription };
