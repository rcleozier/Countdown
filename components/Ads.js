import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ENABLE_ADS, USE_TEST_ADS } from '../util/config';
import { AD_UNIT_IDS } from '../util/adConfig';
import { useTheme } from '../context/ThemeContext';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';

const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';
const bannerId = USE_TEST_ADS ? TEST_BANNER_ID : AD_UNIT_IDS.banner;

const OptimizedBannerAd = ({ style, containerStyle }) => {
  const { theme } = useTheme();

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
        key={bannerId}
        unitId={bannerId}
        // Use a widely supported size to maximize fill
        size={BannerAdSize.BANNER}
        style={[styles.banner, style]}
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
  const { theme } = useTheme();

  // eslint-disable-next-line global-require
  const { BannerAd, BannerAdSize } = require('react-native-google-mobile-ads');

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.adContainer }, containerStyle]}>
      <BannerAd
        key={`${bannerId}-fallback`}
        unitId={bannerId}
        size={BannerAdSize.LARGE_BANNER}
        style={[styles.banner, style]}
      />
    </View>
  );
};

export default OptimizedBannerAd; 