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
  Linking,
  Platform,
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
import { useLocale } from '../context/LocaleContext';
import { SUPPORTED_LOCALES } from '../util/i18n';
import { usePurchases } from '../src/billing/PurchasesProvider';
import PaywallSheet from '../src/billing/PaywallSheet';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { buildRemindersForEvent, createDefaultReminderPlan } from '../util/reminderBuilder';
import { syncScheduledReminders } from '../util/reminderScheduler';

const SettingsScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [appInfoTapCount, setAppInfoTapCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const appInfo = appConfig.expo;
  const { theme, isDark, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const { isPro, restore, isLoading: purchasesLoading } = usePurchases();
  const navigation = useNavigation();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  
  // Animation refs for press feedback
  const clearButtonScale = useRef(new Animated.Value(1)).current;
  const clearButtonOpacity = useRef(new Animated.Value(1)).current;
  const cardScales = useRef({}).current;

  useEffect(() => {
    Analytics.initialize();
    Analytics.trackScreenView('Settings');
    loadEventCount();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEventCount();
    }, [])
  );

  const loadEventCount = async () => {
    try {
      const stored = await AsyncStorage.getItem('countdowns');
      if (stored) {
        const events = JSON.parse(stored);
        if (Array.isArray(events)) {
          setEventCount(events.length);
        }
      }
    } catch (error) {
      console.error('Error loading event count:', error);
    }
  };

  // Clear all events
  const clearEvents = async () => {
    try {
      await AsyncStorage.removeItem("countdowns");
      setEventCount(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Analytics.trackEvent && Analytics.trackEvent('clear_all_events', { timestamp: new Date().toISOString() });
      Alert.alert('Cleared', 'All events have been deleted.');
    } catch (error) {
      console.error("Error clearing events", error);
      Alert.alert('Error', 'Failed to clear events.');
    }
    setModalVisible(false);
  };

  // Open subscription management
  const openSubscriptionManagement = async () => {
    try {
      if (Platform.OS === 'ios') {
        const url = 'https://apps.apple.com/account/subscriptions';
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Manage Subscription', 'Please go to Settings > Apple ID > Subscriptions to manage your subscription.');
        }
      } else if (Platform.OS === 'android') {
        const url = 'https://play.google.com/store/account/subscriptions';
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Manage Subscription', 'Please go to Google Play Store > Subscriptions to manage your subscription.');
        }
      }
    } catch (error) {
      console.error('Error opening subscription management:', error);
      Alert.alert('Error', 'Could not open subscription management. Please go to your device settings.');
    }
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
        // Set time to 9:00 AM for the event
        eventDate.setHours(9, 0, 0, 0);
        const minAgo = 1;
        const maxAgo = Math.max(e.days - 1, 1);
        const daysAgo = Math.floor(Math.random() * (maxAgo - minAgo + 1)) + minAgo;
        const createdAt = addDays(now, -daysAgo);
        const event = {
          id: `upcoming-${i}`,
          name: e.name,
          icon: e.icon,
          date: eventDate.toISOString(),
          createdAt: createdAt.toISOString(),
          nextOccurrenceAt: eventDate.toISOString(),
          recurrence: 'none',
          reminderPlan: createDefaultReminderPlan('simple'),
        };
        // Build reminders for the event (using the event's actual date)
        event.reminders = buildRemindersForEvent(event, isPro);
        return event;
      });
      const past = [
        { name: "Dentist", icon: "🦷", days: -2 },
        { name: "Basketball Game", icon: "🏀", days: -5 },
        { name: "Movie Night", icon: "🎬", days: -10 },
        { name: "School Start", icon: "🏫", days: -15 },
        { name: "Interview", icon: "💼", days: -20 },
        { name: "Housewarming", icon: "🏠", days: -30 },
        { name: "Concert", icon: "🎤", days: -45 },
      ].map((e, i) => {
        const eventDate = addDays(now, e.days);
        const event = {
          id: `past-${i}`,
          name: e.name,
          icon: e.icon,
          date: eventDate.toISOString(),
          createdAt: addDays(now, e.days - 5).toISOString(),
          nextOccurrenceAt: eventDate.toISOString(),
          recurrence: 'none',
          reminderPlan: createDefaultReminderPlan('off'), // Past events don't need reminders
        };
        event.reminders = buildRemindersForEvent(event, isPro);
        return event;
      });
      const notes = [
        { text: "Buy cake for Mom's birthday!", date: addDays(now, 2).toISOString() },
        { text: "Pack baseball glove for the game.", date: addDays(now, 4).toISOString() },
        { text: "Book hotel for vacation.", date: addDays(now, 8).toISOString() },
        { text: "Order graduation gown.", date: addDays(now, 12).toISOString() },
        { text: "Invite friends to beach day.", date: addDays(now, 18).toISOString() },
        { text: "Register for marathon.", date: addDays(now, 25).toISOString() },
        { text: "Plan party playlist.", date: addDays(now, 40).toISOString() },
      ];
      const allEvents = [...upcoming, ...past];
      await AsyncStorage.setItem("countdowns", JSON.stringify(allEvents));
      await AsyncStorage.setItem("notes", JSON.stringify(notes));
      
      // Schedule notifications for events with reminders
      await syncScheduledReminders(allEvents, isPro);
      
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
    Animated.parallel([
      Animated.spring(clearButtonScale, {
        toValue: 0.97,
        useNativeDriver: true,
      }),
      Animated.timing(clearButtonOpacity, {
        toValue: 0.9, // Lighten color 8-10%
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleClearPressOut = () => {
    Animated.parallel([
      Animated.spring(clearButtonScale, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(clearButtonOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Accent color
  const accentColor = isDark ? '#4E9EFF' : '#4A9EFF';
  const clearButtonColor = isDark ? '#D64C3C' : '#E15747';
  
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
                backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
                transform: [{ scale: getCardScale('appInfo') }],
              }
            ]}>
              <Text style={[
                styles.cardTitle,
                { color: accentColor }
              ]}>{t('settings.appInfo')}</Text>
              <Text style={[
                styles.cardSubtext,
                { color: isDark ? '#A1A1A1' : '#6B7280' }
              ]}>{t('settings.version')} {appInfo.version}</Text>
            </Animated.View>
          </Pressable>

          {/* Subscription */}
          <View style={[
            styles.card,
            {
              backgroundColor: isPro
                ? (isDark ? 'rgba(60,196,162,0.05)' : 'rgba(78,158,255,0.03)')
                : (isDark ? '#1E1E1E' : '#FFFFFF'),
              shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
              borderTopWidth: isPro ? 1 : 0,
              borderTopColor: isPro
                ? (isDark ? 'rgba(60,196,162,0.2)' : 'rgba(78,158,255,0.15)')
                : 'transparent',
            }
          ]}>
            <View style={styles.subscriptionHeader}>
              <View style={[
                styles.subscriptionIconContainer,
                {
                  backgroundColor: isPro
                    ? (isDark ? 'rgba(60,196,162,0.1)' : 'rgba(78,158,255,0.08)')
                    : (isDark ? 'rgba(78,158,255,0.15)' : 'rgba(78,158,255,0.1)'),
                }
              ]}>
                <Ionicons
                  name={isPro ? "checkmark-circle" : "star"}
                  size={isPro ? wp('4%') : wp('5%')}
                  color={isPro 
                    ? (isDark ? '#3CC4A2' : '#4E9EFF')
                    : (isDark ? '#4E9EFF' : '#4A9EFF')
                  }
                />
              </View>
              <View style={styles.subscriptionTextContainer}>
                <Text style={[
                  styles.cardTitle,
                  { color: accentColor }
                ]}>
                  {isPro ? 'Pro Active' : 'Upgrade to Pro'}
                </Text>
                {isPro ? (
                  <>
                    <Text style={[
                      styles.cardSubtext,
                      { color: isDark ? '#A1A1A1' : '#6B7280', marginTop: wp('1%') }
                    ]}>
                      Recurring countdowns, advanced reminders, no ads
                    </Text>
                    <Text style={[
                      styles.proThankYou,
                      { color: isDark ? '#6B7280' : '#9CA3AF', marginTop: wp('2%') }
                    ]}>
                      Thanks for supporting the app
                    </Text>
                  </>
                ) : (
                  <View style={styles.benefitsList}>
                    <Text style={[
                      styles.benefitItem,
                      { color: isDark ? '#A1A1A1' : '#6B7280' }
                    ]}>• No ads</Text>
                    <Text style={[
                      styles.benefitItem,
                      { color: isDark ? '#A1A1A1' : '#6B7280' }
                    ]}>• Advanced reminders & notes</Text>
                    <Text style={[
                      styles.benefitItem,
                      { color: isDark ? '#A1A1A1' : '#6B7280' }
                    ]}>• Recurring countdowns</Text>
                  </View>
                )}
              </View>
            </View>
            {isPro ? (
              <View style={{ marginTop: wp('3%') }}>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    openSubscriptionManagement();
                  }}
                  style={[
                    styles.proCtaButton,
                    {
                      backgroundColor: isDark ? 'rgba(78,158,255,0.15)' : 'rgba(78,158,255,0.1)',
                      borderColor: isDark ? 'rgba(78,158,255,0.3)' : 'rgba(78,158,255,0.2)',
                    }
                  ]}
                >
                  <Text style={[
                    styles.proCtaText,
                    { color: accentColor }
                  ]}>Manage Subscription</Text>
                </Pressable>
                <Text style={[
                  styles.proManageSubtext,
                  { color: isDark ? '#6B7280' : '#9CA3AF' }
                ]}>
                  Cancel anytime in Apple ID settings
                </Text>
              </View>
            ) : (
              <>
                <Pressable
                  onPressIn={() => handleCardPressIn('subscription')}
                  onPressOut={() => handleCardPressOut('subscription')}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSubscriptionModalVisible(true);
                  }}
                  style={[
                    styles.proCtaButton,
                    {
                      backgroundColor: accentColor,
                      marginTop: wp('4%'),
                    }
                  ]}
                >
                  <Animated.View style={[
                    { transform: [{ scale: getCardScale('subscription') }] }
                  ]}>
                    <Text style={styles.proCtaTextActive}>Go Pro</Text>
                  </Animated.View>
                </Pressable>
                <Text style={[
                  styles.proCtaSubtext,
                  { color: isDark ? '#6B7280' : '#9CA3AF' }
                ]}>Cancel anytime</Text>
              </>
            )}
          </View>

          {/* Language */}
          <View style={[
            styles.card,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
            }
          ]}>
            <Text style={[
              styles.cardTitle,
              { color: accentColor }
            ]}>Language</Text>
            <View style={styles.languageRow}>
              <View style={{ flex: 1 }}>
                <Text style={[
                  styles.cardSubtext,
                  { color: isDark ? '#A1A1A1' : '#6B7280' }
                ]}>
                  {SUPPORTED_LOCALES[locale]?.name || locale}
                </Text>
              </View>
              <Pressable
                onPressIn={() => handleCardPressIn('language')}
                onPressOut={() => handleCardPressOut('language')}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setLanguageModalVisible(true);
                }}
              >
                <Animated.View style={[
                  { transform: [{ scale: getCardScale('language') }] }
                ]}>
                  <Ionicons
                    name="chevron-forward"
                    size={wp('4%')}
                    color={isDark ? '#6B7280' : '#9CA3AF'}
                  />
                </Animated.View>
              </Pressable>
            </View>
          </View>

          {/* Appearance */}
          <View style={[
            styles.card,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
            }
          ]}>
            <Text style={[
              styles.cardTitle,
              { color: accentColor }
            ]}>Appearance</Text>
            <View style={styles.themeToggleContainer}>
              <View>
                <Text style={[
                  styles.themeLabel,
                  { color: isDark ? '#FFFFFF' : '#1A1A1A' }
                ]}>Theme</Text>
                <Text style={[
                  styles.themeValue,
                  { color: isDark ? '#A1A1A1' : '#6B7280' }
                ]}>{isDark ? 'Dark' : 'Light'}</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleTheme();
                }}
                trackColor={{ 
                  false: '#E5E7EB', 
                  true: isDark ? '#2E2E2E' : accentColor 
                }}
                thumbColor={isDark ? '#3CC4A2' : '#FFFFFF'}
                ios_backgroundColor={isDark ? '#2E2E2E' : '#E5E7EB'}
              />
            </View>
          </View>

          {/* Actions */}
          <View style={[
            styles.card,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
            }
          ]}>
            <Text style={[
              styles.sectionHeader,
              { color: isDark ? '#A1A1A1' : '#6B7280' }
            ]}>Actions</Text>
            
            {/* Restore Purchases - Only show when not Pro */}
            {!isPro && (
              <Pressable
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsRestoring(true);
                  try {
                    await restore();
                    Alert.alert(
                      'Restore Complete',
                      isPro 
                        ? 'Your Pro subscription has been restored.'
                        : 'No active purchases found.',
                      [{ text: 'OK' }]
                    );
                  } catch (err) {
                    Alert.alert(
                      'Restore Failed',
                      err.message || 'Could not restore purchases. Please try again.',
                      [{ text: 'OK' }]
                    );
                  } finally {
                    setIsRestoring(false);
                  }
                }}
                disabled={isRestoring || purchasesLoading}
                style={{ marginBottom: wp('3%') }}
              >
                <View style={[
                  styles.actionRow,
                  {
                    paddingVertical: wp('3%'),
                    paddingHorizontal: wp('4%'),
                    borderRadius: wp('2.5%'),
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  }
                ]}>
                  <Ionicons
                    name="refresh"
                    size={wp('5%')}
                    color={isDark ? '#A1A1A1' : '#6B7280'}
                  />
                  <Text style={[
                    styles.actionText,
                    { color: isDark ? '#F5F5F5' : '#111111', marginLeft: wp('3%') }
                  ]}>
                    {isRestoring ? 'Restoring...' : 'Restore Purchases'}
                  </Text>
                </View>
              </Pressable>
            )}
            
            {/* Destructive: Clear All Events */}
            <Pressable
              onPressIn={handleClearPressIn}
              onPressOut={handleClearPressOut}
              onPress={() => setModalVisible(true)}
            >
              <Animated.View style={[
                styles.clearButton,
                {
                  backgroundColor: isDark ? 'rgba(225,87,71,0.1)' : 'rgba(225,87,71,0.05)',
                  borderColor: isDark ? 'rgba(225,87,71,0.3)' : 'rgba(225,87,71,0.2)',
                  borderWidth: 1,
                  shadowColor: 'transparent',
                  transform: [{ scale: clearButtonScale }],
                  opacity: clearButtonOpacity,
                }
              ]}>
                <Ionicons
                  name="trash-outline"
                  size={wp('4%')}
                  color={clearButtonColor}
                  style={{ marginRight: wp('2%') }}
                />
                <Text style={[
                  styles.clearButtonText,
                  { color: clearButtonColor }
                ]}>{t('settings.clearAll')}</Text>
              </Animated.View>
            </Pressable>
          </View>

          {/* Developer Section (DEV ONLY) */}
          {__DEV__ && (
            <View style={[
              styles.card,
              {
                backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
              }
            ]}>
              <Text style={[
                styles.sectionHeader,
                { color: isDark ? '#A1A1A1' : '#6B7280' }
              ]}>Developer</Text>
              <Pressable
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  // Toggle Pro status for debugging
                  const cached = await AsyncStorage.getItem('@entitlements_cache');
                  const data = cached ? JSON.parse(cached) : { isPro: false };
                  const newProStatus = !data.isPro;
                  await AsyncStorage.setItem('@entitlements_cache', JSON.stringify({
                    ...data,
                    isPro: newProStatus,
                    timestamp: Date.now(),
                  }));
                  Alert.alert('Debug', `Pro status toggled to ${newProStatus}. Restart app to see changes.`);
                }}
              >
                <View style={[
                  styles.actionRow,
                  {
                    paddingVertical: wp('3%'),
                    paddingHorizontal: wp('4%'),
                    borderRadius: wp('2.5%'),
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  }
                ]}>
                  <Ionicons
                    name="bug"
                    size={wp('5%')}
                    color={isDark ? '#A1A1A1' : '#6B7280'}
                  />
                  <Text style={[
                    styles.actionText,
                    { color: isDark ? '#F5F5F5' : '#111111', marginLeft: wp('3%') }
                  ]}>
                    Debug: Toggle Pro ({isPro ? 'ON' : 'OFF'})
                  </Text>
                </View>
              </Pressable>
            </View>
          )}

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
                ]}>Delete all events?</Text>
                <Text style={[
                  styles.modalMessage,
                  { color: isDark ? '#A1A1A1' : '#6B7280' }
                ]}>
                  This will permanently delete {eventCount} {eventCount === 1 ? 'event' : 'events'}. This can't be undone.
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
                    ]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                      clearEvents();
                    }}
                    style={[
                      styles.modalButton,
                      {
                        backgroundColor: clearButtonColor,
                      }
                    ]}
                  >
                    <Text style={styles.modalButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Language Selection Modal */}
          <Modal
            animationType="fade"
            transparent
            visible={languageModalVisible}
            onRequestClose={() => setLanguageModalVisible(false)}
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
                }
              ]}>
                <Text style={[
                  styles.modalTitle,
                  { color: isDark ? '#FFFFFF' : '#1A1A1A' }
                ]}>{t('settings.language')}</Text>
                {Object.entries(SUPPORTED_LOCALES).map(([code, localeData]) => (
                  <TouchableOpacity
                    key={code}
                    onPress={async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      await setLocale(code);
                      setLanguageModalVisible(false);
                    }}
                    style={[
                      styles.languageOption,
                      {
                        backgroundColor: locale === code
                          ? (isDark ? 'rgba(78,158,255,0.2)' : 'rgba(78,158,255,0.1)')
                          : 'transparent',
                        borderColor: locale === code
                          ? (isDark ? '#3CC4A2' : '#4E9EFF')
                          : 'transparent',
                      }
                    ]}
                  >
                    <Text style={[
                      styles.languageOptionText,
                      { color: isDark ? '#FFFFFF' : '#1A1A1A' }
                    ]}>{localeData.name}</Text>
                    {locale === code && (
                      <Text style={{ color: isDark ? '#3CC4A2' : '#4E9EFF' }}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => setLanguageModalVisible(false)}
                  style={[
                    styles.modalButton,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      marginTop: wp('3%'),
                    }
                  ]}
                >
                  <Text style={[
                    styles.modalButtonText,
                    { color: isDark ? '#FFFFFF' : '#1A1A1A' }
                  ]}>{t('common.close')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Subscription Modal */}
          <PaywallSheet
            visible={subscriptionModalVisible}
            onClose={() => setSubscriptionModalVisible(false)}
            feature="settings"
          />
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
    paddingHorizontal: wp('5%'), // 20px equal left/right padding
    paddingTop: wp('4%'), // Slight top padding to prevent crowding
    paddingBottom: wp('8%'),
  },
  card: {
    width: '100%',
    borderRadius: wp('3.5%'), // 12-14px
    padding: wp('4.5%'), // 16-18px
    marginBottom: wp('5%'), // 20-24px uniform vertical spacing
    borderWidth: 0, // Remove visible borders
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: wp('4.25%'), // 16-17px
    fontWeight: '600', // Semibold
    fontFamily: 'System',
    marginBottom: wp('1.5%'), // 6px spacing between title and subtitle
  },
  sectionHeader: {
    fontSize: wp('3.5%'), // 14px
    fontWeight: '500', // Medium
    fontFamily: 'System',
    marginBottom: wp('3%'),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardSubtext: {
    fontSize: wp('3.5%'), // 14px
    fontWeight: '500', // Medium
    fontFamily: 'System',
    lineHeight: wp('5%'),
  },
  themeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: wp('2%'),
  },
  themeLabel: {
    fontSize: wp('4%'),
    fontWeight: '500',
    fontFamily: 'System',
    marginBottom: wp('0.5%'),
  },
  themeValue: {
    fontSize: wp('3.5%'),
    fontWeight: '400',
    fontFamily: 'System',
  },
  languageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: wp('1%'),
  },
  helperText: {
    fontSize: wp('3%'),
    fontWeight: '400',
    fontFamily: 'System',
    marginTop: wp('1%'),
    fontStyle: 'italic',
  },
  clearButton: {
    marginTop: wp('2%'),
    paddingVertical: wp('3%'),
    paddingHorizontal: wp('4%'),
    borderRadius: wp('2.5%'),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  clearButtonText: {
    fontSize: wp('3.75%'), // 15px semibold
    fontWeight: '600', // Semibold
    fontFamily: 'System',
  },
  proCtaButton: {
    paddingVertical: wp('3.5%'),
    paddingHorizontal: wp('5%'),
    borderRadius: wp('2.5%'),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  proCtaText: {
    fontSize: wp('4%'),
    fontWeight: '600',
    fontFamily: 'System',
  },
  proCtaTextActive: {
    fontSize: wp('4%'),
    fontWeight: '600',
    fontFamily: 'System',
    color: '#FFFFFF',
  },
  proCtaSubtext: {
    fontSize: wp('2.8%'),
    fontWeight: '400',
    fontFamily: 'System',
    textAlign: 'center',
    marginTop: wp('1.5%'),
  },
  proManageSubtext: {
    fontSize: wp('2.8%'),
    fontWeight: '400',
    fontFamily: 'System',
    textAlign: 'center',
    marginTop: wp('1.5%'),
  },
  proThankYou: {
    fontSize: wp('3%'),
    fontWeight: '400',
    fontFamily: 'System',
    fontStyle: 'italic',
  },
  benefitsList: {
    marginTop: wp('2%'),
  },
  benefitItem: {
    fontSize: wp('3.5%'),
    fontWeight: '400',
    fontFamily: 'System',
    marginTop: wp('1%'),
    lineHeight: wp('5%'),
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
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: wp('3.5%'),
    paddingHorizontal: wp('4%'),
    borderRadius: wp('2.5%'),
    marginBottom: wp('2%'),
    borderWidth: 1,
  },
  languageOptionText: {
    fontSize: wp('4%'),
    fontWeight: '500',
    fontFamily: 'System',
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscriptionIconContainer: {
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('5%'),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp('3%'),
  },
  subscriptionTextContainer: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: wp('4%'),
    fontWeight: '500',
    fontFamily: 'System',
  },
});

export default SettingsScreen;
