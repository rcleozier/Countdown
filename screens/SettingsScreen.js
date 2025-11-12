import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  SafeAreaView,
  Alert,
  Switch,
  ScrollView,
  Animated,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import appConfig from '../app.json';
import { Analytics } from '../util/analytics';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const SettingsScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [appInfoTapCount, setAppInfoTapCount] = useState(0);
  const appInfo = appConfig.expo;
  const { theme, isDark, toggleTheme } = useTheme();
  const navigation = useNavigation();
  
  // Animation refs for press feedback
  const clearButtonScale = useRef(new Animated.Value(1)).current;
  const cardScales = useRef({}).current;

  useEffect(() => {
    Analytics.initialize();
    Analytics.trackScreenView('Settings');
  }, []);

  // Clear all events
  const clearEvents = async () => {
    try {
      await AsyncStorage.removeItem("countdowns");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Analytics.trackEvent && Analytics.trackEvent('clear_all_events', { timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("Error clearing events", error);
    }
    setModalVisible(false);
  };

  // Navigate to notes screen
  const handleNotesPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('NotesScreen');
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
      await AsyncStorage.removeItem("countdowns");
      await AsyncStorage.removeItem("notes");
      const now = new Date();
      const addDays = (date, days) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
      };
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
      const notes = [
        { text: "Buy cake for Mom's birthday!", date: addDays(now, 2).toISOString() },
        { text: "Pack baseball glove for the game.", date: addDays(now, 4).toISOString() },
        { text: "Book hotel for vacation.", date: addDays(now, 8).toISOString() },
        { text: "Order graduation gown.", date: addDays(now, 12).toISOString() },
        { text: "Invite friends to beach day.", date: addDays(now, 18).toISOString() },
        { text: "Register for marathon.", date: addDays(now, 25).toISOString() },
        { text: "Plan party playlist.", date: addDays(now, 40).toISOString() },
      ];
      await AsyncStorage.setItem("countdowns", JSON.stringify([...upcoming, ...past]));
      await AsyncStorage.setItem("notes", JSON.stringify(notes));
      Alert.alert("Seeded!", "App data has been reset and seeded with test data.");
    } catch (error) {
      Alert.alert("Error", "Failed to seed test data.");
    }
  };

  // Card press handlers
  const getCardScale = (key) => {
    if (!cardScales[key]) {
      cardScales[key] = new Animated.Value(1);
    }
    return cardScales[key];
  };

  const handleCardPressIn = (key) => {
    const scale = getCardScale(key);
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handleCardPressOut = (key) => {
    const scale = getCardScale(key);
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  // Clear button press handlers
  const handleClearPressIn = () => {
    Animated.spring(clearButtonScale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handleClearPressOut = () => {
    Animated.spring(clearButtonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  // Accent color
  const accentColor = isDark ? '#4E9EFF' : '#4A9EFF';
  const clearButtonColor = '#E15747';
  
  // Background gradient
  const backgroundGradient = isDark 
    ? ['#121212', '#1C1C1C']
    : ['#F9FAFB', '#FFFFFF'];

  return (
    <LinearGradient colors={backgroundGradient} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* App Info */}
          <Pressable
            onPressIn={() => handleCardPressIn('appInfo')}
            onPressOut={() => handleCardPressOut('appInfo')}
            onPress={handleAppInfoTap}
          >
            <Animated.View style={[
              styles.card,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
                transform: [{ scale: getCardScale('appInfo') }],
              }
            ]}>
              <Text style={[
                styles.cardTitle,
                { color: accentColor }
              ]}>App Info</Text>
              <Text style={[
                styles.cardSubtext,
                { color: isDark ? '#A1A1A1' : '#9CA3AF' }
              ]}>Version {appInfo.version}</Text>
            </Animated.View>
          </Pressable>

          {/* Notes */}
          <Pressable
            onPressIn={() => handleCardPressIn('notes')}
            onPressOut={() => handleCardPressOut('notes')}
            onPress={handleNotesPress}
          >
            <Animated.View style={[
              styles.card,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
                transform: [{ scale: getCardScale('notes') }],
              }
            ]}>
              <Text style={[
                styles.cardTitle,
                { color: accentColor }
              ]}>Notes</Text>
              <Text style={[
                styles.cardSubtext,
                { color: isDark ? '#A1A1A1' : '#9CA3AF' }
              ]}>View and manage your notes</Text>
            </Animated.View>
          </Pressable>

          {/* Appearance */}
          <View style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
            }
          ]}>
            <Text style={[
              styles.cardTitle,
              { color: accentColor }
            ]}>Appearance</Text>
            <View style={styles.themeToggleContainer}>
              <Text style={[
                styles.themeLabel,
                { color: isDark ? '#FFFFFF' : '#1A1A1A' }
              ]}>Dark Theme</Text>
              <Switch
                value={isDark}
                onValueChange={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleTheme();
                }}
                trackColor={{ 
                  false: isDark ? '#3A3A3A' : '#E5E7EB', 
                  true: isDark ? '#3A3A3A' : accentColor 
                }}
                thumbColor={isDark ? accentColor : '#FFFFFF'}
                ios_backgroundColor={isDark ? '#3A3A3A' : '#E5E7EB'}
              />
            </View>
          </View>

          {/* Actions */}
          <View style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
            }
          ]}>
            <Text style={[
              styles.cardTitle,
              { color: accentColor }
            ]}>Actions</Text>
            <Pressable
              onPressIn={handleClearPressIn}
              onPressOut={handleClearPressOut}
              onPress={() => setModalVisible(true)}
            >
              <Animated.View style={[
                styles.clearButton,
                {
                  backgroundColor: clearButtonColor,
                  shadowColor: 'rgba(0,0,0,0.15)',
                  transform: [{ scale: clearButtonScale }],
                }
              ]}>
                <Text style={styles.clearButtonText}>Clear All Events</Text>
              </Animated.View>
            </Pressable>
          </View>

          {/* Confirmation Modal */}
          <Modal
            animationType="fade"
            transparent
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={[
              styles.modalOverlay,
              { backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)' }
            ]}>
              <View style={[
                styles.modalContent,
                {
                  backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 8,
                }
              ]}>
                <Text style={[
                  styles.modalTitle,
                  { color: isDark ? '#FFFFFF' : '#1A1A1A' }
                ]}>Confirm Clear</Text>
                <Text style={[
                  styles.modalMessage,
                  { color: isDark ? '#A1A1A1' : '#6B7280' }
                ]}>
                  Are you sure you want to clear all events? This action cannot be undone.
                </Text>
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={[
                      styles.modalButton,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      }
                    ]}
                  >
                    <Text style={[
                      styles.modalButtonText,
                      { color: isDark ? '#FFFFFF' : '#1A1A1A' }
                    ]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={clearEvents}
                    style={[
                      styles.modalButton,
                      {
                        backgroundColor: clearButtonColor,
                      }
                    ]}
                  >
                    <Text style={styles.modalButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: wp('5%'),
    paddingTop: wp('6%'),
    paddingBottom: wp('8%'),
  },
  card: {
    width: '100%',
    borderRadius: wp('3.5%'), // 12-14px
    padding: wp('4%'), // 16px
    marginBottom: wp('6%'), // 24px vertical spacing
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: wp('4.25%'), // 16-17px
    fontWeight: '600',
    fontFamily: 'System',
    marginBottom: wp('1%'),
  },
  cardSubtext: {
    fontSize: wp('3.5%'), // 14px
    fontWeight: '500',
    fontFamily: 'System',
    marginTop: wp('0.5%'),
    lineHeight: wp('5%'),
  },
  themeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: wp('2%'),
  },
  themeLabel: {
    fontSize: wp('3.5%'),
    fontWeight: '500',
    fontFamily: 'System',
  },
  clearButton: {
    marginTop: wp('2%'),
    paddingVertical: wp('3.5%'),
    paddingHorizontal: wp('5%'),
    borderRadius: wp('2.5%'), // 8-10px
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: wp('3.5%'),
    fontWeight: '600',
    fontFamily: 'System',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: wp('4%'),
    padding: wp('5%'),
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: wp('4.5%'),
    fontWeight: '700',
    fontFamily: 'System',
    marginBottom: wp('2%'),
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: wp('3.5%'),
    fontWeight: '500',
    fontFamily: 'System',
    marginBottom: wp('5%'),
    textAlign: 'center',
    lineHeight: wp('5%'),
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp('3%'),
  },
  modalButton: {
    flex: 1,
    paddingVertical: wp('3.5%'),
    borderRadius: wp('2.5%'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: wp('3.5%'),
    fontWeight: '600',
    fontFamily: 'System',
  },
});

export default SettingsScreen;
