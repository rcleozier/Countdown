import { i18n } from './i18n';

export const REMINDER_PRESETS = {
  chill: {
    id: 'chill',
    name: 'Chill',
    reminders: [
      { offset: 1, unit: 'days' },
    ],
    description: '1 reminder: 1 day before',
    isPro: false,
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    reminders: [
      { offset: 7, unit: 'days' },
      { offset: 1, unit: 'days' },
    ],
    description: '2 reminders: 1 week before + 1 day before',
    isPro: false,
  },
  intense: {
    id: 'intense',
    name: 'Intense',
    reminders: [
      { offset: 30, unit: 'days' },
      { offset: 7, unit: 'days' },
      { offset: 1, unit: 'days' },
    ],
    description: '3 reminders: 1 month before + 1 week before + 1 day before',
    isPro: true,
  },
};

// Get human-readable description for a preset
export const getPresetDescription = (presetId) => {
  if (!presetId || !REMINDER_PRESETS[presetId]) return null;
  return REMINDER_PRESETS[presetId].description;
};

// Format reminders for display in plain English
export const formatRemindersForDisplay = (presetId) => {
  if (!presetId || !REMINDER_PRESETS[presetId]) return null;
  
  const preset = REMINDER_PRESETS[presetId];
  const reminders = preset.reminders;
  
  if (reminders.length === 1) {
    const r = reminders[0];
    if (r.unit === 'days') {
      return r.offset === 1 
        ? '1 reminder: 1 day before'
        : `${reminders.length} reminder: ${r.offset} days before`;
    }
    if (r.unit === 'hours') {
      return r.offset === 1
        ? '1 reminder: 1 hour before'
        : `${reminders.length} reminder: ${r.offset} hours before`;
    }
  }
  
  // Multiple reminders
  const parts = reminders.map(r => {
    if (r.unit === 'days') {
      return r.offset === 1 ? '1 day' : `${r.offset} days`;
    }
    if (r.unit === 'hours') {
      return r.offset === 1 ? '1 hour' : `${r.offset} hours`;
    }
    return `${r.offset} ${r.unit}`;
  });
  
  return `${reminders.length} reminders: ${parts.join(' + ')} before`;
};

// Get preset name (localized)
export const getPresetName = (presetId) => {
  if (!presetId || !REMINDER_PRESETS[presetId]) return null;
  return i18n.t(`reminders.${presetId}`);
};

// Get reminders for a preset
export const getPresetReminders = (presetId) => {
  if (!presetId || !REMINDER_PRESETS[presetId]) return [];
  return REMINDER_PRESETS[presetId].reminders;
};

// Get all presets with localized names
export const getAllPresets = () => {
  return Object.values(REMINDER_PRESETS).map(preset => ({
    ...preset,
    name: getPresetName(preset.id),
  }));
};

// Format reminder for display
export const formatReminder = (offset, unit) => {
  return i18n.formatReminderOffset(offset, unit);
};

