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
  Animated,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import CountdownItem from "../components/CountdownItem";
import { Calendar } from "react-native-calendars";
import { Picker } from '@react-native-picker/picker';
import moment from "moment";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import * as Notifications from 'expo-notifications';
import { Analytics } from '../util/analytics';
import OptimizedBannerAd from '../components/Ads';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const generateGUID = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const HomeScreen = () => {
  const [countdowns, setCountdowns] = useState([]);
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
  const { theme } = useTheme();

  const eventIcons = [
    "🎂", // Birthday
    "🗓️", // Appointment
    "🏖️", // Vacation
    "✈️", // Flight
    "🏫", // School
    "🏢", // Work
    "💍", // Wedding
    "👶", // Baby
    "🏠", // Move
    "🏥", // Doctor
    "🏆", // Competition
    "🎓", // Graduation
    "🎉", // Party
    "🏃‍♂️", // Race
    "🏟️", // Concert
    "🏀", // Basketball
    "⚽️", // Soccer
    "🏈", // Football
    "🏐", // Volleyball
    "🏸", // Badminton
    "🏊‍♂️", // Swim
    "🚴‍♂️", // Bike
    "🏃‍♀️", // Run
    "🧘‍♂️", // Yoga
    "🏕️", // Camping
    "🏰", // Trip
    "🏡", // Home
    "🏠", // Housewarming
    "🏢", // Office
    "🏫", // Exam
    "🏆", // Award
    "🎬", // Movie
    "🎤", // Show
    "🎵", // Festival
    "🎮", // Game
    "🏅", // Achievement
    "🏋️‍♂️", // Workout
    "🧳", // Travel
    "🕒", // Meeting
    "💼", // Interview
    "🚗", // Car
    "🛒", // Shopping
    "💡", // Idea
    "📅", // Event
    "🏥", // Checkup
    "🏜️", // Adventure
    "🏙️", // City
    "🧑‍🤝‍🧑", // Friends
    "👨‍👩‍👧‍👦", // Family
    "🧑‍🎓", // Study
    "🧑‍💻", // Project
    "🧑‍🍳", // Cook
    "🧑‍🔬", // Science
    "🧑‍🎤", // Music
    "🧑‍🚀", // Space
    "🧑‍✈️", // Flight
  ];

  // ----- Load / Save Data -----
  const loadCountdowns = async () => {
    try {
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
    setModalVisible(true);
    setSelectedHour(9);
    setSelectedMinute(0);
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
    let notificationId = null;
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Countdown Reminder',
            body: `"${newName}" is happening now!`,
            sound: true,
          },
          trigger: { date: combinedDateTime },
        });
      }
    } catch (e) {
      console.warn('Could not schedule notification:', e);
    }
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
    Analytics.trackEvent && Analytics.trackEvent('add_countdown', {
      name: newName,
      date: combinedDateTime.toISOString(),
      icon: newIcon,
    });
  };

  const editCountdown = async (updatedEvent) => {
    try {
      // Cancel old notification if it exists
      const existingEvent = countdowns.find(item => item.id === updatedEvent.id);
      if (existingEvent && existingEvent.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(existingEvent.notificationId).catch(() => {});
      }

      // Schedule new notification
      let notificationId = null;
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Countdown Reminder',
            body: `"${updatedEvent.name}" is happening now!`,
            sound: true,
          },
          trigger: { date: new Date(updatedEvent.date) },
        });
      }

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

      Analytics.trackEvent && Analytics.trackEvent('edit_countdown', {
        id: updatedEvent.id,
        name: updatedEvent.name,
        date: updatedEvent.date,
        icon: updatedEvent.icon,
      });
    } catch (e) {
      console.warn('Could not update notification:', e);
    }
  };

  const deleteCountdown = (id) => {
    setCountdowns((prev) => {
      const countdownToDelete = prev.find((item) => item.id === id);
      if (countdownToDelete && countdownToDelete.notificationId) {
        Notifications.cancelScheduledNotificationAsync(countdownToDelete.notificationId).catch(() => {});
      }
      
      // Track deletion with item details before removing from state
      if (countdownToDelete) {
        Analytics.trackEvent && Analytics.trackEvent('delete_countdown', {
          id,
          name: countdownToDelete.name,
          date: countdownToDelete.date,
          icon: countdownToDelete.icon,
        });
      }
      
      return prev.filter((item) => item.id !== id);
    });
  };

  // Initialize analytics on mount
  useEffect(() => {
    Analytics.initialize();
    Analytics.trackScreenView('Home');
  }, []);

  const renderItem = ({ item, index }) => {
    const showAd = (index + 1) % 5 === 0;
    return (
      <>
        <CountdownItem event={item} index={index} onDelete={deleteCountdown} onEdit={editCountdown} />
        {showAd && <OptimizedBannerAd />}
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>

      {upcomingEvents.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="calendar-outline" size={80} color={theme.colors.textLight} />
          </View>
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>Ready to start counting?</Text>
          <Text style={[styles.emptySubText, { color: theme.colors.textSecondary }]}>
            Create your first event and never miss important moments again!
          </Text>
          <View style={styles.emptyFeatures}>
            <View style={styles.featureItem}>
              <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.featureText, { color: theme.colors.text }]}>Smart reminders</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="trending-up-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.featureText, { color: theme.colors.text }]}>Progress tracking</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.featureText, { color: theme.colors.text }]}>Live countdowns</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.emptyActionButton, { backgroundColor: theme.colors.button }]}
            onPress={handleOpenModal}
          >
            <Ionicons name="add" size={20} color={theme.colors.buttonText} />
            <Text style={[styles.emptyActionText, { color: theme.colors.buttonText }]}>Create Your First Event</Text>
          </TouchableOpacity>
          <OptimizedBannerAd />
        </View>
      ) : (
        <FlatList
          data={upcomingEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContainer, { backgroundColor: theme.colors.background }]}
        />
      )}
      {/* Floating Button to Add New Event */}
      <TouchableOpacity
        onPress={handleOpenModal}
        style={[styles.floatingButton, { backgroundColor: theme.colors.button }]}
      >
        <Ionicons name="add" size={20} color={theme.colors.buttonText} style={{ marginRight: 8 }} />
        <Text style={[styles.floatingButtonText, { color: theme.colors.buttonText }]}>Add New Event</Text>
      </TouchableOpacity>

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
            <Text style={[styles.iconLabel, { color: theme.colors.text }]}>Date & Time</Text>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={handleOpenCalendar}
            >
              <Text style={[styles.iconButtonText, { color: theme.colors.text }]}>
                {moment(selectedDate).format("ddd, D MMM YYYY")} at {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}
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
                    style={styles.calendar}
                    onDayPress={handleDayPress}
                    minDate={moment().format("YYYY-MM-DD")}
                    theme={{
                      backgroundColor: "#FFFFFF",
                      calendarBackground: "#F8F9FA",
                      textSectionTitleColor: "#3498DB",
                      dayTextColor: "#2C3E50",
                      todayTextColor: "#3498DB",
                      monthTextColor: "#3498DB",
                      arrowColor: "#3498DB",
                      selectedDayBackgroundColor: "#3498DB",
                      selectedDayTextColor: "#FFFFFF",
                      textDisabledColor: "#BDC3C7",
                      dotColor: "#3498DB",
                      selectedDotColor: "#FFFFFF",
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
                      style={{ width: 100 }}
                      onValueChange={(itemValue) => setSelectedHour(itemValue)}
                    >
                      {[...Array(24).keys()].map((h) => (
                        <Picker.Item key={h} label={h.toString().padStart(2, '0')} value={h} />
                      ))}
                    </Picker>
                    <Text style={{ fontSize: 24, marginHorizontal: 8 }}>:</Text>
                    <Picker
                      selectedValue={selectedMinute}
                      style={{ width: 100 }}
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
                  <TouchableOpacity
                    onPress={() => setIconPickerVisible(false)}
                    style={[styles.button, { backgroundColor: theme.colors.border }]}
                  >
                    <Text style={[styles.buttonText, { color: theme.colors.text }]}>Cancel</Text>
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
