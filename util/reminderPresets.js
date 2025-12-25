import { i18n } from './i18n';

export const REMINDER_PRESETS = {
  chill: {
    id: 'chill',
    reminders: [
      { offset: 1, unit: 'days' },
    ],
  },
  standard: {
    id: 'standard',
    reminders: [
      { offset: 7, unit: 'days' },
      { offset: 1, unit: 'days' },
    ],
  },
  intense: {
    id: 'intense',
    reminders: [
      { offset: 30, unit: 'days' },
      { offset: 7, unit: 'days' },
      { offset: 1, unit: 'days' },
    ],
  },
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

