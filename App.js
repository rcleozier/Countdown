import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as Sentry from "@sentry/react-native";
import { requestTrackingPermission } from './util/adPersonalization';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LocaleProvider } from './context/LocaleContext';
import { PurchasesProvider } from './src/billing/PurchasesProvider';
import { AdProvider } from './src/ads/AdProvider';
import { Analytics } from './util/analytics';
import { runMigration } from './util/eventMigration';

import HomeScreen from "./screens/HomeScreen";
import SettingsScreen from "./screens/SettingsScreen";
import AnalyticsScreen from "./screens/AnalyticsScreen";
import CalendarScreen from "./screens/CalendarScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Remove static background color - will use theme instead

// Initialize Sentry only in production builds
if (!__DEV__) {
  try {
    Sentry.init({
      dsn: "https://531c4f371af6391fafb7536af1588b12@o4505802780966912.ingest.us.sentry.io/4508982047866880",
      // Adds more context data to events (IP address, cookies, user, etc.)
      // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
      sendDefaultPii: true,
    });
  } catch (error) {
    console.warn('Sentry initialization failed:', error);
  }
}

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

function SettingsScreenStack() {
  const { theme, isDark } = useTheme();
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
              iconName = focused ? "time" : "time-outline";
            } else if (route.name === "Calendar") {
              iconName = focused ? "calendar-number" : "calendar-number-outline";
            } else if (route.name === "Analytics") {
              iconName = focused ? "trending-up" : "trending-up-outline";
            } else if (route.name === "Settings") {
              iconName = focused ? "options" : "options-outline";
            }

            const accentColor = isDark ? '#4E9EFF' : '#4A9EFF';
            
            return (
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons
                  name={iconName ?? "alert-circle-outline"}
                  size={focused ? 24 : 22}
                  color={focused ? accentColor : (isDark ? 'rgba(255,255,255,0.5)' : theme.colors.tabInactive)}
                />
              </View>
            );
          },
          tabBarActiveTintColor: isDark ? '#4E9EFF' : '#4A9EFF',
          tabBarInactiveTintColor: isDark ? 'rgba(255,255,255,0.5)' : theme.colors.tabInactive,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: isDark ? '#121212' : '#FFFFFF',
            borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerShown: false,
        })}
      >
        <Tab.Screen name="Home" component={HomeScreenStack} />
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
    // Run data migration on app start
    runMigration();
  }, []);

  return (
    <LocaleProvider>
      <PurchasesProvider>
        <AdProvider>
          <ThemeProvider>
            <ThemedApp />
          </ThemeProvider>
        </AdProvider>
      </PurchasesProvider>
    </LocaleProvider>
  );
}

// Wrap with Sentry only in production
export default __DEV__ ? App : Sentry.wrap(App);
