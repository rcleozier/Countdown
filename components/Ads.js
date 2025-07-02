import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS, AD_REQUEST_OPTIONS, AD_REFRESH_INTERVAL, handleAdError } from '../util/adConfig';

const OptimizedBannerAd = ({ style, containerStyle }) => {
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup refresh interval on unmount
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return (
    <View style={[styles.container, containerStyle]}>
      <BannerAd
        unitId={AD_UNIT_IDS.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={AD_REQUEST_OPTIONS}
        style={[styles.banner, style]}
        onAdLoaded={() => {
          // Start refresh timer when ad is loaded
          if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
          }
          refreshIntervalRef.current = setInterval(() => {
            // Force ad refresh by remounting
            if (refreshIntervalRef.current) {
              clearInterval(refreshIntervalRef.current);
            }
          }, AD_REFRESH_INTERVAL);
        }}
        onAdFailedToLoad={(error) => handleAdError(error, 'banner')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  banner: {
    width: '100%',
  },
});

export default OptimizedBannerAd; 