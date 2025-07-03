import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Tracking from "expo-tracking-transparency";

const TRACKING_PERMISSION_KEY = "@ad_tracking_permission";
const DEFAULT_KEYWORDS = [
  "finance app",
  "budget tracker",
  "personal finance",
  "expense tracker",
  "investment app",
  "stock market",
  "savings goals",
  "debt payoff",
  "credit score",
  "money management",
  "financial planning",
  "retirement savings",
  "tax calculator",
  "loan calculator",
  "mortgage calculator",
  "crypto wallet",
  "cryptocurrency",
  "banking app",
  "cashback rewards",
  "bill reminder",
  "payday countdown",
  "wealth management",
  "insurance quotes",
  "student loans",
  "side hustle",
  "financial literacy",
  "spending tracker",
  "net worth calculator",
  "budgeting tips",
  "money saving",
  "financial goals"
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

// Get optimized ad request options based on tracking permission
export const getAdRequestOptions = async () => {
  const hasTrackingPermission = await getTrackingPermissionStatus();

  return {
    keywords: DEFAULT_KEYWORDS,
    requestNonPersonalizedAdsOnly: !hasTrackingPermission,
    // Add additional targeting options when tracking is allowed
    ...(hasTrackingPermission && {
      // Add more sophisticated targeting options here
      // These will only be used when tracking is allowed
      gender: "all",
      location: "all",
      maxAdContentRating: "G",
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    }),
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
