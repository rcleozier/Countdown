import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePurchases } from '../billing/PurchasesProvider';
import { Analytics } from '../../util/analytics';

const AD_STATS_KEY = '@ad_stats';
const SESSION_START_KEY = '@session_start_time';
const LAST_INTERSTITIAL_KEY = '@last_interstitial_time';
const INTERSTITIAL_COUNT_KEY = '@interstitial_count';
const INTERSTITIAL_DATE_KEY = '@interstitial_date';

const AdContext = createContext(undefined);

export const AdProvider = ({ children }) => {
  const { isPro } = usePurchases();
  const [adsEnabled, setAdsEnabled] = useState(!isPro);
  const [adStats, setAdStats] = useState({
    interstitialCount: 0,
    lastInterstitialTime: 0,
    lastInterstitialDate: '',
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
      const [count, lastTime, lastDate, sessionStart] = await Promise.all([
        AsyncStorage.getItem(INTERSTITIAL_COUNT_KEY),
        AsyncStorage.getItem(LAST_INTERSTITIAL_KEY),
        AsyncStorage.getItem(INTERSTITIAL_DATE_KEY),
        AsyncStorage.getItem(SESSION_START_KEY),
      ]);

      const today = new Date().toDateString();
      
      // Reset count if it's a new day
      if (lastDate !== today) {
        await AsyncStorage.multiSet([
          [INTERSTITIAL_COUNT_KEY, '0'],
          [INTERSTITIAL_DATE_KEY, today],
        ]);
        setAdStats({
          interstitialCount: 0,
          lastInterstitialTime: parseInt(lastTime || '0', 10),
          lastInterstitialDate: today,
          sessionStartTime: parseInt(sessionStart || Date.now().toString(), 10),
        });
      } else {
        setAdStats({
          interstitialCount: parseInt(count || '0', 10),
          lastInterstitialTime: parseInt(lastTime || '0', 10),
          lastInterstitialDate: lastDate || today,
          sessionStartTime: parseInt(sessionStart || Date.now().toString(), 10),
        });
      }
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

  const canShowInterstitial = useCallback(async (action) => {
    if (!adsEnabled) return false;

    const now = Date.now();
    const sessionDuration = now - adStats.sessionStartTime;

    // Never show if user is within 60 seconds of opening the app
    if (sessionDuration < 60000) {
      return false;
    }

    // Check minimum interval (3 minutes)
    const timeSinceLastInterstitial = now - adStats.lastInterstitialTime;
    if (timeSinceLastInterstitial < 180000) { // 3 minutes
      return false;
    }

    // Check daily cap (max 3 per day)
    if (adStats.interstitialCount >= 3) {
      return false;
    }

    // Only show after meaningful actions
    const meaningfulActions = ['create_countdown', 'complete_navigation'];
    if (!meaningfulActions.includes(action)) {
      return false;
    }

    return true;
  }, [adsEnabled, adStats]);

  const recordInterstitialShown = useCallback(async () => {
    const now = Date.now();
    const today = new Date().toDateString();
    const newCount = adStats.interstitialCount + 1;

    try {
      await AsyncStorage.multiSet([
        [LAST_INTERSTITIAL_KEY, now.toString()],
        [INTERSTITIAL_COUNT_KEY, newCount.toString()],
        [INTERSTITIAL_DATE_KEY, today],
      ]);

      setAdStats(prev => ({
        ...prev,
        interstitialCount: newCount,
        lastInterstitialTime: now,
        lastInterstitialDate: today,
      }));
    } catch (error) {
      console.error('Error recording interstitial:', error);
    }
  }, [adStats.interstitialCount]);

  const recordAdShown = useCallback((type, placement) => {
    Analytics.trackEvent('ad_shown', {
      type,
      placement,
    });
  }, []);

  const value = {
    adsEnabled,
    canShowBanner,
    canShowInterstitial,
    recordInterstitialShown,
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
