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

  const futuristicIcons = [
    "🎂","🎉","🎈","💍","🎁","🏆","⚽️","🏀","🏈","🎄","🎃","🕯","🍾","🥂","🍰","💌","🎤","🎭","🎟","🎬",
    "📅","✈️","🏖","🌟","🛍","🏅","🎓","📚","💼","🎨","🎶","🎷","🎸","📣","💐","🕊","🏠","🚗","📷","🖼",
    "🍽","🍻","🥘","🛎","💡","🎊","💃","🕺","🏟","🎪","🏝","🎮","📺","🚴‍♀️","🏰","🛹",
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
                      backgroundColor: "#0D1B2A",
                      calendarBackground: "#0D1B2A",
                      textSectionTitleColor: "#66FCF1",
                      dayTextColor: "#FFF",
                      todayTextColor: "#66FCF1",
                      monthTextColor: "#66FCF1",
                      arrowColor: "#66FCF1",
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
                    {futuristicIcons.map((icon, index) => (
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
    backgroundColor: "#0D1B2A",
  },
  listContainer: {
    paddingHorizontal: wp("4%"),
    paddingBottom: wp("20%"), // Extra bottom padding so items don't go behind the floating button
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
    color: "#FFF",
    marginBottom: wp("2.5%"),
    fontFamily: "monospace",
    textAlign: "center",
  },
  emptySubText: {
    fontSize: wp("2.5%"),
    color: "#AAA",
    textAlign: "center",
    marginBottom: wp("2.5%"),
    fontFamily: "monospace",
  },
  floatingButton: {
    position: "absolute",
    bottom: wp("4%"),
    right: wp("4%"),
    backgroundColor: "#0D1B2A", // Solid background for readability
    borderWidth: wp("0.5%"),
    borderColor: "#66FCF1",
    paddingVertical: wp("3%"),
    paddingHorizontal: wp("4%"),
    borderRadius: wp("2%"),
    zIndex: 999, // Ensures the button stays on top
  },
  floatingButtonText: {
    color: "#66FCF1",
    fontSize: wp("3%"),
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(13,27,42,0.9)",
    paddingHorizontal: wp("4%"),
  },
  modalContent: {
    backgroundColor: "#0D1B2A",
    borderRadius: wp("2%"),
    padding: wp("4%"),
    elevation: 5,
  },
  modalTitle: {
    fontSize: wp("4%"),
    fontWeight: "bold",
    marginBottom: wp("2.5%"),
    textAlign: "center",
    color: "#66FCF1",
    fontFamily: "monospace",
  },
  input: {
    borderWidth: wp("0.5%"),
    borderColor: "#444",
    padding: wp("2%"),
    marginBottom: wp("2.5%"),
    borderRadius: wp("1%"),
    color: "#FFF",
    fontFamily: "monospace",
    fontSize: wp("3%"),
  },
  iconLabel: {
    fontSize: wp("2.5%"),
    color: "#FFF",
    fontFamily: "monospace",
    marginBottom: wp("1%"),
  },
  iconButton: {
    borderWidth: wp("0.5%"),
    borderColor: "#66FCF1",
    paddingVertical: wp("2%"),
    paddingHorizontal: wp("3%"),
    borderRadius: wp("1%"),
    backgroundColor: "rgba(255,255,255,0.15)",
    marginBottom: wp("2.5%"),
    alignItems: "center",
  },
  iconButtonText: {
    fontSize: wp("3%"),
    color: "#FFF",
    fontFamily: "monospace",
  },
  iconModalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(13,27,42,0.9)",
  },
  iconModalContent: {
    margin: wp("4%"),
    backgroundColor: "#0D1B2A",
    borderRadius: wp("2%"),
    padding: wp("4%"),
    elevation: 5,
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
    borderWidth: wp("0.5%"),
    borderColor: "#444",
    alignItems: "center",
    justifyContent: "center",
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
    color: "#FFF",
    fontWeight: "bold",
    fontSize: wp("3%"),
    fontFamily: "monospace",
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(13,27,42,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  calendarModalContent: {
    width: wp("90%"),
    backgroundColor: "#0D1B2A",
    borderRadius: wp("2%"),
    padding: wp("4%"),
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
