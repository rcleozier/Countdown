import { Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

/**
 * Detect if the device is a tablet/iPad
 * @returns {boolean}
 */
export const isTablet = () => {
  if (Platform.OS === 'ios') {
    // iPad detection for iOS
    return Platform.isPad || (Math.min(width, height) >= 768);
  }
  
  if (Platform.OS === 'android') {
    // Android tablet detection (typically 600dp or larger)
    const aspectRatio = Math.max(width, height) / Math.min(width, height);
    const pixelDensity = Math.min(width, height) / 160; // Convert to dp approximation
    return pixelDensity >= 600 || aspectRatio < 1.6;
  }
  
  return false;
};

/**
 * Get optimal content width for tablets (centered with max width)
 * @param {number} maxWidthPercentage - Max width as percentage (default 90%)
 * @returns {Object} Style object with maxWidth and alignSelf
 */
export const getTabletContentStyle = (maxWidthPercentage = 90) => {
  if (isTablet()) {
    const { widthPercentageToDP } = require('react-native-responsive-screen');
    return {
      maxWidth: widthPercentageToDP(maxWidthPercentage),
      alignSelf: 'center',
      width: '100%',
    };
  }
  return {};
};

/**
 * Get optimal padding for tablets
 * @param {number} defaultPadding - Default padding percentage
 * @returns {number} Adjusted padding
 */
export const getTabletPadding = (defaultPadding) => {
  if (isTablet()) {
    // Increase padding on tablets for better spacing
    return defaultPadding * 1.5;
  }
  return defaultPadding;
};

/**
 * Get optimal font size for tablets
 * @param {number} defaultSize - Default font size percentage
 * @returns {number} Adjusted font size
 */
export const getTabletFontSize = (defaultSize) => {
  if (isTablet()) {
    // Slightly larger fonts on tablets for better readability
    return defaultSize * 1.1;
  }
  return defaultSize;
};

