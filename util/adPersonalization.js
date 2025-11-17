import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Tracking from "expo-tracking-transparency";

const TRACKING_PERMISSION_KEY = "@ad_tracking_permission";

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

// Get optimized ad request options for maximum revenue
// Personalized ads (when tracking allowed) earn 2-3x more than non-personalized
export const getAdRequestOptions = async () => {
  const hasTrackingPermission = await getTrackingPermissionStatus();

  // For maximum revenue:
  // - Enable personalized ads when tracking is allowed (earns 2-3x more)
  // - Don't use keywords (deprecated, reduces match rates)
  // - Let AdMob's automatic optimization handle targeting
  return {
    requestNonPersonalizedAdsOnly: !hasTrackingPermission,
    maxAdContentRating: "G",
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
    // Note: keywords, interests, contentCategories are deprecated/not supported in AdMob SDK
    // AdMob's machine learning automatically optimizes ad selection for maximum revenue
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
