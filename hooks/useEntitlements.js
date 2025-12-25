import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ENTITLEMENTS_STORAGE_KEY = '@entitlements';
const PRO_FLAG_KEY = 'isPro';

// Mock entitlements - will be replaced with real subscription check
export const useEntitlements = () => {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEntitlements();
  }, []);

  const loadEntitlements = async () => {
    try {
      const stored = await AsyncStorage.getItem(ENTITLEMENTS_STORAGE_KEY);
      if (stored) {
        const entitlements = JSON.parse(stored);
        setIsPro(entitlements[PRO_FLAG_KEY] || false);
      }
    } catch (error) {
      console.error('Error loading entitlements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mock function to set Pro status (for testing)
  const setProStatus = async (status) => {
    try {
      const entitlements = { [PRO_FLAG_KEY]: status };
      await AsyncStorage.setItem(ENTITLEMENTS_STORAGE_KEY, JSON.stringify(entitlements));
      setIsPro(status);
    } catch (error) {
      console.error('Error saving entitlements:', error);
    }
  };

  // Check if a feature is available
  const hasFeature = (featureName) => {
    // Free features
    const freeFeatures = [
      'unlimited_countdowns',
      'basic_reminders',
      'basic_templates',
      'basic_charts',
      'search_title',
      'dark_mode',
    ];

    if (freeFeatures.includes(featureName)) {
      return true;
    }

    // Pro features
    return isPro;
  };

  return {
    isPro,
    isLoading,
    hasFeature,
    setProStatus, // For testing/mock purchases
  };
};

