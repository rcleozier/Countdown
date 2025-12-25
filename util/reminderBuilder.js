import moment from 'moment';
import { REMINDER_PRESETS } from './reminderPresets';

const FREE_MAX_REMINDERS_PER_EVENT = 2;

/**
 * Gets reminder offsets in minutes for a preset
 * @param {string} preset - Preset ID ('none', 'chill', 'standard', 'intense', 'custom')
 * @param {Array} customOffsetsMinutes - Custom offsets for 'custom' preset
 * @returns {Array} Array of offsets in minutes (negative values, closest to 0 = closest to event)
 */
export const getPresetOffsets = (preset, customOffsetsMinutes = []) => {
  if (preset === 'none' || preset === 'off') {
    return [0]; // Just "on time"
  }
  
  if (preset === 'chill') {
    return [-60, 0]; // 1 hour before, on time
  }
  
  if (preset === 'standard') {
    return [-1440, -60, 0]; // 1 day before, 1 hour before, on time
  }
  
  if (preset === 'intense') {
    return [-10080, -1440, -60, 0]; // 1 week before, 1 day before, 1 hour before, on time
  }
  
  if (preset === 'custom') {
    // Include 0 (on time) if not already present
    const offsets = [...customOffsetsMinutes];
    if (!offsets.includes(0)) {
      offsets.push(0);
    }
    return offsets.sort((a, b) => b - a); // Sort descending (closest to event first)
  }
  
  return [0]; // Default to just "on time"
};

/**
 * Applies free user limits to reminder offsets
 * Keeps the closest reminders to the event (highest values, closest to 0)
 * @param {Array} offsets - Array of offsets in minutes
 * @param {boolean} isPro - Whether user has Pro subscription
 * @returns {Array} Filtered offsets array
 */
export const applyFreeLimits = (offsets, isPro) => {
  if (isPro) {
    return offsets; // No limits for Pro
  }
  
  // Sort by absolute value (closest to event first)
  const sorted = [...offsets].sort((a, b) => Math.abs(a) - Math.abs(b));
  
  // Keep only the closest FREE_MAX_REMINDERS_PER_EVENT reminders
  return sorted.slice(0, FREE_MAX_REMINDERS_PER_EVENT);
};

/**
 * Gets preview of reminders for a preset (for UI display)
 * @param {string} preset - Preset ID
 * @param {boolean} isPro - Whether user has Pro subscription
 * @param {Array} customOffsetsMinutes - Custom offsets for 'custom' preset
 * @returns {Object} { included: Array of reminder labels, locked: Array of locked reminder labels }
 */
export const getReminderPreview = (preset, isPro, customOffsetsMinutes = []) => {
  if (preset === 'off' || preset === 'none') {
    return { included: [], locked: [] };
  }
  
  const allOffsets = getPresetOffsets(preset, customOffsetsMinutes);
  const allowedOffsets = applyFreeLimits(allOffsets, isPro);
  const lockedOffsets = isPro ? [] : allOffsets.filter(o => !allowedOffsets.includes(o));
  
  const formatOffset = (offsetMinutes) => {
    if (offsetMinutes === 0) return 'At start';
    const abs = Math.abs(offsetMinutes);
    if (abs < 60) return `${abs} minute${abs !== 1 ? 's' : ''} before`;
    if (abs < 1440) {
      const hours = Math.floor(abs / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''} before`;
    }
    const days = Math.floor(abs / 1440);
    return `${days} day${days !== 1 ? 's' : ''} before`;
  };
  
  return {
    included: allowedOffsets.map(formatOffset),
    locked: lockedOffsets.map(formatOffset),
  };
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
  const reminderPlan = event.reminderPlan || { enabled: true, preset: 'none' };
  const preset = reminderPlan.preset || 'none';
  const reminders = [];

  // Get offsets for the preset
  const allOffsets = getPresetOffsets(preset, reminderPlan.customOffsetsMinutes);
  
  // Apply free limits if reminders are enabled
  const allowedOffsets = reminderPlan.enabled 
    ? applyFreeLimits(allOffsets, isPro)
    : [0]; // If disabled, only "on time"
  
  // Convert offsets to reminder objects
  allowedOffsets.forEach(offsetMinutes => {
    const abs = Math.abs(offsetMinutes);
    let unit, offset, typeLabel;
    
    if (offsetMinutes === 0) {
      typeLabel = 'On time';
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

