import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  SafeAreaView,
  Alert,
  Switch,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import appConfig from '../app.json';
import { Analytics } from '../util/analytics';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

const SettingsScreen = () => {
  const [eventCount, setEventCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [appInfoTapCount, setAppInfoTapCount] = useState(0);
  const appInfo = appConfig.expo;
  const { theme, isDark, toggleTheme } = useTheme();

  // Function to load events from AsyncStorage
  const loadEvents = async () => {
    try {
      const storedCountdowns = await AsyncStorage.getItem("countdowns");
      if (storedCountdowns) {
        const events = JSON.parse(storedCountdowns);
        setEventCount(events.length);
      } else {
        setEventCount(0);
      }
    } catch (error) {
      console.error("Error loading countdowns", error);
    }
  };

  // Refresh data every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [])
  );

  useEffect(() => {
    Analytics.initialize();
    Analytics.trackScreenView('Settings');
  }, []);

  // Clear all events
  const clearEvents = async () => {
    try {
      await AsyncStorage.removeItem("countdowns");
      setEventCount(0);
      
      // Haptic feedback for clearing all events
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      
      Analytics.trackEvent && Analytics.trackEvent('clear_all_events', { timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("Error clearing events", error);
    }
    setModalVisible(false);
  };

  // Easter egg: Seed data after 7 taps
  const handleAppInfoTap = async () => {
    setAppInfoTapCount((prev) => {
      const next = prev + 1;
      if (next === 7) {
        seedTestData();
        return 0;
      }
      return next;
    });
  };

  // Seed test data function
  const seedTestData = async () => {
    try {
      // Clear all data
      await AsyncStorage.removeItem("countdowns");
      await AsyncStorage.removeItem("notes");
      // Today's date
      const now = new Date();
      // Helper to add days
      const addDays = (date, days) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
      };
      // 7 upcoming countdowns
      const upcoming = [
        { name: "Sarah's Birthday", icon: "🎂", days: 1 },
        { name: "Baseball Game", icon: "⚾️", days: 5 },
        { name: "Vacation", icon: "✈️", days: 10 },
        { name: "Graduation", icon: "🎓", days: 15 },
        { name: "Beach Day", icon: "🏖️", days: 20 },
        { name: "Marathon", icon: "🏆", days: 30 },
        { name: "Party", icon: "🎉", days: 45 },
      ].map((e, i) => {
        const eventDate = addDays(now, e.days);
        // Randomly pick a createdAt between 1 and (days-1) days ago
        const minAgo = 1;
        const maxAgo = Math.max(e.days - 1, 1);
        const daysAgo = Math.floor(Math.random() * (maxAgo - minAgo + 1)) + minAgo;
        const createdAt = addDays(now, -daysAgo);
        return {
          id: `upcoming-${i}`,
          name: e.name,
          icon: e.icon,
          date: eventDate.toISOString(),
          createdAt: createdAt.toISOString(),
        };
      });
      // 7 past countdowns
      const past = [
        { name: "Dentist", icon: "🦷", days: -2 },
        { name: "Basketball Game", icon: "🏀", days: -5 },
        { name: "Movie Night", icon: "🎬", days: -10 },
        { name: "School Start", icon: "🏫", days: -15 },
        { name: "Interview", icon: "💼", days: -20 },
        { name: "Housewarming", icon: "🏠", days: -30 },
        { name: "Concert", icon: "🎤", days: -45 },
      ].map((e, i) => ({
        id: `past-${i}`,
        name: e.name,
        icon: e.icon,
        date: addDays(now, e.days).toISOString(),
        createdAt: addDays(now, e.days - 5).toISOString(),
      }));
      // 7 notes
      const notes = [
        { text: "Buy cake for Mom's birthday!", date: addDays(now, 2).toISOString() },
        { text: "Pack baseball glove for the game.", date: addDays(now, 4).toISOString() },
        { text: "Book hotel for vacation.", date: addDays(now, 8).toISOString() },
        { text: "Order graduation gown.", date: addDays(now, 12).toISOString() },
        { text: "Invite friends to beach day.", date: addDays(now, 18).toISOString() },
        { text: "Register for marathon.", date: addDays(now, 25).toISOString() },
        { text: "Plan party playlist.", date: addDays(now, 40).toISOString() },
      ];
      // Save to storage
      await AsyncStorage.setItem("countdowns", JSON.stringify([...upcoming, ...past]));
      await AsyncStorage.setItem("notes", JSON.stringify(notes));
      setEventCount(upcoming.length + past.length);
      Alert.alert("Seeded!", "App data has been reset and seeded with test data.");
    } catch (error) {
      Alert.alert("Error", "Failed to seed test data.");
    }
  };


  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <TouchableOpacity activeOpacity={0.7} onPress={handleAppInfoTap}>
            <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>App Info</Text>
            <Text style={[styles.appVersion, { color: theme.colors.text }]}>Version {appInfo.version}</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>Appearance</Text>
          <View style={styles.themeToggleContainer}>
            <Text style={[styles.themeLabel, { color: theme.colors.text }]}>Dark Theme</Text>
            <Switch
              value={isDark}
              onValueChange={() => {
                // Light haptic feedback for theme toggle
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleTheme();
              }}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={isDark ? theme.colors.surface : theme.colors.textLight}
            />
          </View>
        </View>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>Event Stats</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Events</Text>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>{eventCount}</Text>
        </View>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>Actions</Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={[styles.clearButton, { backgroundColor: theme.colors.button }]}
          >
            <Text style={[styles.clearButtonText, { color: theme.colors.buttonText }]}>Clear All Events</Text>
          </TouchableOpacity>
        </View>
        <Modal
          animationType="fade"
          transparent
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: theme.colors.modalOverlay }]}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.modalBackground, borderColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Confirm Clear</Text>
              <Text style={[styles.modalMessage, { color: theme.colors.textSecondary }]}>
                Are you sure you want to clear all events?
              </Text>
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={[styles.button, { backgroundColor: theme.colors.border }]}
                >
                  <Text style={[styles.buttonText, { color: theme.colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={clearEvents}
                  style={[styles.button, { backgroundColor: theme.colors.error }]}
                >
                  <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  container: {
    flex: 1,
    alignItems: "center",
    padding: wp("4%"),
    paddingTop: wp("8%")
  },

  card: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: wp('3%'),
    padding: wp('5%'),
    marginBottom: wp('3%'),
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: wp('2%'),
    elevation: 2,
  },
  cardTitle: {
    fontSize: wp('4%'),
    color: '#3498DB',
    fontWeight: 'bold',
    marginBottom: wp('2%'),
    fontFamily: 'monospace',
  },
  appName: {
    fontSize: wp("5%"),
    fontWeight: "bold",
    color: "#3498DB",
    fontFamily: "monospace",
    marginBottom: wp("1.5%")
  },
  appVersion: {
    fontSize: wp("3.5%"),
    color: "#2C3E50",
    fontFamily: "monospace",
    marginBottom: wp("1%")
  },
  appDescription: {
    fontSize: wp("3%"),
    color: "#7F8C8D",
    fontFamily: "monospace",
    textAlign: "center"
  },
  statLabel: {
    fontSize: wp("3%"),
    color: "#7F8C8D",
    fontFamily: "monospace",
    marginBottom: wp("1%")
  },
  statValue: {
    fontSize: wp("4.5%"),
    color: "#3498DB",
    fontWeight: "bold",
    fontFamily: "monospace",
    marginBottom: wp("1%")
  },
  clearButton: {
    backgroundColor: "#3498DB",
    paddingVertical: wp("3.5%"),
    paddingHorizontal: wp("5%"),
    borderRadius: wp("2%")
  },
  clearButtonText: {
    color: "#FFFFFF",
    fontSize: wp("3%"),
    fontWeight: "bold",
    fontFamily: "monospace"
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#FFFFFF",
    borderRadius: wp("3%"),
    padding: wp("4%"),
    alignItems: "center",
    elevation: 5,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: wp("3.5%"),
    fontWeight: "bold",
    marginBottom: wp("3%"),
    textAlign: "center",
    color: "#2C3E50",
    fontFamily: "monospace",
  },
  modalMessage: {
    fontSize: wp("2.5%"),
    marginBottom: wp("4%"),
    textAlign: "center",
    color: "#7F8C8D",
    fontFamily: "monospace",
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  button: {
    flex: 1,
    marginHorizontal: wp("1%"),
    padding: wp("3.5%"),
    borderRadius: wp("2%"),
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: wp("2%"),
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  // Theme toggle styles
  themeToggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: wp("2%"),
  },
  themeLabel: {
    fontSize: wp("3.5%"),
    fontFamily: "monospace",
  },
});

export default SettingsScreen;
