import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

const SettingsScreen = () => {
  const [eventCount, setEventCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

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

  // Clear all events
  const clearEvents = async () => {
    try {
      await AsyncStorage.removeItem("countdowns");
      setEventCount(0);
    } catch (error) {
      console.error("Error clearing events", error);
    }
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Main Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.countLabel}>Total Events: {eventCount}</Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>Clear All Events</Text>
          </TouchableOpacity>
        </View>

        {/* Confirmation Modal */}
        <Modal
          animationType="fade"
          transparent
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Confirm Clear</Text>
              <Text style={styles.modalMessage}>
                Are you sure you want to clear all events?
              </Text>
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={[styles.modalButton, { backgroundColor: "#444" }]}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={clearEvents}
                  style={[styles.modalButton, { backgroundColor: "#66FCF1" }]}
                >
                  <Text style={styles.modalButtonText}>Confirm</Text>
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
    backgroundColor: "#0D1B2A",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: wp("4%"), // ~50% smaller than previous 30
  },
  card: {
    width: "85%",
    backgroundColor: "#1B263B",
    borderRadius: wp("4%"), // ~50% smaller than previous 16
    padding: wp("4%"),      // ~50% smaller than previous 24
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#66FCF1",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: wp("2%"),
    elevation: 8,
  },
  title: {
    fontSize: wp("4%"), // ~50% smaller than previous 32
    fontWeight: "bold",
    color: "#66FCF1",
    marginBottom: wp("2.5%"),
    textAlign: "center",
    fontFamily: "monospace",
  },
  countLabel: {
    fontSize: wp("3%"), // ~50% smaller than previous 24
    fontWeight: "600",
    color: "#EEE",
    marginBottom: wp("4%"),
    textAlign: "center",
    fontFamily: "monospace",
  },
  clearButton: {
    backgroundColor: "#66FCF1",
    paddingVertical: wp("3.5%"), // ~50% smaller
    paddingHorizontal: wp("5%"),
    borderRadius: wp("2%"),
  },
  clearButtonText: {
    color: "#0D1B2A",
    fontSize: wp("3%"), // ~50% smaller than 18
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(13,27,42,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#1B263B",
    borderRadius: wp("3%"), // ~50% smaller than previous 12
    padding: wp("4%"),
    alignItems: "center",
    elevation: 5,
    borderWidth: 2,
    borderColor: "#66FCF1",
  },
  modalTitle: {
    fontSize: wp("3.5%"), // ~50% smaller than previous 28
    fontWeight: "bold",
    marginBottom: wp("3%"),
    textAlign: "center",
    color: "#66FCF1",
    fontFamily: "monospace",
  },
  modalMessage: {
    fontSize: wp("2.5%"), // ~50% smaller than previous 18
    marginBottom: wp("4%"),
    textAlign: "center",
    color: "#CCC",
    fontFamily: "monospace",
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    marginHorizontal: wp("1%"),
    padding: wp("3.5%"),
    borderRadius: wp("2%"),
    alignItems: "center",
  },
  modalButtonText: {
    color: "#FFF",
    fontSize: wp("2%"), // ~50% smaller than previous 16
    fontWeight: "bold",
    fontFamily: "monospace",
  },
});

export default SettingsScreen;
