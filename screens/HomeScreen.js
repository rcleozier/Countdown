import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "@react-navigation/native";
import CountdownItem from "../components/CountdownItem";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

// GUID generator (simple implementation)
const generateGUID = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const HomeScreen = () => {
  const [countdowns, setCountdowns] = useState([]);

  // Modal visibility
  const [modalVisible, setModalVisible] = useState(false);

  // Form fields
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("💻");

  // Icon picker visibility
  const [iconPickerVisible, setIconPickerVisible] = useState(false);

  // Custom date picker state (month, day, year)
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Load countdowns from AsyncStorage on focus
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

  // Save countdowns to AsyncStorage whenever they change
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

  // Sort countdowns by date (closest first) and filter to only upcoming events
  const sortedCountdowns = [...countdowns].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  const upcomingEvents = sortedCountdowns.filter(
    (event) => new Date(event.date) > new Date()
  );

  // Generate years, days, and months for pickers
  const years = [];
  for (let y = 2023; y <= 2035; y++) {
    years.push(y);
  }
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const months = [
    { label: "January", value: 0 },
    { label: "February", value: 1 },
    { label: "March", value: 2 },
    { label: "April", value: 3 },
    { label: "May", value: 4 },
    { label: "June", value: 5 },
    { label: "July", value: 6 },
    { label: "August", value: 7 },
    { label: "September", value: 8 },
    { label: "October", value: 9 },
    { label: "November", value: 10 },
    { label: "December", value: 11 },
  ];

  // ~70 futuristic icons for the icon picker
  const futuristicIcons = [
    "💻", "⌨️", "🖥", "📡", "🔌", "🔒", "🛰", "🤖", "💾", "⚙️",
    "📀", "🧬", "🧠", "🚀", "🌌", "👾", "🔮", "💡", "🕹", "🔭",
    "📡", "🛸", "💿", "🧮", "🛠", "🔧", "⚡️", "💥", "🔥", "🌐",
    "🚦", "🔋", "📲", "📱", "🎛", "🎚", "🖱", "⌚️", "📟", "🔊",
    "🖲️", "🧰", "👨‍💻", "👩‍💻", "🔰", "📶", "🧭", "🧿", "🔬", "🌠",
    "☄️", "🌟", "✨", "💫", "🌀", "👽"
  ];

  const handleAddCountdown = () => {
    if (!newName) return;

    // Build a Date from the selected year, month, day
    const finalDate = new Date(selectedYear, selectedMonth, selectedDay, 0, 0, 0);

    // Check if the selected date is in the past
    if (finalDate <= new Date()) {
      Alert.alert("Invalid Date", "Please select a date in the future.");
      return;
    }

    const newCountdown = {
      id: generateGUID(),
      name: newName,
      date: finalDate.toISOString(),
      icon: newIcon,
    };

    setCountdowns((prev) => [...prev, newCountdown]);

    // Reset form fields
    setNewName("");
    setNewIcon("💻");
    setSelectedMonth(0);
    setSelectedDay(1);
    setSelectedYear(new Date().getFullYear());
    setModalVisible(false);
  };

  // Delete function to remove a countdown
  const deleteCountdown = (id) => {
    setCountdowns((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <View style={styles.container}>
      {upcomingEvents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No countdowns yet!</Text>
          <Text style={styles.emptySubText}>
            Create your first upcoming event to get started.
          </Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.bigAddButton}
          >
            <Text style={styles.bigAddButtonText}>+ Create Countdown</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={upcomingEvents}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <CountdownItem event={item} index={index} onDelete={deleteCountdown} />
            )}
            contentContainerStyle={styles.listContainer}
          />
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>+ Add New Countdown</Text>
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

            {/* Single-line Date Picker with labels */}
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerItem}>
                <Text style={styles.pickerLabel}>Month</Text>
                <Picker
                  selectedValue={selectedMonth}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                  onValueChange={(value) => {
                    setSelectedMonth(value);
                    const maxDay = new Date(selectedYear, value + 1, 0).getDate();
                    if (selectedDay > maxDay) {
                      setSelectedDay(maxDay);
                    }
                  }}
                >
                  {months.map((month) => (
                    <Picker.Item
                      key={month.value}
                      label={month.label}
                      value={month.value}
                    />
                  ))}
                </Picker>
              </View>
              <View style={styles.datePickerItem}>
                <Text style={styles.pickerLabel}>Day</Text>
                <Picker
                  selectedValue={selectedDay}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                  onValueChange={(value) => setSelectedDay(value)}
                >
                  {daysArray.map((day) => (
                    <Picker.Item key={day} label={day.toString()} value={day} />
                  ))}
                </Picker>
              </View>
              <View style={styles.datePickerItem}>
                <Text style={styles.pickerLabel}>Year</Text>
                <Picker
                  selectedValue={selectedYear}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                  onValueChange={(value) => {
                    setSelectedYear(value);
                    const maxDay = new Date(value, selectedMonth + 1, 0).getDate();
                    if (selectedDay > maxDay) {
                      setSelectedDay(maxDay);
                    }
                  }}
                >
                  {years.map((year) => (
                    <Picker.Item key={year} label={year.toString()} value={year} />
                  ))}
                </Picker>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setIconPickerVisible(true)}
              style={styles.iconButton}
            >
              <Text style={styles.iconButtonText}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#0D1B2A", 
    padding: wp("4%"),
  },
  listContainer: {
    paddingBottom: wp("4%"),
  },
  emptyContainer: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center",
  },
  emptyText: {
    fontSize: wp("4.5%"),
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: wp("2.5%"),
    fontFamily: "monospace",
  },
  emptySubText: {
    fontSize: wp("2.5%"),
    color: "#AAA",
    textAlign: "center",
    marginBottom: wp("2.5%"),
    fontFamily: "monospace",
  },
  bigAddButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#66FCF1",
    paddingVertical: wp("2.5%"),
    paddingHorizontal: wp("4%"),
    borderRadius: wp("2%"),
  },
  bigAddButtonText: {
    color: "#66FCF1",
    fontSize: wp("3%"),
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  addButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#66FCF1",
    padding: wp("3%"),
    borderRadius: wp("2%"),
    alignItems: "center",
    marginTop: wp("4%"),
  },
  addButtonText: {
    color: "#66FCF1",
    fontSize: wp("3%"),
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(13,27,42,0.9)",
  },
  modalContent: {
    margin: wp("4%"),
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
    borderWidth: 2,
    borderColor: "#444",
    padding: wp("2%"),
    marginBottom: wp("2.5%"),
    borderRadius: wp("1%"),
    color: "#FFF",
    fontFamily: "monospace",
    fontSize: wp("3%"),
  },
  datePickerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: wp("2.5%"),
  },
  datePickerItem: {
    flex: 1,
    marginHorizontal: wp("1%"),
    alignItems: "center",
  },
  pickerLabel: {
    fontSize: wp("2.5%"),
    color: "#FFF",
    fontFamily: "monospace",
    marginBottom: wp("1%"),
  },
  picker: {
    height: wp("8%"), // increased height for visibility
    color: "#FFF",
    backgroundColor: "rgba(255,255,255,0.1)", // slight background for contrast
  },
  pickerItem: {
    color: "#FFF",
    fontFamily: "monospace",
    fontSize: wp("3%"),
  },
  iconButton: {
    borderWidth: 2,
    borderColor: "#444",
    padding: wp("2%"),
    borderRadius: wp("1%"),
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
    borderWidth: 2,
    borderColor: "#444",
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
});

export default HomeScreen;
