import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as Sentry from "@sentry/react-native";
import { requestTrackingPermission } from './util/adPersonalization';
import { ThemeProvider, useTheme } from './context/ThemeContext';

import HomeScreen from "./screens/HomeScreen";
import PastScreen from "./screens/PastScreen";
import SettingsScreen from "./screens/SettingsScreen";
import AnalyticsScreen from "./screens/AnalyticsScreen";
import CalendarScreen from "./screens/CalendarScreen";
import NotesScreen from "./screens/NotesScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Remove static background color - will use theme instead

Sentry.init({
  dsn: "https://531c4f371af6391fafb7536af1588b12@o4505802780966912.ingest.us.sentry.io/4508982047866880",
  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,
});

function HomeScreenStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Removed header
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
    </Stack.Navigator>
  );
}

function PastScreenStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Removed header
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen name="PastScreen" component={PastScreen} />
    </Stack.Navigator>
  );
}

function SettingsScreenStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Removed header
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      <Stack.Screen name="NotesScreen" component={NotesScreen} />
    </Stack.Navigator>
  );
}

function AnalyticsScreenStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Removed header
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen name="AnalyticsScreen" component={AnalyticsScreen} />
    </Stack.Navigator>
  );
}

function ThemedApp() {
  const { theme, isDark } = useTheme();
  
  return (
    <>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={theme.colors.background}
      />
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
            } else if (route.name === "Calendar") {
              iconName = focused ? "calendar" : "calendar-outline";
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
          tabBarActiveTintColor: theme.colors.tabActive,
          tabBarInactiveTintColor: theme.colors.tabInactive,
          tabBarStyle: {
            backgroundColor: theme.colors.tabBar,
            borderTopColor: theme.colors.tabBarBorder,
          },
          headerShown: false, // Removed header from tab screens
        })}
      >
        <Tab.Screen name="Home" component={HomeScreenStack} />
        <Tab.Screen name="Past" component={PastScreenStack} />
        <Tab.Screen name="Calendar" component={CalendarScreen} />
        <Tab.Screen name="Analytics" component={AnalyticsScreen} />
        <Tab.Screen name="Settings" component={SettingsScreenStack} />
      </Tab.Navigator>
    </NavigationContainer>
    </>
  );
}

function App() {
  useEffect(() => {
    requestTrackingPermission();
  }, []);

  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

export default Sentry.wrap(App);
