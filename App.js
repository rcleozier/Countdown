import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as Sentry from "@sentry/react-native";
import { requestTrackingPermission } from './util/adPersonalization';

import HomeScreen from "./screens/HomeScreen";
import PastScreen from "./screens/PastScreen";
import SettingsScreen from "./screens/SettingsScreen";
import AnalyticsScreen from "./screens/AnalyticsScreen";
import NotesScreen from "./screens/NotesScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const APP_BACKGROUND_COLOR = "#F8F9FA";

Sentry.init({
  dsn: "https://531c4f371af6391fafb7536af1588b12@o4505802780966912.ingest.us.sentry.io/4508982047866880",
  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,
});

function HomeScreenStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Removed header
        contentStyle: {
          backgroundColor: APP_BACKGROUND_COLOR,
        },
      }}
    >
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
    </Stack.Navigator>
  );
}

function PastScreenStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Removed header
        contentStyle: {
          backgroundColor: APP_BACKGROUND_COLOR,
        },
      }}
    >
      <Stack.Screen name="PastScreen" component={PastScreen} />
    </Stack.Navigator>
  );
}

function SettingsScreenStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Removed header
        contentStyle: {
          backgroundColor: APP_BACKGROUND_COLOR,
        },
      }}
    >
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

function AnalyticsScreenStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Removed header
        contentStyle: {
          backgroundColor: APP_BACKGROUND_COLOR,
        },
      }}
    >
      <Stack.Screen name="AnalyticsScreen" component={AnalyticsScreen} />
    </Stack.Navigator>
  );
}

function App() {
  useEffect(() => {
    requestTrackingPermission();
  }, []);

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === "Home") {
              // Using timer icons for countdowns
              iconName = focused ? "timer-sharp" : "timer-outline";
            } else if (route.name === "Past") {
              // Hourglass for past events
              iconName = focused ? "hourglass-sharp" : "hourglass-outline";
            } else if (route.name === "Notes") {
              iconName = focused ? "document-text" : "document-text-outline";
            } else if (route.name === "Analytics") {
              // Analytics icon for insights
              iconName = focused ? "analytics-sharp" : "analytics-outline";
            } else if (route.name === "Settings") {
              // Settings icon for settings
              iconName = focused ? "settings-sharp" : "settings-outline";
            }

            return (
              <Ionicons
                name={iconName ?? "alert-circle-outline"}
                size={size}
                color={color}
              />
            );
          },
          tabBarActiveTintColor: "#333",
          tabBarInactiveTintColor: "gray",
          headerShown: false, // Removed header from tab screens
        })}
      >
        <Tab.Screen name="Home" component={HomeScreenStack} />
        <Tab.Screen name="Past" component={PastScreenStack} />
        <Tab.Screen name="Notes" component={NotesScreen} />
        <Tab.Screen name="Analytics" component={AnalyticsScreen} />
        <Tab.Screen name="Settings" component={SettingsScreenStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default Sentry.wrap(App);
