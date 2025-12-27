import { usePurchases } from './PurchasesProvider';
import { REMINDER_PRESETS } from '../../util/reminderPresets';

// Feature flags
export const FREE_FEATURES = [
  'unlimited_countdowns',
  'basic_reminders', // Off, Simple reminder tiers
  'basic_charts',
  'search_title',
  'dark_mode',
  'icons',
  'progress_bar',
  'filters',
  'basic_sort',
  'basic_notes', // Basic notes (100 chars) - FREE
];

export const PRO_FEATURES = [
  'advanced_reminders', // Standard & Intense reminder tiers
  'power_notes', // Power notes features (search, overview, longer notes)
  'notes_search', // Search notes across all events
  'notes_overview', // All Notes overview screen
  'long_notes', // 5000 character limit (vs 100 for free)
  'unit_controls', // Hide seconds, show weeks/months
  'advanced_analytics',
  'no_ads',
  'recurring_countdowns', // Recurring events
];

// Feature limits configuration
export const FEATURE_LIMITS = {
  notes: {
    free: 100,
    pro: 5000,
  },
};

// Reminder tiers configuration
export const REMINDER_TIERS = {
  free: ['off', 'simple'],
  pro: ['off', 'simple', 'standard', 'intense'],
};

export const useEntitlements = () => {
  const purchases = usePurchases();

  const hasFeature = (featureName) => {
    // Free features are always available
    if (FREE_FEATURES.includes(featureName)) {
      return true;
    }

    // Pro features require Pro subscription
    return purchases.isPro;
  };

  const canUse = (featureName) => {
    return hasFeature(featureName);
  };

  const getLimit = (featureName) => {
    if (!FEATURE_LIMITS[featureName]) {
      return null;
    }

    if (purchases.isPro) {
      return FEATURE_LIMITS[featureName].pro;
    }

    return FEATURE_LIMITS[featureName].free;
  };

  /**
   * Get allowed reminder tiers based on Pro status
   * @returns {string[]} Array of allowed preset IDs
   */
  const getAllowedReminderTiers = () => {
    return purchases.isPro ? REMINDER_TIERS.pro : REMINDER_TIERS.free;
  };

  /**
   * Check if a reminder tier is allowed
   * @param {string} tier - Preset ID (off, simple, standard, intense)
   * @returns {boolean} True if tier is allowed
   */
  const isReminderTierAllowed = (tier) => {
    const allowedTiers = getAllowedReminderTiers();
    return allowedTiers.includes(tier);
  };

  return {
    isPro: purchases.isPro,
    isLoading: purchases.isLoading,
    activeProductId: purchases.activeProductId,
    purchase: purchases.purchase,
    restore: purchases.restore,
    refresh: purchases.refresh,
    offerings: purchases.offerings,
    error: purchases.error,
    hasFeature,
    canUse,
    getLimit,
    getAllowedReminderTiers,
    isReminderTierAllowed,
  };
};
