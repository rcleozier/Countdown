import { Platform } from "react-native";
import * as Sentry from "@sentry/react-native";

// Ad Unit IDs
export const AD_UNIT_IDS = {
  banner:
    Platform.OS === "android"
      ? "ca-app-pub-0083160636450496/3524351967"
      : "ca-app-pub-0083160636450496/4095197605",
  interstitial:
    Platform.OS === "android"
      ? "ca-app-pub-0083160636450496/5408279279"
      : "ca-app-pub-0083160636450496/8711716575",
};

// Ad refresh interval in milliseconds (1 minute)
export const AD_REFRESH_INTERVAL = 60000;

// Error handling for ad failures
export const handleAdError = (error, adType) => {
  console.error(`${adType} ad failed to load:`, error);
  Sentry.captureException(error, {
    tags: {
      adType,
      platform: Platform.OS,
    },
  });
};

// Optimized ad request options for maximum revenue
// Note: Keywords are deprecated in AdMob and can reduce match rates
// Personalized ads (when tracking is allowed) typically earn 2-3x more revenue
export const getAdRequestOptions = async () => {
  try {
    const { getAdRequestOptions: getPersonalizedOptions } = await import('./adPersonalization');
    const personalizedOptions = await getPersonalizedOptions();
    
    // Return optimized options for maximum revenue
    return {
      requestNonPersonalizedAdsOnly: personalizedOptions.requestNonPersonalizedAdsOnly,
      maxAdContentRating: "G",
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      // Note: keywords, interests, contentCategories are deprecated/not supported
      // AdMob's automatic optimization works best without these
    };
  } catch (error) {
    console.error("Error getting ad request options:", error);
    // Fallback to default (personalized ads enabled)
    return {
      requestNonPersonalizedAdsOnly: false,
      maxAdContentRating: "G",
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    };
  }
};
