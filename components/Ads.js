import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS, AD_REQUEST_OPTIONS, AD_REFRESH_INTERVAL, handleAdError } from '../util/adConfig';
import { useTheme } from '../context/ThemeContext';

const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';
const isDev = __DEV__;
const useTestAd = isDev;
const bannerId = useTestAd ? TEST_BANNER_ID : AD_UNIT_IDS.banner;

const OptimizedBannerAd = ({ style, containerStyle }) => {
  const [adKey, setAdKey] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const { theme } = useTheme();

  const handleAdFailedToLoad = (error) => {
    console.log(`Ad failed to load (attempt ${retryCount + 1}):`, error);
    handleAdError(error, 'banner');
    
    // Retry with exponential backoff
    if (retryCount < maxRetries) {
      const retryDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setAdKey(prev => prev + 1); // Force remount
      }, retryDelay);
    }
  };

  const handleAdLoaded = () => {
    console.log('Ad loaded successfully');
    setRetryCount(0); // Reset retry count on successful load
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.adContainer }, containerStyle]}>
      <BannerAd
        key={adKey}
        unitId={bannerId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={AD_REQUEST_OPTIONS}
        style={[styles.banner, style]}
        onAdLoaded={handleAdLoaded}
        onAdFailedToLoad={handleAdFailedToLoad}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  banner: {
    width: '100%',
  },
});

// Fallback ad component with different size for better fill rates
export const FallbackBannerAd = ({ style, containerStyle }) => {
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