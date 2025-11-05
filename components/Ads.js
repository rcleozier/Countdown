import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ENABLE_ADS } from '../util/config';
import { AD_UNIT_IDS, AD_REQUEST_OPTIONS, AD_REFRESH_INTERVAL, handleAdError, getDynamicAdRequestOptions } from '../util/adConfig';
import { useTheme } from '../context/ThemeContext';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';

const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';
const isDev = __DEV__;
const useTestAd = isDev;
const bannerId = useTestAd ? TEST_BANNER_ID : AD_UNIT_IDS.banner;

const OptimizedBannerAd = ({ style, containerStyle }) => {
  const [adKey, setAdKey] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [adRequestOptions, setAdRequestOptions] = useState(AD_REQUEST_OPTIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFailed, setHasFailed] = useState(false);
  const maxRetries = 5; // Increased retry attempts
  const { theme } = useTheme();

  // Load optimized ad request options
  useEffect(() => {
    const loadAdOptions = async () => {
      try {
        const options = await getDynamicAdRequestOptions();
        setAdRequestOptions(options);
      } catch (error) {
        console.error('Error loading ad options:', error);
        // Fallback to static options
        setAdRequestOptions(AD_REQUEST_OPTIONS);
      }
    };
    loadAdOptions();
  }, []);

  const handleAdFailedToLoad = (error) => {
    console.log(`Ad failed to load (attempt ${retryCount + 1}):`, error);
    handleAdError(error, 'banner');
    
    // Enhanced retry logic with jitter to avoid thundering herd
    if (retryCount < maxRetries) {
      const baseDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const jitter = Math.random() * 1000; // Add random jitter up to 1s
      const retryDelay = baseDelay + jitter;
      
      console.log(`Retrying ad load in ${Math.round(retryDelay)}ms...`);
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setAdKey(prev => prev + 1); // Force remount
        setIsLoading(true);
        setHasFailed(false);
      }, retryDelay);
    } else {
      setIsLoading(false);
      setHasFailed(true);
    }
  };

  const handleAdLoaded = () => {
    console.log('Ad loaded successfully');
    setRetryCount(0); // Reset retry count on successful load
    setIsLoading(false);
    setHasFailed(false);
  };

  const handleAdOpened = () => {
    console.log('Ad opened');
  };

  const handleAdClosed = () => {
    console.log('Ad closed');
  };

  if (!ENABLE_ADS) {
    return null;
  }

  // Dynamically require the native module only when ads are enabled
  // This avoids referencing the native module in Expo Go or dev builds
  // eslint-disable-next-line global-require
  const { BannerAd, BannerAdSize } = require('react-native-google-mobile-ads');

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.adContainer }, containerStyle]}>
      <BannerAd
        key={adKey}
        unitId={bannerId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={adRequestOptions}
        style={[styles.banner, style]}
        onAdLoaded={handleAdLoaded}
        onAdFailedToLoad={handleAdFailedToLoad}
        onAdOpened={handleAdOpened}
        onAdClosed={handleAdClosed}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: wp('3%'),
    padding: wp('2%'),
    marginVertical: wp('2%'),
    alignItems: 'center',
  },
  banner: {
    width: '100%',
  },
});

// Fallback ad component with different size for better fill rates
export const FallbackBannerAd = ({ style, containerStyle }) => {
  if (!ENABLE_ADS) {
    return null;
  }
  const [adKey, setAdKey] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;
  const { theme } = useTheme();

  const handleAdFailedToLoad = (error) => {
    console.log(`Fallback ad failed to load (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < maxRetries) {
      const retryDelay = 2000; // 2 second delay
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setAdKey(prev => prev + 1);
      }, retryDelay);
    }
  };

  // eslint-disable-next-line global-require
  const { BannerAd, BannerAdSize } = require('react-native-google-mobile-ads');

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.adContainer }, containerStyle]}>
      <BannerAd
        key={adKey}
        unitId={bannerId}
        size={BannerAdSize.BANNER} // Use standard banner size as fallback
        requestOptions={AD_REQUEST_OPTIONS}
        style={[styles.banner, style]}
        onAdLoaded={() => console.log('Fallback ad loaded')}
        onAdFailedToLoad={handleAdFailedToLoad}
      />
    </View>
  );
};

export default OptimizedBannerAd; 