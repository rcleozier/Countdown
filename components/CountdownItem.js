import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import moment from "moment";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { Calendar } from "react-native-calendars";
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

const CountdownItem = ({ event, index, onDelete, onEdit }) => {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(event.date));
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const { theme } = useTheme();
  
  // Edit form states
  const [editName, setEditName] = useState(event.name);
  const [editIcon, setEditIcon] = useState(event.icon);
  const [tempSelectedDate, setTempSelectedDate] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date(event.date));
  const [selectedHour, setSelectedHour] = useState(moment(event.date).hour());
  const [selectedMinute, setSelectedMinute] = useState(moment(event.date).minute());

  // Calculate time left down to seconds, or return null if expired
  function getTimeLeft(date) {
    const now = moment();
    const target = moment(date);
    const duration = moment.duration(target.diff(now));

    // If the event date is already past, return null to indicate "Expired"
    if (duration.asSeconds() <= 0) {
      return null;
    }
    return {
      days: Math.floor(duration.asDays()),
      hours: duration.hours(),
      minutes: duration.minutes(),
      seconds: duration.seconds(),
    };
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(event.date));
    }, 1000);
    return () => clearInterval(interval);
  }, [event.date]);

  // Progress calculation
  const getProgress = () => {
    const now = moment();
    const end = moment(event.date);
    const todayStart = moment().startOf('day');
    if (now.isAfter(end)) return 1;
    if (now.isBefore(todayStart)) return 0;
    const total = end.diff(todayStart);
    const elapsed = now.diff(todayStart);
    return Math.min(Math.max(elapsed / total, 0), 1);
  };
  const progress = getProgress();
  const isPastEvent = moment(event.date).isBefore(moment());

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

  const handleOpenEditModal = () => {
    // Light haptic feedback for opening edit modal
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setEditName(event.name);
    setEditIcon(event.icon);
    setSelectedDate(new Date(event.date));
    setSelectedHour(moment(event.date).hour());
    setSelectedMinute(moment(event.date).minute());
    setEditModalVisible(true);
  };

  const handleDayPress = (day) => {
    setTempSelectedDate(day.dateString);
  };

  const handleConfirmDate = () => {
    if (!tempSelectedDate) {
      alert("Please pick a date on the calendar.");
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

  const handleSaveEdit = () => {
    if (!editName.trim()) return;
    
    const combinedDateTime = new Date(selectedDate);
    combinedDateTime.setHours(selectedHour);
    combinedDateTime.setMinutes(selectedMinute);
    combinedDateTime.setSeconds(0);
    combinedDateTime.setMilliseconds(0);
    
    if (combinedDateTime <= new Date()) {
      alert("Please select a date and time in the future.");
      return;
    }
    
    const updatedEvent = {
      ...event,
      name: editName,
      icon: editIcon,
      date: combinedDateTime.toISOString(),
    };
    
    onEdit(updatedEvent);
    setEditModalVisible(false);
  };

  return (
    <>
      {/* Main Item Row */}
      <View style={[
        styles.gradientBorder, 
        { 
          backgroundColor: theme.colors.card, 
          borderColor: theme.colors.border,
          borderWidth: 1,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: theme.name === 'dark' ? 0.3 : 0.1,
          shadowRadius: 8,
          elevation: 4
        }
        ]}>
        <View style={[
          styles.container, 
          { 
            backgroundColor: theme.colors.card,
            borderRadius: wp('3%')
          }
        ]}>
          
          <View style={styles.leftSection}>
            <View style={[
              styles.iconContainer,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderWidth: 1,
                borderRadius: wp('3%'),
                shadowColor: theme.colors.shadow,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
                elevation: 2
              }
            ]}>
              <Text style={[styles.icon, { fontSize: wp('6%') }]}>{event.icon}</Text>
            </View>
            <View style={styles.textContainer}>
              <Text style={[
                styles.title, 
                { 
                  color: theme.colors.text,
                  fontWeight: '700',
                  fontSize: wp('4.5%'),
                  textShadowColor: theme.name === 'dark' ? theme.colors.shadow : 'transparent',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2
                }
              ]}>{event.name}</Text>
              {timeLeft === null ? (
                <Text style={[
                  styles.expiredText, 
                  { 
                    color: theme.colors.error,
                    fontWeight: '600',
                    fontSize: wp('3.5%')
                  }
                ]}>Expired</Text>
              ) : (
                <Text style={[
                  styles.countdownText, 
                  { 
                    color: theme.colors.primary,
                    fontWeight: '600',
                    fontSize: wp('4%')
                  }
                ]}>
                  {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
                </Text>
              )}
              <Text style={[
                styles.date, 
                { 
                  color: theme.colors.textSecondary,
                  fontWeight: '500',
                  fontSize: wp('3%'),
                  opacity: 0.8
                }
              ]}>
                {(() => {
                  const m = moment(event.date);
                  if (m.hours() === 0 && m.minutes() === 0 && m.seconds() === 0) {
                    return m.format("ddd, D MMM YYYY") + " (All Day)";
                  } else {
                    return m.format("ddd, D MMM YYYY [at] hh:mm A");
                  }
                })()}
              </Text>
            </View>
          </View>
          {/* Top-right actions within layout (no absolute positioning) */}
          <View style={styles.actionsTopRight}>
            {!isPastEvent && (
              <TouchableOpacity
                style={styles.actionButtonSmall}
                onPress={handleOpenEditModal}
              >
                <Ionicons name="pencil" size={wp('2.4%')} color="#6C757D" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionButtonSmall}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setDeleteModalVisible(true);
              }}
            >
              <Ionicons name="trash" size={wp('2.4%')} color="#DC3545" />
            </TouchableOpacity>
          </View>
        </View>
        {/* Progress Bar */}
        <View style={[
          styles.progressBarBackground, 
          { 
            backgroundColor: theme.colors.progressBackground,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 8
          }
        ]}>
          <View style={[
            styles.progressBarFill, 
            { 
              width: `${Math.round(progress * 100)}%`, 
              backgroundColor: theme.colors.progressFill,
              borderRadius: wp('1.75%'),
              shadowColor: theme.colors.progressFill,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.3,
              shadowRadius: 2,
              elevation: 2
            }
          ]} />
        </View>
        <Text style={[
          styles.progressText, 
          { 
            color: theme.colors.textSecondary,
            fontWeight: '500',
            fontSize: wp('2.5%')
          }
        ]}>
          {progress === 0
            ? 'Just started!'
            : `${Math.round(progress * 100)}% of the way there`}
        </Text>
      </View>

      {/* Confirmation Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Countdown</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete "{event.name}"?
            </Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#444" }]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#66FCF1" }]}
                onPress={() => {
                  onDelete(event.id);
                  setDeleteModalVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal
        transparent
        animationType="slide"
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <Text style={styles.modalTitle}>Edit Countdown</Text>
            
            <TextInput
              placeholder="Countdown Name"
              placeholderTextColor="#888"
              value={editName}
              onChangeText={setEditName}
              style={styles.input}
            />

            {/* Date */}
            <Text style={styles.iconLabel}>Date</Text>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                setTempSelectedDate(moment(selectedDate).format("YYYY-MM-DD"));
                setCalendarModalVisible(true);
              }}
            >
              <Text style={styles.iconButtonText}>
                {moment(selectedDate).format("ddd, D MMM YYYY")}
              </Text>
            </TouchableOpacity>

            {/* Time */}
            <Text style={styles.iconLabel}>Time</Text>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setTimePickerVisible(true)}
            >
              <Text style={styles.iconButtonText}>
                {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}
              </Text>
            </TouchableOpacity>

            {/* Icon */}
            <Text style={styles.iconLabel}>Icon</Text>
            <TouchableOpacity
              style={[styles.iconButton, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
              onPress={() => setIconPickerVisible(true)}
            >
              <Text style={{ fontSize: wp('5%'), marginRight: wp('2%') }}>{editIcon}</Text>
              <Text style={styles.iconButtonText}>Tap to change</Text>
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#444" }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#66FCF1" }]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calendar Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={calendarModalVisible}
        onRequestClose={() => setCalendarModalVisible(false)}
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            <Text style={styles.modalTitle}>Select a Date</Text>
            <Calendar
              key={theme.name}
              style={styles.calendar}
              onDayPress={handleDayPress}
              minDate={moment().format("YYYY-MM-DD")}
              markedDates={{
                [moment(selectedDate).format("YYYY-MM-DD")]: {
                  selected: true,
                  selectedColor: theme.colors.primary,
                },
                ...(tempSelectedDate && {
                  [tempSelectedDate]: {
                    selected: true,
                    selectedColor: theme.colors.success,
                  },
                }),
              }}
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
              }}
            />
            <View style={styles.calendarButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#444" }]}
                onPress={() => setCalendarModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#66FCF1" }]}
                onPress={handleConfirmDate}
              >
                <Text style={styles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={timePickerVisible}
        onRequestClose={() => setTimePickerVisible(false)}
      >
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerContent}>
            <Text style={styles.modalTitle}>Select Time</Text>
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
                style={[styles.modalButton, { backgroundColor: "#444" }]}
                onPress={() => setTimePickerVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#66FCF1" }]}
                onPress={() => setTimePickerVisible(false)}
              >
                <Text style={styles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Icon Picker Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={iconPickerVisible}
        onRequestClose={() => setIconPickerVisible(false)}
      >
        <View style={styles.iconModalContainer}>
          <View style={styles.iconModalContent}>
            <Text style={styles.modalTitle}>Select Icon</Text>
            <ScrollView style={{ maxHeight: wp('100%') }}>
              <View style={styles.iconList}>
                {eventIcons.map((icon, index) => (
                  <TouchableOpacity
                    key={`${icon}-${index}`}
                    onPress={() => {
                      setEditIcon(icon);
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
              style={[styles.modalButton, { backgroundColor: "#444", alignSelf: 'center', paddingHorizontal: wp('8%'), marginTop: wp('2%') }]}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  gradientBorder: {
    marginBottom: wp("3%"),
    borderRadius: wp("3%"),
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: wp("2%"),
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    backgroundColor: "#F4F8FB",
    marginHorizontal: wp("2%"), // Prevent card from touching screen edges
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: wp("3%"),
    paddingHorizontal: wp("3%"),
    backgroundColor: "#FFFFFF",
    borderRadius: wp("2.5%"),
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: wp('2%'),
  },
  icon: {
    fontSize: wp("8%"),
  },
  iconContainer: {
    width: wp('10%'),
    height: wp('10%'),
    alignItems: "center",
    justifyContent: "center",
    marginRight: wp("2.5%"),
  },
  textContainer: {
    justifyContent: "center",
  },
  title: {
    fontSize: wp("4%"),
    fontWeight: "700",
    color: "#2471A3",
    fontFamily: "monospace",
    marginBottom: wp("0.5%"),
  },
  date: {
    fontSize: wp("2.7%"),
    color: "#7F8C8D",
    fontFamily: "monospace",
  },
  divider: {
    width: 1,
    height: "80%",
    backgroundColor: "#E0E0E0",
    marginHorizontal: wp("3%"),
    alignSelf: "center",
  },
  rightSection: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: wp("8%"),
    maxWidth: wp("10%"),
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp('1.5%'),
    justifyContent: "flex-end",
  },
  topRightButtons: {
    display: 'none',
  },
  smallIconButton: {
    padding: wp('1%'),
    borderRadius: wp('1%'),
    alignItems: "center",
    justifyContent: "center",
    width: wp('6%'),
    height: wp('6%'),
    minWidth: wp('6%'),
    minHeight: wp('6%'),
  },
  countdownText: {
    fontSize: wp("3.5%"),
    color: "#273746",
    fontWeight: "bold",
    marginBottom: wp("1%"),
    fontFamily: "monospace",
    letterSpacing: 1,
    textAlign: "left",
  },
  expiredText: {
    fontSize: wp("4%"),
    color: "#E74C3C",
    fontWeight: "bold",
    marginBottom: wp("2%"),
    fontFamily: "monospace",
  },
  iconButton: {
    padding: wp('0.3%'),
    borderRadius: wp('0.8%'),
    alignItems: "center",
    justifyContent: "center",
    width: wp('3%'),
    height: wp('3%'),
    minWidth: wp('3%'),
    minHeight: wp('3%'),
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
    marginTop: wp('2%'),
  },
  actionsTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('1%'),
    marginLeft: wp('2%'),
  },
  actionButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: wp('2%'),
    paddingVertical: wp('1.5%'),
    paddingHorizontal: wp('2.5%'),
  },
  actionButtonSmall: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: wp('1.5%'),
    paddingVertical: wp('1.2%'),
    paddingHorizontal: wp('2%'),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#FFFFFF",
    borderRadius: wp("2.5%"),
    padding: wp("4%"),
    alignItems: "center",
    elevation: 5,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: wp("4.5%"),
    fontWeight: "bold",
    marginBottom: wp("2.5%"),
    color: "#2C3E50",
    fontFamily: "monospace",
    textAlign: "center",
  },
  modalMessage: {
    fontSize: wp("3.75%"),
    marginBottom: wp("3.75%"),
    color: "#7F8C8D",
    textAlign: "center",
    fontFamily: "monospace",
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    marginHorizontal: wp("1.25%"),
    padding: wp("2.5%"),
    borderRadius: wp("1.5%"),
    alignItems: "center",
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: wp("3.75%"),
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: wp('1%'),
    marginHorizontal: wp('4%'),
    marginTop: 6,
    marginBottom: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    backgroundColor: '#3498DB',
    borderRadius: wp('1%'),
  },
  progressText: {
    fontSize: wp('2.7%'),
    color: '#7F8C8D',
    fontFamily: 'monospace',
    marginLeft: wp('4%'),
    marginBottom: 6,
  },
  editModalContent: {
    width: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: wp("2.5%"),
    padding: wp("4%"),
    alignItems: "center",
    elevation: 5,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    maxHeight: '80%',
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
    width: '100%',
  },
  iconLabel: {
    fontSize: wp("2.5%"),
    color: "#2C3E50",
    fontFamily: "monospace",
    marginBottom: wp("1%"),
    alignSelf: 'flex-start',
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
    width: '100%',
  },
  iconButtonText: {
    fontSize: wp("3%"),
    color: "#2C3E50",
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
    maxHeight: '80%',
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
});

export default CountdownItem;
