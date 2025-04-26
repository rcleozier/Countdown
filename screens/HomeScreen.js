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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import CountdownItem from "../components/CountdownItem";
import { Calendar } from "react-native-calendars";
import moment from "moment";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";

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
  const [tempSelectedDate, setTempSelectedDate] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("💻");

  const eventIcons = [
    "📅", "⏰", "⭐️", "✅", "🎉", "❤️", "📚", "💼", "📝", "🎂", "🏠", "🏆", "🎓", "🛒", "🚗", "✈️", "🎶", "🏥", "🍽", "👨‍👩‍👧‍👦",
    "🏖", "🏢", "🏫", "🏀", "⚽️", "🏈", "🏐", "🏸", "🏊‍♂️", "🚴‍♂️", "🏃‍♂️", "🧘‍♂️", "🧑‍💻", "🧑‍🎓", "🧑‍🍳", "🧑‍🎤", "🧑‍🔬",
    "🧑‍🎨", "🧑‍🚀", "🧑‍✈️", "🧑‍🌾", "🧑‍🔧", "🧑‍🏫", "🧑‍⚕️", "🧑‍🚒", "💡", "🔔", "📆", "📈", "📊", "🎯", "🎙️", "🎤", "🎬"
  ];

  // ----- Load / Save Data -----
  const loadCountdowns = async () => {
    try {
      const storedCountdowns = await AsyncStorage.getItem("countdowns");
      if (storedCountdowns) {
        setCountdowns(JSON.parse(storedCountdowns));
      } else {
        setCountdowns([]);
      }
    } catch (error) {
      console.error("Error loading countdowns", error);
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
  const sortedCountdowns = [...countdowns].sort((a, b) => new Date(a.date) - new Date(b.date));
  const upcomingEvents = sortedCountdowns.filter(event => new Date(event.date) > new Date());

  const handleOpenCalendar = () => {
    setTempSelectedDate(null);
    setCalendarModalVisible(true);
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
    const finalDate = new Date(year, parseInt(month, 10) - 1, parseInt(day, 10));
    setSelectedDate(finalDate);
    setCalendarModalVisible(false);
  };

  const handleAddCountdown = () => {
    if (!newName) return;
    if (selectedDate <= new Date()) {
      Alert.alert("Invalid Date", "Please select a date in the future.");
      return;
    }
    const newCountdown = {
      id: generateGUID(),
      name: newName,
      date: selectedDate.toISOString(),
      icon: newIcon,
    };
    setCountdowns(prev => [...prev, newCountdown]);
    setNewName("");
    setNewIcon("💻");
    setSelectedDate(new Date());
    setModalVisible(false);
  };

  const deleteCountdown = (id) => {
    setCountdowns(prev => prev.filter(item => item.id !== id));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Upcoming Events</Text>
        <Text style={styles.headerSubtitle}>Track your important moments</Text>
      </View>
      {upcomingEvents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No countdowns yet!</Text>
          <Text style={styles.emptySubText}>Create your first upcoming event to get started.</Text>
        </View>
      ) : (
        <FlatList
          data={upcomingEvents}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <CountdownItem event={item} index={index} onDelete={deleteCountdown} />
          )}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Floating Button to Add New Countdown */}
      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.floatingButton}>
        <Text style={styles.floatingButtonText}>+ Add New Countdown</Text>
      </TouchableOpacity>

      {/* Modal for creating a new countdown */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Countdown</Text>
            <TextInput
              placeholder="Countdown Name"
              placeholderTextColor="#888"
              value={newName}
              onChangeText={setNewName}
              style={styles.input}
            />

            {/* Date Label + Button */}
            <Text style={styles.iconLabel}>Date</Text>
            <TouchableOpacity style={styles.iconButton} onPress={handleOpenCalendar}>
              <Text style={styles.iconButtonText}>
                {moment(selectedDate).format("ddd, D MMM YYYY")}
              </Text>
            </TouchableOpacity>

            {/* Calendar Modal */}
            <Modal animationType="fade" transparent visible={calendarModalVisible} onRequestClose={() => setCalendarModalVisible(false)}>
              <View style={styles.calendarModalOverlay}>
                <View style={styles.calendarModalContent}>
                  <Text style={styles.modalTitle}>Select a Date</Text>
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
                      'stylesheet.calendar.header': {
                        week: {
                          marginTop: 6,
                          flexDirection: 'row',
                          justifyContent: 'space-between'
                        }
                      },
                    }}
                  />
                  <View style={styles.calendarButtonContainer}>
                    <TouchableOpacity
                      style={[styles.button, { backgroundColor: "#444" }]}
                      onPress={() => setCalendarModalVisible(false)}
                    >
                      <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, { backgroundColor: "#66FCF1" }]}
                      onPress={handleConfirmDate}
                    >
                      <Text style={styles.buttonText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            {/* Icon Label + Button */}
            <Text style={styles.iconLabel}>Icon</Text>
            <TouchableOpacity onPress={() => setIconPickerVisible(true)} style={styles.iconButton}>
              <Text style={styles.iconButtonText}>{newIcon ? `Icon: ${newIcon}` : "Select Icon"}</Text>
            </TouchableOpacity>

            {/* Icon Picker Modal */}
            <Modal animationType="fade" transparent visible={iconPickerVisible} onRequestClose={() => setIconPickerVisible(false)}>
              <View style={styles.iconModalContainer}>
                <View style={styles.iconModalContent}>
                  <Text style={styles.modalTitle}>Select Icon</Text>
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
                    style={[styles.button, { backgroundColor: "#444" }]}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.button, { backgroundColor: "#444" }]}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddCountdown}
                style={[styles.button, { backgroundColor: "#66FCF1" }]}
              >
                <Text style={styles.buttonText}>Save Countdown</Text>
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
  headerContainer: {
    paddingHorizontal: wp("4%"),
    paddingTop: wp("8%"),
    paddingBottom: wp("4%"),
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    marginBottom: wp("2%")
  },
  headerTitle: {
    fontSize: wp("5%"),
    fontWeight: "bold",
    color: "#2C3E50",
    fontFamily: "monospace",
  },
  headerSubtitle: {
    fontSize: wp("3%"),
    color: "#7F8C8D",
    fontFamily: "monospace",
    marginTop: wp("1%"),
  },
  listContainer: {
    paddingHorizontal: wp("4%"),
    paddingBottom: wp("20%"),
  },
  emptyContainer: { 
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp("4%"),
  },
  emptyText: {
    fontSize: wp("4.5%"),
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: wp("2.5%"),
    fontFamily: "monospace",
    textAlign: "center",
  },
  emptySubText: {
    fontSize: wp("2.5%"),
    color: "#7F8C8D",
    textAlign: "center",
    marginBottom: wp("2.5%"),
    fontFamily: "monospace",
  },
  floatingButton: {
    position: "absolute",
    bottom: wp("4%"),
    right: wp("4%"),
    backgroundColor: "#3498DB",
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
});

export default HomeScreen;
