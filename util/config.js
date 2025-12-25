// Global app configuration

// Disable ads in local development
// __DEV__ is a React Native global that's true in development mode
// This will automatically disable ads when running locally (Expo Go, dev builds, etc.)
const isDevelopment = typeof __DEV__ !== 'undefined' && __DEV__;

// Ads are automatically disabled in development/local environments
// To test ads in development, manually set this to true (ads will use test units)
export const ENABLE_ADS = !isDevelopment;

// Use Google test ad units when in development (only applies if ENABLE_ADS is manually set to true)
// In production builds, this will be false and real ads will be used
export const USE_TEST_ADS = isDevelopment;

export default {
  ENABLE_ADS,
  USE_TEST_ADS,
};


