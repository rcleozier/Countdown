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

// Get dynamic ad request options
export const getDynamicAdRequestOptions = async () => {
  try {
    return await getAdRequestOptions();
  } catch (error) {
    console.error("Error getting dynamic ad options:", error);
    // Fallback to non-personalized ads on error
    return {
      keywords: [
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
      ],
      requestNonPersonalizedAdsOnly: true,
    };
  }
};
