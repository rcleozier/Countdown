/**
 * Reminder preset definitions and helpers
 * FREE: off, simple
 * PRO: standard, intense
 */

export const REMINDER_PRESETS = {
  off: {
    id: 'off',
    name: 'Off',
    description: 'No notifications scheduled',
    isPro: false,
  },
  simple: {
    id: 'simple',
    name: 'Simple',
    description: 'One reminder at start time',
    isPro: false,
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    description: '24 hours before + at start time',
    isPro: true,
  },
  intense: {
    id: 'intense',
    name: 'Intense',
    description: '7 days, 24 hours, 1 hour before + at start time',
    isPro: true,
  },
};

/**
 * Check if a preset requires Pro subscription
 * @param {string} preset - Preset ID
 * @returns {boolean} True if preset requires Pro
 */
export const isPresetPro = (preset) => {
  const presetData = REMINDER_PRESETS[preset];
  return presetData ? presetData.isPro : false;
};

/**
 * Get human-readable description for a preset
 * @param {string} preset - Preset ID
 * @returns {string} Description text
 */
export const getPresetDescription = (preset) => {
  const presetData = REMINDER_PRESETS[preset];
  return presetData ? presetData.description : 'No notifications scheduled';
};

/**
 * Get all available presets
 * @returns {Array} Array of preset objects
 */
export const getAllPresets = () => {
  return Object.values(REMINDER_PRESETS);
};
