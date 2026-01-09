import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENABLE_ADS, USE_TEST_ADS } from './config';
import { AD_UNIT_IDS, getAdRequestOptions } from './adConfig';

const TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';
const COUNTDOWN_CREATION_COUNT_KEY = '@countdown_creation_count';

/**
 * Show interstitial ad after every 6 countdown creations
 * @param {boolean} adsEnabled - Whether ads are enabled
 * @returns {Promise<boolean>} - Returns true if ad was shown, false otherwise
 */
export const showInterstitialAd = async (adsEnabled = true) => {
  // Only show on Android (iOS users can upgrade to Pro to remove ads)
  if (Platform.OS !== 'android' || !ENABLE_ADS || !adsEnabled) {
    return false;
  }

  try {
    // Get current countdown creation count
    const countStr = await AsyncStorage.getItem(COUNTDOWN_CREATION_COUNT_KEY);
    const currentCount = countStr ? parseInt(countStr, 10) : 0;
    const newCount = currentCount + 1;

    // Save new count
    await AsyncStorage.setItem(COUNTDOWN_CREATION_COUNT_KEY, newCount.toString());

    // Show interstitial every 6 countdowns (6th, 12th, 18th, etc.)
    if (newCount % 6 === 0) {
      // Dynamically require the native module (may not be available in dev/Expo Go)
      let InterstitialAd, AdEventType, TestIds;
      try {
        const googleMobileAds = require('react-native-google-mobile-ads');
        InterstitialAd = googleMobileAds.InterstitialAd;
        AdEventType = googleMobileAds.AdEventType;
        TestIds = googleMobileAds.TestIds;
      } catch (error) {
        console.warn('react-native-google-mobile-ads not available:', error);
        return false;
      }
      
      const interstitialId = USE_TEST_ADS ? TestIds.INTERSTITIAL : AD_UNIT_IDS.interstitial;
      
      // Get personalized ad options
      const requestOptions = await getAdRequestOptions();
      
      // Create and load interstitial ad
      const interstitial = InterstitialAd.createForAdRequest(interstitialId, requestOptions);
      
      // Wait for ad to load
      return new Promise((resolve) => {
        const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
          unsubscribeLoaded();
          unsubscribeError();
          // Show the ad
          interstitial.show();
          resolve(true);
        });

        const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
          unsubscribeLoaded();
          unsubscribeError();
          console.warn('Interstitial ad failed to load:', error);
          resolve(false);
        });

        // Load the ad
        interstitial.load();

        // Timeout after 5 seconds if ad doesn't load
        setTimeout(() => {
          unsubscribeLoaded();
          unsubscribeError();
          resolve(false);
        }, 5000);
      });
    }

    return false;
  } catch (error) {
    console.error('Error showing interstitial ad:', error);
    return false;
  }
};

/**
 * Get current countdown creation count
 * @returns {Promise<number>}
 */
export const getCountdownCreationCount = async () => {
  try {
    const countStr = await AsyncStorage.getItem(COUNTDOWN_CREATION_COUNT_KEY);
    return countStr ? parseInt(countStr, 10) : 0;
  } catch (error) {
    console.error('Error getting countdown creation count:', error);
    return 0;
  }
};

/**
 * Reset countdown creation count (useful for testing)
 * @returns {Promise<void>}
 */
export const resetCountdownCreationCount = async () => {
  try {
    await AsyncStorage.removeItem(COUNTDOWN_CREATION_COUNT_KEY);
  } catch (error) {
    console.error('Error resetting countdown creation count:', error);
  }
};

