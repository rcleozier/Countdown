import moment from 'moment';
import { REMINDER_PRESETS } from './reminderPresets';

/**
 * Builds reminder entries for an event based on its reminderPlan
 * @param {Object} event - Event object with date, reminderPlan, etc.
 * @returns {Array} Array of reminder objects
 */
export const buildRemindersForEvent = (event) => {
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
  const reminderPlan = event.reminderPlan || { enabled: true, preset: 'none' };
  if (!reminderPlan.enabled) {
    return [];
  }

  const preset = reminderPlan.preset || 'none';
  const reminders = [];

  // Generate reminders based on preset
  if (preset === 'none') {
    return [];
  }

  if (preset === 'chill') {
    // [1 hour before, on time]
    reminders.push(
      { offset: 1, unit: 'hours', typeLabel: '1 hour before' },
      { offset: 0, unit: 'minutes', typeLabel: 'On time' }
    );
  } else if (preset === 'standard') {
    // [1 day before, 1 hour before, on time]
    reminders.push(
      { offset: 1, unit: 'days', typeLabel: '1 day before' },
      { offset: 1, unit: 'hours', typeLabel: '1 hour before' },
      { offset: 0, unit: 'minutes', typeLabel: 'On time' }
    );
  } else if (preset === 'intense') {
    // [1 week before, 1 day before, 1 hour before, on time]
    reminders.push(
      { offset: 7, unit: 'days', typeLabel: '1 week before' },
      { offset: 1, unit: 'days', typeLabel: '1 day before' },
      { offset: 1, unit: 'hours', typeLabel: '1 hour before' },
      { offset: 0, unit: 'minutes', typeLabel: 'On time' }
    );
  } else if (preset === 'custom' && reminderPlan.customOffsetsMinutes) {
    // Custom offsets in minutes
    reminderPlan.customOffsetsMinutes.forEach(offsetMinutes => {
      if (offsetMinutes === 0) {
        reminders.push({ offset: 0, unit: 'minutes', typeLabel: 'On time' });
      } else if (offsetMinutes < 60) {
        reminders.push({ 
          offset: offsetMinutes, 
          unit: 'minutes', 
          typeLabel: `${offsetMinutes} minute${offsetMinutes !== 1 ? 's' : ''} before` 
        });
      } else if (offsetMinutes < 1440) {
        const hours = Math.floor(offsetMinutes / 60);
        reminders.push({ 
          offset: hours, 
          unit: 'hours', 
          typeLabel: `${hours} hour${hours !== 1 ? 's' : ''} before` 
        });
      } else {
        const days = Math.floor(offsetMinutes / 1440);
        reminders.push({ 
          offset: days, 
          unit: 'days', 
          typeLabel: `${days} day${days !== 1 ? 's' : ''} before` 
        });
      }
    });
  }

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
      enabled: true, // Default enabled, can be toggled per-reminder (Pro only)
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
 * @param {string} preset - Preset ID ('none', 'chill', 'standard', 'intense', 'custom')
 * @returns {Object} reminderPlan object
 */
export const createDefaultReminderPlan = (preset = 'none') => {
  return {
    preset,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    enabled: preset !== 'none',
    customOffsetsMinutes: preset === 'custom' ? [] : undefined,
  };
};

