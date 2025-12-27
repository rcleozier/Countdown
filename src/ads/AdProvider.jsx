import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePurchases } from '../billing/PurchasesProvider';
import { Analytics } from '../../util/analytics';

const AD_STATS_KEY = '@ad_stats';
const SESSION_START_KEY = '@session_start_time';

const AdContext = createContext(undefined);

export const AdProvider = ({ children }) => {
  const { isPro } = usePurchases();
  const [adsEnabled, setAdsEnabled] = useState(!isPro);
  const [adStats, setAdStats] = useState({
    sessionStartTime: Date.now(),
  });

  // Update ads enabled when Pro status changes
  useEffect(() => {
    setAdsEnabled(!isPro);
  }, [isPro]);

  // Load ad stats on mount
  useEffect(() => {
    loadAdStats();
    trackSessionStart();
  }, []);

  // Track app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const loadAdStats = async () => {
    try {
      const sessionStart = await AsyncStorage.getItem(SESSION_START_KEY);
      setAdStats({
        sessionStartTime: parseInt(sessionStart || Date.now().toString(), 10),
      });
    } catch (error) {
      console.error('Error loading ad stats:', error);
    }
  };

  const trackSessionStart = async () => {
    const now = Date.now();
    await AsyncStorage.setItem(SESSION_START_KEY, now.toString());
    setAdStats(prev => ({ ...prev, sessionStartTime: now }));
  };

  const handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'active') {
      trackSessionStart();
    }
  };

  const canShowBanner = useCallback((screen) => {
    if (!adsEnabled) return false;
    
    // Only show banners on Events List (HomeScreen)
    // Do NOT show on modals, Settings, or other screens
    return screen === 'HomeScreen';
  }, [adsEnabled]);

  const recordAdShown = useCallback((type, placement) => {
    Analytics.trackEvent('ad_shown', {
      type,
      placement,
    });
  }, []);

  const value = {
    adsEnabled,
    canShowBanner,
    recordAdShown,
  };

  return (
    <AdContext.Provider value={value}>
      {children}
    </AdContext.Provider>
  );
};

export const useAds = () => {
  const context = useContext(AdContext);
  if (!context) {
    throw new Error('useAds must be used within AdProvider');
  }
  return context;
};
