import { Platform, AppState } from "react-native";
import Aptabase, { trackEvent } from "@aptabase/react-native";

const EVENTS = {
  SCREEN_VIEW: "screen_view",
  ADD_COUNTDOWN: "add_countdown",
  DELETE_COUNTDOWN: "delete_countdown",
  SESSION_START: "session_start",
  SESSION_END: "session_end",
};

const isNative = Platform.OS === "ios" || Platform.OS === "android";

let initialized = false;
let appStateSubscription = null;
let sessionStartTime = null;

export const Analytics = {
  initialize() {
    if (initialized) return;
    if (isNative) {
      try {
        Aptabase.init("A-US-0908125562");
        initialized = true;
        this.setupSessionTracking();
        // If app is currently active, start a session immediately
        const current = AppState.currentState;
        if (current === "active" && sessionStartTime === null) {
          this.trackSessionStart();
        }
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

  // Simple passthrough for custom events used elsewhere
  trackEvent(name, props = {}) {
    if (!isNative) return;
    try {
      trackEvent(name, props);
    } catch (error) {
      console.error("Error tracking event:", error);
    }
  },

  setupSessionTracking() {
    if (!isNative) return;
    // Clean up any prior subscription (defensive)
    if (appStateSubscription && appStateSubscription.remove) {
      appStateSubscription.remove();
    }
    appStateSubscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active" && sessionStartTime === null) {
        // App came to foreground - start new session
        Analytics.trackSessionStart();
      } else if (nextAppState.match(/inactive|background/) && sessionStartTime !== null) {
        // App went to background - end current session
        Analytics.trackSessionEnd();
      }
    });
  },

  trackSessionStart() {
    if (isNative) {
      try {
        sessionStartTime = Date.now();
        trackEvent(EVENTS.SESSION_START, {
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error tracking session start:", error);
      }
    }
  },

  trackSessionEnd() {
    if (isNative && sessionStartTime !== null) {
      try {
        const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000); // seconds
        trackEvent(EVENTS.SESSION_END, {
          duration_seconds: sessionDuration,
          timestamp: new Date().toISOString(),
        });
        sessionStartTime = null;
      } catch (error) {
        console.error("Error tracking session end:", error);
      }
    }
  },
};
