import { Platform } from "react-native";
import * as Sentry from "@sentry/react-native";
import { getAdRequestOptions } from "./adPersonalization";

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

// Optimized ad request options with good keywords
export const AD_REQUEST_OPTIONS = {
  keywords: [
    // Core app keywords
    "countdown",
    "timer",
    "event",
    "reminder",
    "calendar",
    "schedule",
    "appointment",
    "meeting",
    "birthday",
    "anniversary",
    "holiday",
    "vacation",
    "deadline",
    "goal",
    "milestone",
    "celebration",
    "party",
    "wedding",
    "graduation",
    "retirement",
    "productivity",
    "time management",
    "organization",
    "planning",
    "lifestyle",
    "personal",
    "family",
    "work",
    "business",
    "entertainment",
    // Technology keywords
    "mobile app",
    "smartphone",
    "digital",
    "online",
    "technology",
    "software",
    "application",
    "utility",
    "tool",
    "service",
    "platform",
    "solution",
    "innovation",
    "modern",
    "convenient",
    "efficient",
    "user-friendly",
    "helpful",
    "practical",
    "useful"
  ],
  requestNonPersonalizedAdsOnly: false,
  maxAdContentRating: "G",
  tagForChildDirectedTreatment: false,
  tagForUnderAgeOfConsent: false
};

// Get dynamic ad request options with good keywords
export const getDynamicAdRequestOptions = async () => {
  try {
    // Get personalized options
    const personalizedOptions = await getAdRequestOptions();
    
    // Combine with static optimized options
    return {
      ...AD_REQUEST_OPTIONS,
      ...personalizedOptions,
      // Use optimized keywords
      keywords: AD_REQUEST_OPTIONS.keywords
    };
  } catch (error) {
    console.error("Error getting dynamic ad options:", error);
    // Fallback to static optimized options
    return AD_REQUEST_OPTIONS;
  }
};
