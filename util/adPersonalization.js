import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Tracking from "expo-tracking-transparency";

const TRACKING_PERMISSION_KEY = "@ad_tracking_permission";
const DEFAULT_KEYWORDS = [
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

// Get optimized ad request options with good keywords
export const getAdRequestOptions = async () => {
  const hasTrackingPermission = await getTrackingPermissionStatus();

  return {
    keywords: DEFAULT_KEYWORDS,
    requestNonPersonalizedAdsOnly: !hasTrackingPermission,
    maxAdContentRating: "G",
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
    // Basic targeting for better ad relevance
    ...(hasTrackingPermission && {
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
      contentCategories: [
        "general",
        "business",
        "technology",
        "lifestyle",
        "productivity",
        "utilities"
      ],
      excludeCategories: [
        "adult",
        "violence",
        "profanity",
        "gambling"
      ]
    })
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
