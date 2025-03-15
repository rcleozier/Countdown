import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from "react-native";
import moment from "moment";

const CountdownItem = ({ event, index, onDelete }) => {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(event.date));
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Calculate time left down to seconds
  function getTimeLeft(date) {
    const now = moment();
    const target = moment(date);
    const duration = moment.duration(target.diff(now));
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

  return (
    <>
      {/* Main Item Row */}
      <View style={styles.gradientBorder}>
        <View style={styles.container}>
          <View style={styles.leftSection}>
            <Text style={styles.icon}>{event.icon}</Text>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{event.name}</Text>
              <Text style={styles.date}>
                {moment(event.date).format("ddd, D MMM YYYY")}
              </Text>
            </View>
          </View>
          <View style={styles.rightSection}>
            <Text style={styles.countdownText}>
              {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
            </Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => setDeleteModalVisible(true)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    </>
  );
};

const styles = StyleSheet.create({
  gradientBorder: {
    marginBottom: 16,
    borderRadius: 8,
  },
  container: {
    flexDirection: "row",
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#415A77",
    backgroundColor: "transparent",
    borderRadius: 8,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    fontSize: 48,
    color: "#FFF",
    marginRight: 12,
  },
  textContainer: {
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#FFF",
    fontFamily: "monospace",
  },
  date: {
    fontSize: 20,
    color: "#AAA",
    fontFamily: "monospace",
  },
  rightSection: {
    alignItems: "flex-end",
  },
  countdownText: {
    fontSize: 28,
    color: "#FFF",
    fontWeight: "bold",
    marginBottom: 8,
    fontFamily: "monospace",
  },
  deleteButton: {
    backgroundColor: "rgba(102,252,241,0.2)",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: "#66FCF1",
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(13,27,42,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#0D1B2A",
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
    elevation: 5,
  },
  modalTitle: {
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#66FCF1",
    fontFamily: "monospace",
  },
  modalMessage: {
    fontSize: 24,
    marginBottom: 30,
    color: "#CCC",
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
    marginHorizontal: 10,
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
});

export default CountdownItem;
