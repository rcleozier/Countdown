import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Alert,
  Dimensions,
  ScrollView,
  Pressable,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import CountdownItem from "../components/CountdownItem";
import { Calendar } from "react-native-calendars";
import { Picker } from '@react-native-picker/picker';
import moment from "moment";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Analytics, EVENTS } from '../util/analytics';
import { Ionicons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { ReviewManager } from '../util/reviewManager';
import { ENABLE_ADS, USE_TEST_ADS } from '../util/config';
import { AD_UNIT_IDS } from '../util/adConfig';
import eventIcons from '../util/eventIcons';
import TemplatePicker from '../components/TemplatePicker';
import ReminderPresetSelector from '../components/ReminderPresetSelector';
import NotesEditor from '../components/NotesEditor';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import { getPresetReminders } from '../util/reminderPresets';
import { getDefaultEventName } from '../util/eventTemplates';

const IconItem = ({ icon, isSelected, onPress, isDark }) => {
  const iconScale = useRef(new Animated.Value(1)).current;
  const iconOpacity = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPressIn={() => {
        Animated.parallel([
          Animated.spring(iconScale, {
            toValue: 1.05,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(iconOpacity, {
            toValue: 0.9,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }}
      onPressOut={() => {
        Animated.parallel([
          Animated.spring(iconScale, {
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(iconOpacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }}
      onPress={() => {
        // Pulse animation for selection
        Animated.sequence([
          Animated.timing(iconOpacity, {
            toValue: 0.8,
            duration: 75,
            useNativeDriver: true,
          }),
          Animated.timing(iconOpacity, {
            toValue: 1,
            duration: 75,
            useNativeDriver: true,
          }),
        ]).start();
        setTimeout(() => onPress(), 150);
      }}
    >
      <Animated.View style={[
        styles.iconItem,
        {
          backgroundColor: isSelected 
            ? (isDark ? 'rgba(78,158,255,0.15)' : 'rgba(78,158,255,0.1)')
            : (isDark ? '#2A2A2A' : '#F9FAFB'),
          borderColor: isSelected
            ? (isDark ? '#3CC4A2' : '#4E9EFF')
            : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
          borderWidth: isSelected ? 2 : 1,
          shadowColor: isSelected 
            ? (isDark ? '#3CC4A2' : '#4E9EFF')
            : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
          shadowOffset: isSelected ? { width: 0, height: 0 } : { width: 0, height: 2 },
          shadowOpacity: isSelected ? 0.2 : 1,
          shadowRadius: isSelected ? 4 : 2,
          elevation: isSelected ? 4 : 2,
          transform: [{ scale: iconScale }],
          opacity: iconOpacity,
        }
      ]}>
        <Text style={styles.iconText}>{icon}</Text>
      </Animated.View>
    </Pressable>
  );
};

const generateGUID = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const HomeScreen = () => {
  const [countdowns, setCountdowns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [tempSelectedDate, setTempSelectedDate] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("💻");
  const [confettiKey, setConfettiKey] = useState(0);
  const { theme, isDark } = useTheme();
  const { t } = useLocale();
  
  // New state for templates, reminders, search, filters
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [selectedReminderPresetId, setSelectedReminderPresetId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortType, setSortType] = useState('soonest');
  
  // Modal animation refs
  const modalScale = useRef(new Animated.Value(0.95)).current;
  const calendarModalScale = useRef(new Animated.Value(0.95)).current;
  const iconModalScale = useRef(new Animated.Value(0.95)).current;
  const [inputFocused, setInputFocused] = useState({});
  
  // Interstitial ad cooldown (5 minutes)
  const lastInterstitialTime = useRef(0);
  const INTERSTITIAL_COOLDOWN = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  // Empty state animation refs
  const emptyStateOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.95)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonFadeOpacity = useRef(new Animated.Value(0)).current; // For initial fade-in
  const buttonPressOpacity = useRef(new Animated.Value(1)).current; // For press animation

  // Icons are centralized in util/eventIcons to ensure add and edit use the same set

  // ----- Load / Save Data -----
  const loadCountdowns = async () => {
    try {
      setIsLoading(true);
      const storedCountdowns = await AsyncStorage.getItem("countdowns");
      const hasLaunchedBefore = await AsyncStorage.getItem("hasLaunchedBefore");
      
      if (storedCountdowns) {
        setCountdowns(JSON.parse(storedCountdowns));
      } else if (!hasLaunchedBefore) {
        // First time user - seed with test data
        await seedTestDataForNewUser();
        await AsyncStorage.setItem("hasLaunchedBefore", "true");
      } else {
        setCountdowns([]);
      }
    } catch (error) {
      console.error("Error loading countdowns", error);
    } finally {
      setIsLoading(false);
    }
  };

  const seedTestDataForNewUser = async () => {
    try {
      const now = new Date();
      const addDays = (date, days) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
      };
      
      // 7 upcoming countdowns with varied times
      const upcoming = [
        { name: "Sarah's Birthday", icon: "🎂", days: 1, hour: 14, minute: 30 },
        { name: "Baseball Game", icon: "⚾️", days: 5, hour: 19, minute: 0 },
        { name: "Vacation", icon: "✈️", days: 10, hour: 9, minute: 15 },
        { name: "Graduation", icon: "🎓", days: 15, hour: 16, minute: 0 },
        { name: "Beach Day", icon: "🏖️", days: 20, hour: 11, minute: 30 },
        { name: "Marathon", icon: "🏆", days: 30, hour: 7, minute: 0 },
        { name: "Party", icon: "🎉", days: 45, hour: 20, minute: 0 },
      ].map((e, i) => {
        const eventDate = addDays(now, e.days);
        eventDate.setHours(e.hour, e.minute, 0, 0);
        
        // Random createdAt between 1 and (days-1) days ago
        const minAgo = 1;
        const maxAgo = Math.max(e.days - 1, 1);
        const daysAgo = Math.floor(Math.random() * (maxAgo - minAgo + 1)) + minAgo;
        const createdAt = addDays(now, -daysAgo);
        
        return {
          id: `upcoming-${i}-${Date.now()}`,
          name: e.name,
          icon: e.icon,
          date: eventDate.toISOString(),
          createdAt: createdAt.toISOString(),
          notificationId: null, // Will be set if notifications are enabled
          notes: '',
          templateId: null,
          reminderPresetId: null,
          reminders: [],
        };
      });
      
      // 7 past countdowns
      const past = [
        { name: "Dentist", icon: "🦷", days: -2, hour: 10, minute: 0 },
        { name: "Basketball Game", icon: "🏀", days: -5, hour: 18, minute: 30 },
        { name: "Movie Night", icon: "🎬", days: -10, hour: 21, minute: 0 },
        { name: "School Start", icon: "🏫", days: -15, hour: 8, minute: 0 },
        { name: "Interview", icon: "💼", days: -20, hour: 14, minute: 0 },
        { name: "Housewarming", icon: "🏠", days: -30, hour: 17, minute: 30 },
        { name: "Concert", icon: "🎤", days: -45, hour: 19, minute: 30 },
      ].map((e, i) => {
        const eventDate = addDays(now, e.days);
        eventDate.setHours(e.hour, e.minute, 0, 0);
        
        return {
          id: `past-${i}-${Date.now()}`,
          name: e.name,
          icon: e.icon,
          date: eventDate.toISOString(),
          createdAt: addDays(now, e.days - 5).toISOString(),
          notificationId: null,
          notes: '',
          templateId: null,
          reminderPresetId: null,
          reminders: [],
        };
      });
      
      // 7 sample notes
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
      const allCountdowns = [...upcoming, ...past];
      await AsyncStorage.setItem("countdowns", JSON.stringify(allCountdowns));
      await AsyncStorage.setItem("notes", JSON.stringify(notes));
      setCountdowns(allCountdowns);
      
    } catch (error) {
      console.error("Error seeding test data:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCountdowns();
    }, [])
  );

  useEffect(() => {
    const saveCountdowns = async () => {
      try {
        await AsyncStorage.setItem("countdowns", JSON.stringify(countdowns));
      } catch (error) {
        console.error("Error saving countdowns", error);
      }
    };
    saveCountdowns();
  }, [countdowns]);

  // Search, filter, and sort logic
  const filteredAndSortedCountdowns = React.useMemo(() => {
    let filtered = [...countdowns];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => {
        const nameMatch = event.name?.toLowerCase().includes(query);
        const notesMatch = event.notes?.toLowerCase().includes(query);
        return nameMatch || notesMatch;
      });
    }
    
    // Apply type filter
    const now = new Date();
    if (filterType === 'upcoming') {
      filtered = filtered.filter(event => new Date(event.date) > now);
    } else if (filterType === 'past') {
      filtered = filtered.filter(event => new Date(event.date) <= now);
    }
    
    // Apply sort
    if (sortType === 'soonest') {
      filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sortType === 'recent') {
      filtered.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
    } else if (sortType === 'name') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    
    return filtered;
  }, [countdowns, searchQuery, filterType, sortType]);
  
  // For backward compatibility
  const sortedCountdowns = [...countdowns].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  const upcomingEvents = sortedCountdowns.filter(
    (event) => new Date(event.date) > new Date()
  );

  // Modal animation
  useEffect(() => {
    if (modalVisible) {
      Animated.spring(modalScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      modalScale.setValue(0.95);
    }
  }, [modalVisible]);

  // Calendar modal animation
  useEffect(() => {
    if (calendarModalVisible) {
      Animated.spring(calendarModalScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      calendarModalScale.setValue(0.95);
    }
  }, [calendarModalVisible]);

  // Icon modal animation
  useEffect(() => {
    if (iconPickerVisible) {
      Animated.spring(iconModalScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      iconModalScale.setValue(0.95);
    }
  }, [iconPickerVisible]);

  // Empty state animation
  useEffect(() => {
    if (upcomingEvents && upcomingEvents.length === 0 && !isLoading) {
      // Fade in entire view
      Animated.timing(emptyStateOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Icon bounce animation
      Animated.spring(iconScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
      
      // Button fade-in delayed 100ms
      setTimeout(() => {
        Animated.timing(buttonFadeOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }, 100);
    } else {
      emptyStateOpacity.setValue(0);
      iconScale.setValue(0.95);
      buttonFadeOpacity.setValue(0);
    }
  }, [upcomingEvents, isLoading]);

  const handleOpenCalendar = () => {
    setTempSelectedDate(null);
    setCalendarModalVisible(true);
  };

  const handleOpenTimePicker = () => {
    setTimePickerVisible(true);
  };

  const handleDayPress = (day) => {
    setTempSelectedDate(day.dateString);
  };

  const handleConfirmDate = () => {
    if (!tempSelectedDate) {
      Alert.alert("Please pick a date on the calendar.");
      return;
    }
    const [year, month, day] = tempSelectedDate.split("-");
    const finalDate = new Date(
      year,
      parseInt(month, 10) - 1,
      parseInt(day, 10)
    );
    setSelectedDate(finalDate);
    setCalendarModalVisible(false);
  };

  const handleConfirmTime = () => {
    setTimePickerVisible(false);
  };

  const handleOpenModal = () => {
    // Light haptic feedback for opening modal
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setModalVisible(true);
    setSelectedHour(9);
    setSelectedMinute(0);
  };

  // Schedules a notification only if the event time is in the future
  // Accepts a Date object and enforces a small safety buffer to avoid immediate triggers
  const scheduleNotificationIfFuture = async (eventName, eventDateInput) => {
    try {
      const eventDate = eventDateInput instanceof Date ? new Date(eventDateInput) : new Date(eventDateInput);
      const now = new Date();
      // Add a 5s buffer to avoid platform scheduling edge-cases (rounding/clock skew)
      const minTriggerTime = new Date(now.getTime() + 5000);
      if (eventDate.getTime() <= minTriggerTime.getTime()) {
        // Don't schedule if the time is in the past or now
        return null;
      }
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return null;
      const diffSeconds = Math.ceil((eventDate.getTime() - now.getTime()) / 1000);
      
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Countdown Reminder',
          body: `"${eventName}" is happening now!`,
          sound: true,
          data: { eventId: eventName },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: diffSeconds,
          repeats: false,
        },
      });
      return id;
    } catch (e) {
      console.warn('Could not schedule notification:', e);
      return null;
    }
  };

  const handleAddCountdown = async () => {
    if (!newName) return;
    const combinedDateTime = new Date(selectedDate);
    combinedDateTime.setHours(selectedHour);
    combinedDateTime.setMinutes(selectedMinute);
    combinedDateTime.setSeconds(0);
    combinedDateTime.setMilliseconds(0);
    if (combinedDateTime <= new Date()) {
      Alert.alert(t('common.error'), t('create.invalidDateTime'));
      return;
    }
    
    // Get reminders from preset if selected
    let reminders = [];
    if (selectedReminderPresetId) {
      reminders = getPresetReminders(selectedReminderPresetId);
    }
    
    // Schedule notifications for reminders
    const notificationIds = [];
    for (const reminder of reminders) {
      const reminderDate = new Date(combinedDateTime);
      if (reminder.unit === 'days') {
        reminderDate.setDate(reminderDate.getDate() - reminder.offset);
      } else if (reminder.unit === 'weeks') {
        reminderDate.setDate(reminderDate.getDate() - (reminder.offset * 7));
      } else if (reminder.unit === 'months') {
        reminderDate.setMonth(reminderDate.getMonth() - reminder.offset);
      }
      if (reminderDate > new Date()) {
        const notifId = await scheduleNotificationIfFuture(newName, reminderDate);
        if (notifId) notificationIds.push(notifId);
      }
    }
    
    const newCountdown = {
      id: generateGUID(),
      name: newName,
      date: combinedDateTime.toISOString(),
      icon: newIcon,
      notificationId: notificationIds.length > 0 ? notificationIds[0] : null,
      createdAt: new Date().toISOString(),
      // New fields
      notes: '',
      templateId: selectedTemplateId,
      reminderPresetId: selectedReminderPresetId,
      reminders: reminders,
    };
    setCountdowns((prev) => [...prev, newCountdown]);
    setNewName("");
    setNewIcon("💻");
    setSelectedDate(new Date());
    setSelectedHour(9);
    setSelectedMinute(0);
    setSelectedTemplateId(null);
    setSelectedReminderPresetId(null);
    setModalVisible(false);
    
    // Haptic feedback for successful creation
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Fire confetti by remounting the cannon
    setConfettiKey((k) => k + 1);
    
    Analytics.trackEvent(EVENTS.ADD_COUNTDOWN, {
      name: newName,
      date: combinedDateTime.toISOString(),
      icon: newIcon,
      timestamp: new Date().toISOString(),
    });

    // Request review if appropriate
    setTimeout(async () => {
      try {
        await ReviewManager.requestReview();
      } catch (error) {
        console.error('Error requesting review:', error);
      }
    }, 2000); // Wait 2 seconds after successful creation
  };

  const editCountdown = async (updatedEvent) => {
    try {
      // Cancel old notification if it exists
      const existingEvent = countdowns.find(item => item.id === updatedEvent.id);
      if (existingEvent && existingEvent.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(existingEvent.notificationId).catch(() => {});
      }

      // Schedule new notification
      const notificationId = await scheduleNotificationIfFuture(updatedEvent.name, new Date(updatedEvent.date));

      // Update the countdown with new notification ID
      const finalUpdatedEvent = {
        ...updatedEvent,
        notificationId,
      };

      setCountdowns((prev) => 
        prev.map((item) => 
          item.id === updatedEvent.id ? finalUpdatedEvent : item
        )
      );

      // Haptic feedback for successful edit
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Analytics.trackEvent(EVENTS.EDIT_COUNTDOWN, {
        id: updatedEvent.id,
        name: updatedEvent.name,
        date: updatedEvent.date,
        icon: updatedEvent.icon,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Could not update notification:', e);
    }
  };

  const deleteCountdown = async (id) => {
    setCountdowns((prev) => {
      const countdownToDelete = prev.find((item) => item.id === id);
      if (countdownToDelete && countdownToDelete.notificationId) {
        try {
          Notifications.cancelScheduledNotificationAsync(countdownToDelete.notificationId);
          console.log('Notification cancelled for:', countdownToDelete.name);
        } catch (error) {
          console.warn('Could not cancel notification:', error);
        }
      }
      
      // Track deletion with item details before removing from state
      if (countdownToDelete) {
        // Haptic feedback for deletion
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        
        Analytics.trackEvent(EVENTS.DELETE_COUNTDOWN, {
          id,
          name: countdownToDelete.name,
          date: countdownToDelete.date,
          icon: countdownToDelete.icon,
          timestamp: new Date().toISOString(),
        });
      }
      
      return prev.filter((item) => item.id !== id);
    });
  };

  // Initialize analytics on mount
  useEffect(() => {
    Analytics.initialize();
    Analytics.trackScreenView('Home');
    
    // Setup notification handler
    const setupNotifications = async () => {
      try {
        // Configure notification behavior
        await Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
        
        // Check if this is a new user and seed data
        const stored = await AsyncStorage.getItem("countdowns");
        if (!stored) {
          await seedTestDataForNewUser();
        }
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    };
    
    setupNotifications();
    
    // Random interstitial: load after 10s on screen mount
    let interstitialTimeout;
    if (ENABLE_ADS) {
      interstitialTimeout = setTimeout(async () => {
        const now = Date.now();
        // Check cooldown period
        if (now - lastInterstitialTime.current < INTERSTITIAL_COOLDOWN) {
          return; // Still in cooldown period
        }
        
        // 30% chance to show an interstitial
        const shouldShow = Math.random() < 0.3;
        if (!shouldShow) return;
        
        try {
          // Dynamically require to avoid native module when not available
          // eslint-disable-next-line global-require
          const { InterstitialAd, AdEventType, TestIds } = require('react-native-google-mobile-ads');
          const { getAdRequestOptions } = require('../util/adConfig');
          const unitId = USE_TEST_ADS ? TestIds.INTERSTITIAL : AD_UNIT_IDS.interstitial;
          
          // Get optimized ad request options for maximum revenue
          const requestOptions = await getAdRequestOptions();
          const interstitial = InterstitialAd.createForAdRequest(unitId, requestOptions);
          const onLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
            interstitial.show().catch(() => {});
            // Update last shown time when ad is displayed
            lastInterstitialTime.current = Date.now();
          });
          const onClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
            onLoaded();
            onClosed();
          });
          const onError = interstitial.addAdEventListener(AdEventType.ERROR, () => {
            onLoaded();
            onClosed();
          });
          interstitial.load();
        } catch (e) {
          // Ignore if module not available in current runtime
        }
      }, 10000);
    }
    
    return () => {
      if (interstitialTimeout) clearTimeout(interstitialTimeout);
    };
  }, []);

  // Test notification function (for debugging)
  const testNotification = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        const testId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Test Notification',
            body: 'This is a test notification to verify they are working!',
            sound: true,
          },
          trigger: { seconds: 2 }, // Show in 2 seconds
        });
        console.log('Test notification scheduled:', testId);
        Alert.alert('Test Sent', 'Test notification will appear in 2 seconds');
      } else {
        Alert.alert('Permission Denied', 'Please enable notifications in Settings');
      }
    } catch (error) {
      console.error('Test notification failed:', error);
      Alert.alert('Test Failed', 'Could not send test notification');
    }
  };

  const renderItem = ({ item, index }) => {
    return (
      <CountdownItem event={item} index={index} onDelete={deleteCountdown} onEdit={editCountdown} />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>

      {isLoading ? (
        <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>{t('common.loading')}</Text>
        </View>
      ) : filteredAndSortedCountdowns.length === 0 && !searchQuery && filterType === 'all' ? (
        <LinearGradient
          colors={isDark ? ['#121212', '#1C1C1C'] : ['#F9FAFB', '#FFFFFF']}
          style={styles.emptyContainer}
        >
          <Animated.View style={{ opacity: emptyStateOpacity, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {/* Calendar Icon with circular background */}
            <Animated.View style={[
              styles.emptyIconContainer,
              {
                backgroundColor: isDark ? 'rgba(78,158,255,0.15)' : 'rgba(78,158,255,0.08)',
                transform: [{ scale: iconScale }],
              }
            ]}>
              <Ionicons 
                name="calendar-outline" 
                size={wp('14%')} // ~52px for more padding
                color={isDark ? '#4E9EFF' : '#4A9EFF'} 
              />
            </Animated.View>
            
            {/* Title Text */}
            <Text style={[
              styles.emptyText,
              { color: isDark ? '#E5E7EB' : '#111111' }
            ]}>{t('home.emptyTitle')}</Text>
            
            {/* CTA Button */}
            <Pressable
              onPressIn={() => {
                Animated.parallel([
                  Animated.spring(buttonScale, {
                    toValue: 1.02,
                    useNativeDriver: true,
                  }),
                  Animated.timing(buttonPressOpacity, {
                    toValue: 0.92, // Lighten 8%
                    duration: 150,
                    useNativeDriver: true,
                  }),
                ]).start();
              }}
              onPressOut={() => {
                Animated.parallel([
                  Animated.spring(buttonScale, {
                    toValue: 1,
                    useNativeDriver: true,
                  }),
                  Animated.timing(buttonPressOpacity, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                  }),
                ]).start();
              }}
              onPress={handleOpenModal}
            >
              <Animated.View style={[
                styles.emptyActionButton,
                {
                  backgroundColor: isDark ? '#3C82F6' : '#4E9EFF',
                  shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)',
                  transform: [{ scale: buttonScale }],
                  opacity: buttonFadeOpacity,
                }
              ]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 1 }}>
                  <Ionicons name="add" size={wp('5%')} color="#FFFFFF" style={{ marginRight: wp('2%') }} />
                  <Text style={styles.emptyActionText}>Create Your First Event</Text>
                </View>
              </Animated.View>
            </Pressable>
          </Animated.View>
        </LinearGradient>
      ) : (
        <>
        <SearchBar onSearch={setSearchQuery} />
        <FilterBar 
          filterType={filterType}
          onFilterChange={setFilterType}
          sortType={sortType}
          onSortChange={setSortType}
        />
        <FlatList
          data={filteredAndSortedCountdowns}
          keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={[styles.listContainer, { backgroundColor: theme.colors.background }]}
          />
          {/* Floating Button to Add New Event */}
          <Pressable
            onPress={handleOpenModal}
            style={({ pressed }) => [
              styles.floatingButton,
              {
                backgroundColor: theme.colors.button,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              }
            ]}
          >
            <Ionicons name="add" size={wp('5%')} color={theme.colors.buttonText} style={{ marginRight: wp('2%') }} />
            <Text style={[styles.floatingButtonText, { color: theme.colors.buttonText }]}>Add New Event</Text>
          </Pressable>
        </>
      )}

      {/* Modal for creating a new countdown */}
      <Modal
        animationType="fade"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[
          styles.modalContainer,
          { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.25)' }
        ]}>
          <Animated.View style={[
            styles.modalContent,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
              transform: [{ scale: modalScale }],
            }
          ]}>
            <ScrollView 
              style={styles.modalFormScroll}
              contentContainerStyle={styles.modalFormContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[
                styles.modalTitle,
                { color: isDark ? '#F5F5F5' : '#111111' }
              ]}>{t('create.title')}</Text>
              
              {/* Template Picker */}
              <TemplatePicker
                selectedTemplateId={selectedTemplateId}
                onSelect={(templateId) => {
                  setSelectedTemplateId(templateId);
                  if (templateId) {
                    const template = require('../util/eventTemplates').TEMPLATES[templateId];
                    if (template) {
                      setNewIcon(template.icon);
                      // Set default reminder preset
                      if (template.defaultReminderPreset) {
                        setSelectedReminderPresetId(template.defaultReminderPreset);
                      }
                    }
                  }
                }}
                onSkip={() => setSelectedTemplateId(null)}
              />
              
              {/* Countdown Name Input */}
              <TextInput
                placeholder={t('create.namePlaceholder')}
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                value={newName}
                onChangeText={setNewName}
                onFocus={() => setInputFocused({ name: true })}
                onBlur={() => setInputFocused({ name: false })}
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#2B2B2B' : '#F9FAFB',
                    borderColor: inputFocused.name 
                      ? (isDark ? '#4E9EFF' : '#4A9EFF')
                      : (isDark ? 'rgba(255,255,255,0.05)' : '#E5E7EB'),
                    color: isDark ? '#F5F5F5' : '#111111',
                  }
                ]}
              />

              {/* Reminder Preset Selector */}
              <ReminderPresetSelector
                selectedPresetId={selectedReminderPresetId}
                onSelect={setSelectedReminderPresetId}
              />

            {/* Date Label + Button */}
            <Text style={[
              styles.iconLabel,
              { color: isDark ? '#A1A1A1' : '#6B7280' }
            ]}>{t('create.selectDate')}</Text>
            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  backgroundColor: isDark ? '#2B2B2B' : '#F9FAFB',
                  borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E5E7EB',
                }
              ]}
              onPress={handleOpenCalendar}
            >
              <Text style={[
                styles.iconButtonText,
                { color: isDark ? '#F5F5F5' : '#111111' }
              ]}>
                {moment(selectedDate).format("ddd, D MMM YYYY")}
              </Text>
            </TouchableOpacity>

            {/* Calendar Modal */}
            <Modal
              animationType="fade"
              transparent
              visible={calendarModalVisible}
              onRequestClose={() => setCalendarModalVisible(false)}
            >
              <View style={[
                styles.modalContainer,
                { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.25)' }
              ]}>
                <Animated.View style={[
                  styles.calendarModalContent,
                  {
                    backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                    shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
                    transform: [{ scale: calendarModalScale }],
                  }
                ]}>
                  <Text style={[
                    styles.modalTitle,
                    { color: isDark ? '#F5F5F5' : '#111111' }
                  ]}>{t('create.selectDate')}</Text>
                  <Calendar
                    key={theme.name}
                    style={styles.calendar}
                    onDayPress={handleDayPress}
                    minDate={moment().format("YYYY-MM-DD")}
                    theme={{
                      backgroundColor: 'transparent',
                      calendarBackground: 'transparent',
                      textSectionTitleColor: isDark ? '#A1A1A1' : '#6B7280',
                      dayTextColor: isDark ? '#F5F5F5' : '#111111',
                      todayTextColor: '#4E9EFF',
                      monthTextColor: isDark ? '#A1A1A1' : '#6B7280',
                      arrowColor: '#4E9EFF',
                      selectedDayBackgroundColor: isDark ? '#3CC4A2' : '#4E9EFF',
                      selectedDayTextColor: '#FFFFFF',
                      textDisabledColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                      dotColor: '#4E9EFF',
                      selectedDotColor: '#FFFFFF',
                      "stylesheet.calendar.header": {
                        week: {
                          marginTop: wp('2%'),
                          marginBottom: wp('1%'),
                          flexDirection: "row",
                          justifyContent: "space-between",
                        },
                      },
                    }}
                  />
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={[
                        styles.button,
                        {
                          backgroundColor: isDark ? '#2E2E2E' : '#F3F4F6',
                        }
                      ]}
                      onPress={() => setCalendarModalVisible(false)}
                    >
                      <Text style={[
                        styles.buttonText,
                        { color: isDark ? '#E5E7EB' : '#111111' }
                      ]}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.button,
                        {
                          backgroundColor: isDark ? '#3CC4A2' : '#4E9EFF',
                          shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 1,
                          shadowRadius: 4,
                          elevation: 3,
                        }
                      ]}
                      onPress={handleConfirmDate}
                    >
                      <Text style={styles.buttonTextSave}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </View>
            </Modal>

            {/* Time Label + Button */}
            <Text style={[
              styles.iconLabel,
              { color: isDark ? '#A1A1A1' : '#6B7280' }
            ]}>Time</Text>
            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  backgroundColor: isDark ? '#2B2B2B' : '#F9FAFB',
                  borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E5E7EB',
                }
              ]}
              onPress={handleOpenTimePicker}
            >
              <Text style={[
                styles.iconButtonText,
                { color: isDark ? '#F5F5F5' : '#111111' }
              ]}>
                {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}
              </Text>
            </TouchableOpacity>

            {/* Time Picker Modal */}
            <Modal
              animationType="fade"
              transparent
              visible={timePickerVisible}
              onRequestClose={() => setTimePickerVisible(false)}
            >
              <View style={[styles.timePickerOverlay, { backgroundColor: theme.colors.modalOverlay }]}>
                <View style={[styles.timePickerContent, { backgroundColor: theme.colors.modalBackground, borderColor: theme.colors.border }]}>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t('create.selectTime')}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                    <Picker
                      selectedValue={selectedHour}
                      style={{ width: wp('25%') }}
                      onValueChange={(itemValue) => setSelectedHour(itemValue)}
                    >
                      {[...Array(24).keys()].map((h) => (
                        <Picker.Item key={h} label={h.toString().padStart(2, '0')} value={h} />
                      ))}
                    </Picker>
                    <Text style={{ fontSize: wp('6%'), marginHorizontal: wp('2%') }}>:</Text>
                    <Picker
                      selectedValue={selectedMinute}
                      style={{ width: wp('25%') }}
                      onValueChange={(itemValue) => setSelectedMinute(itemValue)}
                    >
                      {[...Array(60).keys()].map((m) => (
                        <Picker.Item key={m} label={m.toString().padStart(2, '0')} value={m} />
                      ))}
                    </Picker>
                  </View>
                  <View style={styles.timePickerButtonContainer}>
                    <TouchableOpacity
                      style={[styles.button, { backgroundColor: theme.colors.border }]}
                      onPress={() => setTimePickerVisible(false)}
                    >
                      <Text style={[styles.buttonText, { color: theme.colors.text }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, { backgroundColor: theme.colors.primary }]}
                      onPress={() => setTimePickerVisible(false)}
                    >
                      <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            {/* Icon Label + Button */}
            <Text style={[
              styles.iconLabel,
              { color: isDark ? '#A1A1A1' : '#6B7280' }
            ]}>Icon</Text>
            <TouchableOpacity
              onPress={() => setIconPickerVisible(true)}
              style={[
                styles.iconButton,
                {
                  backgroundColor: isDark ? '#2B2B2B' : '#F9FAFB',
                  borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E5E7EB',
                }
              ]}
            >
              <Text style={[
                styles.iconButtonText,
                { color: isDark ? '#F5F5F5' : '#111111' }
              ]}>
                {newIcon ? `${t('create.selectIcon')}: ${newIcon}` : t('create.selectIcon')}
              </Text>
            </TouchableOpacity>

            {/* Icon Picker Modal */}
            <Modal
              animationType="fade"
              transparent
              visible={iconPickerVisible}
              onRequestClose={() => setIconPickerVisible(false)}
            >
              <View style={[
                styles.modalContainer,
                { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.25)' }
              ]}>
                <Animated.View style={[
                  styles.iconModalContent,
                  {
                    backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                    shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)',
                    transform: [{ scale: iconModalScale }],
                  }
                ]}>
                  <Text style={[
                    styles.iconModalTitle,
                    { color: isDark ? '#F3F4F6' : '#111111' }
                  ]}>{t('create.selectIcon')}</Text>
                  <View style={[
                    styles.iconModalDivider,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }
                  ]} />
                  <ScrollView 
                    style={styles.iconModalScroll}
                    contentContainerStyle={styles.iconModalScrollContent}
                    showsVerticalScrollIndicator={false}
                    bounces={true}
                  >
                    <View style={styles.iconList}>
                      {eventIcons.map((icon, index) => (
                        <IconItem
                          key={`${icon}-${index}`}
                          icon={icon}
                          isSelected={newIcon === icon}
                          isDark={isDark}
                          onPress={() => {
                            setNewIcon(icon);
                            setIconPickerVisible(false);
                          }}
                        />
                      ))}
                    </View>
                  </ScrollView>
                  <TouchableOpacity
                    onPress={() => setIconPickerVisible(false)}
                    style={{
                      backgroundColor: isDark ? '#2E2E2E' : '#F3F4F6',
                      height: 48,
                      borderRadius: wp('3%'),
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      marginTop: wp('2%'),
                    }}
                  >
                    <Text 
                      allowFontScaling={false}
                      style={{
                        color: isDark ? '#FFFFFF' : '#000000',
                        fontSize: 16,
                        fontWeight: '600',
                        textAlign: 'center',
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </Modal>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[
                  styles.button,
                  {
                    backgroundColor: isDark ? '#2E2E2E' : '#F3F4F6',
                  }
                ]}
              >
                <Text style={[
                  styles.buttonText,
                  { color: isDark ? '#E5E7EB' : '#111111' }
                ]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddCountdown}
                style={[
                  styles.button,
                  {
                    backgroundColor: isDark ? '#3CC4A2' : '#4E9EFF',
                    shadowColor: isDark ? '#3CC4A2' : '#4E9EFF',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4,
                  }
                ]}
              >
                <Text style={styles.buttonTextSave}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
      {/* Confetti overlay (re-mounts per key to replay) */}
      {confettiKey > 0 && (
        <ConfettiCannon
          key={confettiKey}
          count={120}
          origin={{ x: Dimensions.get('window').width / 2, y: -10 }}
          fadeOut
          fallSpeed={2500}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },

  listContainer: {
    paddingTop: wp('3%'),
    paddingBottom: wp('6%'), // 24px above nav bar
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp("6%"), // 24-32px
    paddingVertical: wp("8%"),
  },
  emptyIconContainer: {
    width: wp('20%'), // ~75px to accommodate 64-72px icon with padding
    height: wp('20%'),
    borderRadius: wp('10%'), // Circular
    alignItems: "center",
    justifyContent: "center",
    marginBottom: wp("4%"), // 16-20px spacing
  },
  emptyText: {
    fontSize: wp('4.75%'), // 18-19px
    fontWeight: '600', // Semibold
    fontFamily: 'System',
    marginBottom: wp('3%'), // 10-12px margin below text
    textAlign: "center",
    lineHeight: wp('6.25%'), // ~130% line-height
  },
  emptySubText: {
    fontSize: wp("3.5%"),
    color: "#7F8C8D",
    textAlign: "center",
    marginBottom: wp("6%"),
    fontFamily: "monospace",
    lineHeight: wp("5%"),
  },
  emptyFeatures: {
    alignItems: "center",
    marginBottom: wp("8%"),
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: wp("3%"),
    paddingHorizontal: wp("4%"),
    paddingVertical: wp("2%"),
    backgroundColor: "#F8F9FA",
    borderRadius: wp("2%"),
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  featureText: {
    fontSize: wp("3.2%"),
    color: "#495057",
    fontFamily: "monospace",
    marginLeft: wp("2%"),
    fontWeight: "600",
  },
  emptyActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: wp('11%'), // 44-48px
    paddingVertical: wp("3%"),
    paddingHorizontal: wp("6%"),
    borderRadius: wp('3.5%'), // 12-14px
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyActionText: {
    color: "#FFFFFF",
    fontSize: wp('4%'),
    fontWeight: "600", // Semibold
    fontFamily: "System",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp("6%"),
    paddingVertical: wp("8%"),
  },
  loadingText: {
    fontSize: wp("4%"),
    fontWeight: "600",
    color: "#2C3E50",
    fontFamily: "monospace",
  },
  floatingButton: {
    position: "absolute",
    bottom: wp("4%"),
    right: wp("4%"),
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: wp("3.5%"),
    paddingHorizontal: wp("5%"),
    borderRadius: wp("3.5%"), // 12-14px rounded corners
    zIndex: 999,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingButtonText: {
    color: "#FFFFFF",
    fontSize: wp("3.5%"),
    fontWeight: "600",
    fontFamily: "System",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp("5%"),
  },
  modalContent: {
    width: '100%',
    maxWidth: wp('90%'),
    maxHeight: hp('75%'),
    borderRadius: wp('4%'), // 16px
    paddingHorizontal: wp('4%'),
    paddingTop: wp('3.5%'),
    paddingBottom: wp('2.5%'),
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  modalFormScroll: {
    flexShrink: 1,
  },
  modalFormContent: {
    paddingBottom: wp('1%'),
  },
  modalTitle: {
    fontSize: wp('4.25%'), // Even smaller
    fontWeight: '600', // Semibold
    fontFamily: 'System',
    marginBottom: wp('2%'), // Even more reduced
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: wp('2.5%'), // 10px
    height: wp('8.5%'), // Even smaller
    paddingHorizontal: wp('2.5%'), // Slightly less padding
    marginBottom: wp('1.5%'), // Even more reduced
    fontSize: wp('3.5%'), // Slightly smaller
    fontWeight: '600', // Semibold
    fontFamily: 'System',
  },
  iconLabel: {
    fontSize: wp('3%'), // Smaller
    fontWeight: '500', // Medium
    fontFamily: 'System',
    marginBottom: wp('0.5%'), // Minimal margin
    marginTop: wp('0%'), // No top margin
  },
  iconButton: {
    borderWidth: 1,
    borderRadius: wp('2.5%'), // 10px
    height: wp('8.5%'), // Even smaller
    paddingHorizontal: wp('2.5%'),
    marginBottom: wp('1.5%'), // Even more reduced
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonText: {
    fontSize: wp('3.5%'), // Slightly smaller
    fontWeight: '600', // Semibold
    fontFamily: 'System',
  },
  iconModalContent: {
    width: '100%',
    maxWidth: wp('90%'),
    maxHeight: hp('75%'),
    borderRadius: wp('5%'), // 20px
    paddingHorizontal: wp('5%'), // 20px sides
    paddingTop: wp('6%'), // 24px top
    paddingBottom: wp('6%'), // 24px bottom
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  iconModalTitle: {
    fontSize: wp('4.5%'), // 18px
    fontWeight: '600', // Semibold
    fontFamily: 'System',
    textAlign: 'center',
    marginBottom: wp('4%'), // 16px bottom margin
  },
  iconModalDivider: {
    height: 1,
    marginBottom: wp('3%'), // 12-16px spacing
  },
  iconModalScroll: {
    maxHeight: hp('55%'),
  },
  iconModalScrollContent: {
    paddingBottom: wp('5%'), // 20-24px bottom spacing
  },
  iconList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: wp('2.5%'), // 12-14px gap
  },
  iconItem: {
    width: wp('13%'), // ~49px for 6 columns with proper spacing
    height: wp('13%'),
    borderRadius: wp('3%'), // 12px
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: wp('7%'), // 28-32px (adjusted for smaller cells)
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: wp('2.5%'), // 8-10px gap
    marginTop: wp('2%'), // Better spacing
    flexShrink: 0, // Prevent shrinking
  },
  button: {
    flex: 1,
    height: wp('10%'), // Better height
    borderRadius: wp('3%'), // 10-12px
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: wp('2.5%'),
    paddingHorizontal: wp('2%'),
  },
  buttonText: {
    fontWeight: "600", // Semibold
    fontSize: wp('4%'), // 15-16px
    fontFamily: "System",
  },
  buttonTextSave: {
    color: "#FFFFFF",
    fontWeight: "600", // Semibold
    fontSize: wp('4%'), // 15-16px
    fontFamily: "System",
  },
  calendarModalContent: {
    width: '100%',
    maxWidth: wp('90%'),
    borderRadius: wp('4%'), // 16px
    paddingHorizontal: wp('4%'),
    paddingTop: wp('3.5%'),
    paddingBottom: wp('2.5%'),
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  calendar: {
    marginBottom: wp('4%'),
  },
  timePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  timePickerContent: {
    width: wp("90%"),
    backgroundColor: "#FFFFFF",
    borderRadius: wp("2%"),
    padding: wp("4%"),
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  timePickerButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export default HomeScreen;
