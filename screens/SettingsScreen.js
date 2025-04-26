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
    backgroundColor: "#F8F9FA",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: wp("4%"),
  },
  card: {
    width: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: wp("4%"),
    padding: wp("4%"),
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: wp("2%"),
    elevation: 8,
  },
  title: {
    fontSize: wp("4%"),
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: wp("2.5%"),
    textAlign: "center",
    fontFamily: "monospace",
  },
  countLabel: {
    fontSize: wp("3%"),
    fontWeight: "600",
    color: "#7F8C8D",
    marginBottom: wp("4%"),
    textAlign: "center",
    fontFamily: "monospace",
  },
  clearButton: {
    backgroundColor: "#3498DB",
    paddingVertical: wp("3.5%"),
    paddingHorizontal: wp("5%"),
    borderRadius: wp("2%"),
  },
  clearButtonText: {
    color: "#FFFFFF",
    fontSize: wp("3%"),
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#FFFFFF",
    borderRadius: wp("3%"),
    padding: wp("4%"),
    alignItems: "center",
    elevation: 5,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: wp("3.5%"),
    fontWeight: "bold",
    marginBottom: wp("3%"),
    textAlign: "center",
    color: "#2C3E50",
    fontFamily: "monospace",
  },
  modalMessage: {
    fontSize: wp("2.5%"),
    marginBottom: wp("4%"),
    textAlign: "center",
    color: "#7F8C8D",
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
    color: "#FFFFFF",
    fontSize: wp("2%"),
    fontWeight: "bold",
    fontFamily: "monospace",
  },
});

export default SettingsScreen;
