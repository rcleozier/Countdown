import { Platform } from "react-native";
import * as Sentry from "@sentry/react-native";
import { getAdRequestOptions } from "./adPersonalization";
import { getOptimizedInternationalAdRequest, detectUserCountry } from "./internationalAdConfig";

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

// Optimized ad request options for international traffic
export const AD_REQUEST_OPTIONS = {
  keywords: [
    // Universal keywords that work globally
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
    // International-friendly keywords
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
  tagForUnderAgeOfConsent: false,
  // Enhanced targeting for international markets
  gender: "all",
  location: "all",
  // Content filtering for global compatibility
  contentFiltering: {
    excludeCategories: ["adult", "violence", "profanity"],
    includeCategories: ["general", "business", "technology", "lifestyle"]
  }
};

// Get dynamic ad request options optimized for international traffic
export const getDynamicAdRequestOptions = async () => {
  try {
    // Get country-specific configuration
    const countryCode = detectUserCountry();
    const internationalConfig = getOptimizedInternationalAdRequest(countryCode);
    
    // Merge with personalization options
    const personalizedOptions = await getAdRequestOptions();
    
    // Combine both configurations for maximum optimization
    return {
      ...internationalConfig,
      ...personalizedOptions,
      // Ensure international optimizations take priority
      keywords: internationalConfig.keywords,
      targeting: {
        ...internationalConfig.targeting,
        ...personalizedOptions.targeting
      }
    };
  } catch (error) {
    console.error("Error getting dynamic ad options:", error);
    // Fallback to international-optimized static options
    const countryCode = detectUserCountry();
    return getOptimizedInternationalAdRequest(countryCode);
  }
};
