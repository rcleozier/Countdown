import { usePurchases } from './PurchasesProvider';

// Feature flags
export const FREE_FEATURES = [
  'unlimited_countdowns',
  'basic_reminders', // 1 reminder per event
  'basic_templates',
  'basic_charts',
  'search_title',
  'dark_mode',
  'icons',
  'progress_bar',
  'filters',
  'basic_sort',
] as const;

export const PRO_FEATURES = [
  'custom_reminders', // Multiple reminders + custom offsets
  'notes', // Notes per event
  'notes_search', // Search notes
  'unit_controls', // Hide seconds, show weeks/months
  'advanced_templates',
  'advanced_analytics',
  'no_ads',
] as const;

export type FreeFeature = typeof FREE_FEATURES[number];
export type ProFeature = typeof PRO_FEATURES[number];
export type Feature = FreeFeature | ProFeature;

export const useEntitlements = () => {
  const purchases = usePurchases();

  const hasFeature = (featureName: Feature): boolean => {
    // Free features are always available
    if (FREE_FEATURES.includes(featureName as FreeFeature)) {
      return true;
    }

    // Pro features require Pro subscription
    return purchases.isPro;
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
  };
};

