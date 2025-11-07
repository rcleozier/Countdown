import React, { useState, useCallback, useEffect } from "react";
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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import CountdownItem from "../components/CountdownItem";
import { Calendar } from "react-native-calendars";
import { Picker } from '@react-native-picker/picker';
import moment from "moment";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Analytics } from '../util/analytics';
import { Ionicons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { ReviewManager } from '../util/reviewManager';
import { ENABLE_ADS, USE_TEST_ADS } from '../util/config';
import { AD_UNIT_IDS } from '../util/adConfig';
import eventIcons from '../util/eventIcons';

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
  const { theme } = useTheme();

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

  // Sort & filter upcoming
  const sortedCountdowns = [...countdowns].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  const upcomingEvents = sortedCountdowns.filter(
    (event) => new Date(event.date) > new Date()
  );

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
      Alert.alert("Invalid Date/Time", "Please select a date and time in the future.");
      return;
    }
    const notificationId = await scheduleNotificationIfFuture(newName, combinedDateTime);
    const newCountdown = {
      id: generateGUID(),
      name: newName,
      date: combinedDateTime.toISOString(),
      icon: newIcon,
      notificationId,
      createdAt: new Date().toISOString(),
    };
    setCountdowns((prev) => [...prev, newCountdown]);
    setNewName("");
    setNewIcon("💻");
    setSelectedDate(new Date());
    setSelectedHour(9);
    setSelectedMinute(0);
    setModalVisible(false);
    
    // Haptic feedback for successful creation
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Fire confetti by remounting the cannon
    setConfettiKey((k) => k + 1);
    
    Analytics.trackEvent && Analytics.trackEvent('add_countdown', {
      name: newName,
      date: combinedDateTime.toISOString(),
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
      
      Analytics.trackEvent && Analytics.trackEvent('edit_countdown', {
        id: updatedEvent.id,
        name: updatedEvent.name,
        date: updatedEvent.date,
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
        
        Analytics.trackEvent && Analytics.trackEvent('delete_countdown', {
          id,
          name: countdownToDelete.name,
          date: countdownToDelete.date,
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
      interstitialTimeout = setTimeout(() => {
        // 30% chance to show an interstitial
        const shouldShow = Math.random() < 0.3;
        if (!shouldShow) return;
        try {
          // Dynamically require to avoid native module when not available
          // eslint-disable-next-line global-require
          const { InterstitialAd, AdEventType, TestIds } = require('react-native-google-mobile-ads');
          const unitId = USE_TEST_ADS ? TestIds.INTERSTITIAL : AD_UNIT_IDS.interstitial;
          const interstitial = InterstitialAd.createForAdRequest(unitId);
          const onLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
            interstitial.show().catch(() => {});
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
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading...</Text>
        </View>
      ) : upcomingEvents.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="calendar-outline" size={60} color={theme.colors.primary} />
      </View>
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>Ready to start counting?</Text>
          <TouchableOpacity 
            style={[styles.emptyActionButton, { backgroundColor: theme.colors.button }]}
            onPress={handleOpenModal}
          >
            <Ionicons name="add" size={20} color={theme.colors.buttonText} />
            <Text style={[styles.emptyActionText, { color: theme.colors.buttonText }]}>Create Your First Event</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
        <FlatList
          data={upcomingEvents}
          keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={[styles.listContainer, { backgroundColor: theme.colors.background }]}
          />
          {/* Floating Button to Add New Event */}
          <TouchableOpacity
            onPress={handleOpenModal}
            style={[styles.floatingButton, { backgroundColor: theme.colors.button }]}
          >
            <Ionicons name="add" size={20} color={theme.colors.buttonText} style={{ marginRight: 8 }} />
            <Text style={[styles.floatingButtonText, { color: theme.colors.buttonText }]}>Add New Event</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Modal for creating a new countdown */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.modalBackground, borderColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Create New Countdown</Text>
            <TextInput
              placeholder="Countdown Name"
              placeholderTextColor={theme.colors.textLight}
              value={newName}
              onChangeText={setNewName}
              style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
            />

            {/* Date Label + Button */}
            <Text style={[styles.iconLabel, { color: theme.colors.text }]}>Date</Text>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={handleOpenCalendar}
            >
              <Text style={[styles.iconButtonText, { color: theme.colors.text }]}>
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
              <View style={[styles.calendarModalOverlay, { backgroundColor: theme.colors.modalOverlay }]}>
                <View style={[styles.calendarModalContent, { backgroundColor: theme.colors.modalBackground, borderColor: theme.colors.border }]}>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select a Date</Text>
                  <Calendar
                    key={theme.name}
                    style={styles.calendar}
                    onDayPress={handleDayPress}
                    minDate={moment().format("YYYY-MM-DD")}
                    theme={{
                      backgroundColor: theme.colors.background,
                      calendarBackground: theme.colors.card,
                      textSectionTitleColor: theme.colors.textSecondary,
                      dayTextColor: theme.colors.text,
                      todayTextColor: theme.colors.primary,
                      monthTextColor: theme.colors.text,
                      arrowColor: theme.colors.primary,
                      selectedDayBackgroundColor: theme.colors.primary,
                      selectedDayTextColor: theme.colors.buttonText,
                      textDisabledColor: theme.colors.border,
                      dotColor: theme.colors.primary,
                      selectedDotColor: theme.colors.buttonText,
                      "stylesheet.calendar.header": {
                        week: {
                          marginTop: 6,
                          flexDirection: "row",
                          justifyContent: "space-between",
                        },
                      },
                    }}
                  />
                  <View style={styles.calendarButtonContainer}>
                    <TouchableOpacity
                      style={[styles.button, { backgroundColor: theme.colors.border }]}
                      onPress={() => setCalendarModalVisible(false)}
                    >
                      <Text style={[styles.buttonText, { color: theme.colors.text }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, { backgroundColor: theme.colors.primary }]}
                      onPress={handleConfirmDate}
                    >
                      <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            {/* Time Label + Button */}
            <Text style={[styles.iconLabel, { color: theme.colors.text }]}>Time</Text>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={handleOpenTimePicker}
            >
              <Text style={[styles.iconButtonText, { color: theme.colors.text }]}>
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
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Time</Text>
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
            <Text style={[styles.iconLabel, { color: theme.colors.text }]}>Icon</Text>
            <TouchableOpacity
              onPress={() => setIconPickerVisible(true)}
              style={[styles.iconButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <Text style={[styles.iconButtonText, { color: theme.colors.text }]}>
                {newIcon ? `Icon: ${newIcon}` : "Select Icon"}
              </Text>
            </TouchableOpacity>

            {/* Icon Picker Modal */}
            <Modal
              animationType="fade"
              transparent
              visible={iconPickerVisible}
              onRequestClose={() => setIconPickerVisible(false)}
            >
              <View style={[styles.iconModalContainer, { backgroundColor: theme.colors.modalOverlay }]}>
                <View style={[styles.iconModalContent, { backgroundColor: theme.colors.modalBackground, borderColor: theme.colors.border }]}>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Icon</Text>
                  <ScrollView style={{ maxHeight: wp('100%') }}>
                  <View style={styles.iconList}>
                    {eventIcons.map((icon, index) => (
                      <TouchableOpacity
                        key={`${icon}-${index}`}
                        onPress={() => {
                          setNewIcon(icon);
                          setIconPickerVisible(false);
                        }}
                        style={styles.iconItem}
                      >
                        <Text style={styles.iconText}>{icon}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  </ScrollView>
                  <TouchableOpacity
                    onPress={() => setIconPickerVisible(false)}
                    style={{
                      backgroundColor: "#444",
                      marginTop: wp('2%'),
                      paddingVertical: wp('4%'),
                      paddingHorizontal: wp('8%'),
                      borderRadius: wp('2%'),
                      alignItems: 'center',
                      alignSelf: 'center',
                    }}
                  >
                    <Text style={{
                      color: "#FFFFFF",
                      fontSize: 18,
                      fontWeight: "700",
                      letterSpacing: 0.5,
                    }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.button, { backgroundColor: theme.colors.border }]}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddCountdown}
                style={[styles.button, { backgroundColor: theme.colors.primary }]}
              >
                <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>Save Countdown</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    paddingHorizontal: wp("4%"),
    paddingBottom: wp("20%"),
    paddingTop: wp("8%"),
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp("6%"),
    paddingVertical: wp("8%"),
  },
  emptyIconContainer: {
    marginBottom: wp("6%"),
    opacity: 0.7,
  },
  emptyText: {
    fontSize: wp("5.5%"),
    fontWeight: "800",
    color: "#2C3E50",
    marginBottom: wp("3%"),
    fontFamily: "monospace",
    textAlign: "center",
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
    backgroundColor: "#3498DB",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: wp("4%"),
    paddingHorizontal: wp("8%"),
    borderRadius: wp("3%"),
    marginBottom: wp("6%"),
    shadowColor: "#3498DB",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  emptyActionText: {
    color: "#FFFFFF",
    fontSize: wp("3.8%"),
    fontWeight: "bold",
    fontFamily: "monospace",
    marginLeft: wp("2%"),
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
    backgroundColor: "#3498DB",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: wp("3%"),
    paddingHorizontal: wp("4%"),
    borderRadius: wp("2%"),
    zIndex: 999,
  },
  floatingButtonText: {
    color: "#FFFFFF",
    fontSize: wp("3%"),
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: wp("4%"),
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: wp("2%"),
    padding: wp("4%"),
    elevation: 5,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: wp("4%"),
    fontWeight: "bold",
    marginBottom: wp("2.5%"),
    textAlign: "center",
    color: "#2C3E50",
    fontFamily: "monospace",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    padding: wp("2%"),
    marginBottom: wp("2.5%"),
    borderRadius: wp("1%"),
    color: "#2C3E50",
    fontFamily: "monospace",
    fontSize: wp("3%"),
    backgroundColor: "#FFFFFF",
  },
  iconLabel: {
    fontSize: wp("2.5%"),
    color: "#2C3E50",
    fontFamily: "monospace",
    marginBottom: wp("1%"),
  },
  iconButton: {
    borderWidth: 1,
    borderColor: "#3498DB",
    paddingVertical: wp("2%"),
    paddingHorizontal: wp("3%"),
    borderRadius: wp("1%"),
    backgroundColor: "#FFFFFF",
    marginBottom: wp("2.5%"),
    alignItems: "center",
  },
  iconButtonText: {
    fontSize: wp("3%"),
    color: "#2C3E50",
    fontFamily: "monospace",
  },
  iconModalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  iconModalContent: {
    margin: wp("4%"),
    backgroundColor: "#FFFFFF",
    borderRadius: wp("2%"),
    padding: wp("4%"),
    elevation: 5,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  iconList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: wp("2.5%"),
  },
  iconItem: {
    margin: wp("1%"),
    padding: wp("2%"),
    borderRadius: wp("1%"),
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  iconText: {
    fontSize: wp("3%"),
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    padding: wp("2%"),
    borderRadius: wp("1%"),
    alignItems: "center",
    marginHorizontal: wp("1%"),
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: wp("3%"),
    fontFamily: "monospace",
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  calendarModalContent: {
    width: wp("90%"),
    backgroundColor: "#FFFFFF",
    borderRadius: wp("2%"),
    padding: wp("4%"),
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  calendar: {
    borderRadius: wp("2%"),
    marginBottom: wp("4%"),
  },
  calendarButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
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
