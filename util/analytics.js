import { Platform } from "react-native";
import Aptabase, { trackEvent } from "@aptabase/react-native";

const EVENTS = {
  SCREEN_VIEW: "screen_view",
  ADD_COUNTDOWN: "add_countdown",
  DELETE_COUNTDOWN: "delete_countdown",
};

const isNative = Platform.OS === "ios" || Platform.OS === "android";

export const Analytics = {
  initialize() {
    if (isNative) {
      try {
        Aptabase.init("A-US-0908125562");
      } catch (error) {
        console.error("Error initializing Aptabase:", error);
      }
    }
  },

  trackScreenView(screenName) {
    if (isNative) {
      try {
        trackEvent(EVENTS.SCREEN_VIEW, {
          screen: screenName,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error tracking screen view:", error);
      }
    }
  },
};
