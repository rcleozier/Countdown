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
              {timeLeft === null ? (
                <Text style={styles.expiredText}>Expired</Text>
              ) : (
                <Text style={styles.countdownText}>
                  {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
                </Text>
              )}
              <Text style={styles.date}>
                {moment(event.date).format("ddd, D MMM YYYY")}
              </Text>
            </View>
          </View>
          <View style={styles.rightSection}>
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
    paddingVertical: wp("4%"),
    paddingHorizontal: wp("4%"),
    backgroundColor: "#FFFFFF",
    borderRadius: wp("3%"),
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1.2,
  },
  icon: {
    fontSize: wp("8%"),
    marginRight: wp("3%"),
    backgroundColor: "#EAF6FF",
    borderRadius: wp("2%"),
    padding: wp("2%"),
    overflow: "hidden",
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
    minWidth: wp("20%"),
    maxWidth: wp("28%"),
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
  deleteButton: {
    backgroundColor: "#FDEDEC",
    paddingVertical: wp("1.5%"),
    paddingHorizontal: wp("4%"),
    borderRadius: wp("2%"),
    marginTop: wp("0.5%"),
  },
  deleteButtonText: {
    color: "#E74C3C",
    fontSize: wp("2.7%"),
    fontWeight: "600",
    fontFamily: "monospace",
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
});

export default CountdownItem;
