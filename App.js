import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as Sentry from "@sentry/react-native";
import { requestTrackingPermission } from './util/adPersonalization';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Analytics } from './util/analytics';

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
              iconName = focused ? "timer" : "timer-outline";
            } else if (route.name === "Past") {
              iconName = focused ? "hourglass" : "hourglass-outline";
            } else if (route.name === "Calendar") {
              iconName = focused ? "calendar" : "calendar-outline";
            } else if (route.name === "Analytics") {
              iconName = focused ? "analytics" : "analytics-outline";
            } else if (route.name === "Settings") {
              iconName = focused ? "settings" : "settings-outline";
            }

            return (
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons
                  name={iconName ?? "alert-circle-outline"}
                  size={focused ? 24 : 22}
                  color={focused ? (isDark ? '#3CC4A2' : theme.colors.primary) : (isDark ? 'rgba(255,255,255,0.5)' : theme.colors.tabInactive)}
                />
                {focused && (
                  <View style={{
                    position: 'absolute',
                    bottom: -8,
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: isDark ? '#3CC4A2' : theme.colors.primary,
                  }} />
                )}
              </View>
            );
          },
          tabBarActiveTintColor: isDark ? '#3CC4A2' : theme.colors.primary,
          tabBarInactiveTintColor: isDark ? 'rgba(255,255,255,0.5)' : theme.colors.tabInactive,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            fontFamily: 'System',
            marginTop: 4,
          },
          tabBarStyle: {
            backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
            borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderTopWidth: 0.5,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
          },
          headerShown: false,
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
    Analytics.initialize();
  }, []);

  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

export default Sentry.wrap(App);
