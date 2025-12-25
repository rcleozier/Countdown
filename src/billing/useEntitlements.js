import { usePurchases } from './PurchasesProvider';

// Feature flags
export const FREE_FEATURES = [
  'unlimited_countdowns',
  'basic_reminders', // 1 reminder per event
  'basic_charts',
  'search_title',
  'dark_mode',
  'icons',
  'progress_bar',
  'filters',
  'basic_sort',
  'basic_notes', // Basic notes (500 chars) - FREE
];

export const PRO_FEATURES = [
  'custom_reminders', // Multiple reminders + custom offsets
  'power_notes', // Power notes features (search, overview, longer notes)
  'notes_search', // Search notes across all events
  'notes_overview', // All Notes overview screen
  'long_notes', // 5000 character limit (vs 500 for free)
  'unit_controls', // Hide seconds, show weeks/months
  'advanced_analytics',
  'no_ads',
];

// Feature limits configuration
export const FEATURE_LIMITS = {
  notes: {
    free: 100,
    pro: 5000,
  },
  reminders: {
    free: 1, // Single reminder only
    pro: -1, // Unlimited
  },
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
  };
};
