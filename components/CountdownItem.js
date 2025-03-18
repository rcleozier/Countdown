import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from "react-native";
import moment from "moment";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";

const CountdownItem = ({ event, index, onDelete }) => {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(event.date));
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

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
            {timeLeft === null ? (
              <Text style={styles.expiredText}>Expired</Text>
            ) : (
              <Text style={styles.countdownText}>
                {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
              </Text>
            )}
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
    marginBottom: wp("2%"),
    borderRadius: wp("1%"),
  },
  container: {
    flexDirection: "row",
    paddingVertical: wp("3%"),
    paddingHorizontal: wp("2.5%"),
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: wp("0.25%"),
    borderBottomColor: "#415A77",
    backgroundColor: "transparent",
    borderRadius: wp("1%"),
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    fontSize: wp("6%"),
    color: "#FFF",
    marginRight: wp("1.5%"),
  },
  textContainer: {
    justifyContent: "center",
  },
  title: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: "#FFF",
    fontFamily: "monospace",
  },
  date: {
    fontSize: wp("2.5%"),
    color: "#AAA",
    fontFamily: "monospace",
  },
  rightSection: {
    alignItems: "flex-end",
  },
  countdownText: {
    fontSize: wp("3.5%"),
    color: "#FFF",
    fontWeight: "bold",
    marginBottom: wp("1%"),
    fontFamily: "monospace",
  },
  expiredText: {
    fontSize: wp("3.5%"),
    color: "red",
    fontWeight: "bold",
    marginBottom: wp("1%"),
    fontFamily: "monospace",
  },
  deleteButton: {
    backgroundColor: "rgba(102,252,241,0.2)",
    paddingVertical: wp("0.75%"),
    paddingHorizontal: wp("2%"),
    borderRadius: wp("0.75%"),
  },
  deleteButtonText: {
    color: "#66FCF1",
    fontSize: wp("2%"),
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
    borderRadius: wp("1.5%"),
    padding: wp("3.75%"),
    alignItems: "center",
    elevation: 5,
  },
  modalTitle: {
    fontSize: wp("4.5%"),
    fontWeight: "bold",
    marginBottom: wp("2.5%"),
    color: "#66FCF1",
    fontFamily: "monospace",
    textAlign: "center",
  },
  modalMessage: {
    fontSize: wp("3.75%"),
    marginBottom: wp("3.75%"),
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
    marginHorizontal: wp("1.25%"),
    padding: wp("2.5%"),
    borderRadius: wp("1.5%"),
    alignItems: "center",
  },
  modalButtonText: {
    color: "#FFF",
    fontSize: wp("3.75%"),
    fontWeight: "bold",
    fontFamily: "monospace",
  },
});

export default CountdownItem;
