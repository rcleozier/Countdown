import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Tracking from "expo-tracking-transparency";

const TRACKING_PERMISSION_KEY = "@ad_tracking_permission";
const DEFAULT_KEYWORDS = [
  // Universal app categories that work globally
  "mobile app",
  "smartphone app",
  "digital tool",
  "productivity app",
  "utility app",
  "lifestyle app",
  "personal app",
  "business app",
  "work app",
  "organization app",
  "planning app",
  "time management",
  "calendar app",
  "reminder app",
  "event app",
  "countdown app",
  "timer app",
  "schedule app",
  "appointment app",
  "meeting app",
  "birthday app",
  "anniversary app",
  "holiday app",
  "vacation app",
  "deadline app",
  "goal app",
  "milestone app",
  "celebration app",
  "party app",
  "wedding app",
  "graduation app",
  "retirement app",
  "productivity",
  "organization",
  "planning",
  "lifestyle",
  "personal",
  "family",
  "work",
  "business",
  "entertainment",
  // International-friendly tech terms
  "technology",
  "software",
  "application",
  "platform",
  "solution",
  "innovation",
  "modern",
  "convenient",
  "efficient",
  "user-friendly",
  "helpful",
  "practical",
  "useful",
  "digital",
  "online",
  "mobile",
  "smartphone",
  "device",
  "gadget",
  "tool",
  "service"
];

// Get the user's tracking permission status
export const getTrackingPermissionStatus = async () => {
  try {
    // First check if we've stored the permission status
    const storedStatus = await AsyncStorage.getItem(TRACKING_PERMISSION_KEY);
    if (storedStatus !== null) {
      return storedStatus === "granted";
    }

    // If not stored, check current status
    if (Platform.OS === "ios") {
      const { status } = await Tracking.getTrackingPermissionsAsync();
      const isGranted = status === "granted";
      // Store the result for future use
      await AsyncStorage.setItem(
        TRACKING_PERMISSION_KEY,
        isGranted ? "granted" : "denied"
      );
      return isGranted;
    }

    // For Android, we'll assume tracking is allowed by default
    // as it doesn't have the same strict tracking permission system
    return true;
  } catch (error) {
    console.error("Error getting tracking permission status:", error);
    // Default to non-personalized ads on error
    return false;
  }
};

// Request tracking permission (iOS only)
export const requestTrackingPermission = async () => {
  try {
    if (Platform.OS === "ios") {
      const { status } = await Tracking.requestTrackingPermissionsAsync();
      const isGranted = status === "granted";
      await AsyncStorage.setItem(
        TRACKING_PERMISSION_KEY,
        isGranted ? "granted" : "denied"
      );
      return isGranted;
    }
    return true; // Android doesn't need explicit permission
  } catch (error) {
    console.error("Error requesting tracking permission:", error);
    return false;
  }
};

// Get optimized ad request options for international traffic
export const getAdRequestOptions = async () => {
  const hasTrackingPermission = await getTrackingPermissionStatus();

  return {
    keywords: DEFAULT_KEYWORDS,
    requestNonPersonalizedAdsOnly: !hasTrackingPermission,
    // Enhanced targeting for international markets
    gender: "all",
    location: "all",
    maxAdContentRating: "G",
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
    // Additional targeting options for better international fill rates
    ...(hasTrackingPermission && {
      // Advanced targeting for users with tracking permission
      ageGroup: "all",
      interests: [
        "technology",
        "productivity",
        "lifestyle",
        "business",
        "personal development",
        "organization",
        "planning",
        "time management"
      ],
      // Content categories that work well internationally
      contentCategories: [
        "general",
        "business",
        "technology",
        "lifestyle",
        "productivity",
        "utilities"
      ],
      // Exclude categories that might have lower international fill rates
      excludeCategories: [
        "adult",
        "violence",
        "profanity",
        "gambling"
      ]
    }),
    // Global compatibility settings
    language: "all",
    region: "all",
    // Enhanced ad request for international markets
    adRequestOptions: {
      // Request higher value ad formats
      preferredAdFormats: ["banner", "interstitial", "rewarded"],
      // Optimize for international advertisers
      targetingOptions: {
        includeInternational: true,
        includeLocal: true,
        includeGlobal: true
      }
    }
  };
};

// Reset tracking permission (useful for testing or user preferences)
export const resetTrackingPermission = async () => {
  try {
    await AsyncStorage.removeItem(TRACKING_PERMISSION_KEY);
    return true;
  } catch (error) {
    console.error("Error resetting tracking permission:", error);
    return false;
  }
};
