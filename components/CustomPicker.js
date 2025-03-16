import React, { useState } from "react";
import {
  Modal,
  TouchableOpacity,
  View,
  Text,
  ScrollView,
  StyleSheet,
} from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";

const CustomPicker = ({ label, items, selectedValue, onValueChange }) => {
  const [visible, setVisible] = useState(false);

  const handleSelect = (value) => {
    onValueChange(value);
    setVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setVisible(true)}
      >
        <Text style={styles.buttonText}>
          {items.find((item) => item.value === selectedValue)?.label || "Select"}
        </Text>
      </TouchableOpacity>
      <Modal
        animationType="slide"
        transparent
        visible={visible}
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setVisible(false)}>
          <View style={styles.modalContent}>
            <ScrollView style={styles.scrollView}>
              {items.map((item, index) => (
                <TouchableOpacity
                  key={index.toString()}
                  style={styles.modalItem}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text style={styles.modalItemText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "30%",
    marginHorizontal: wp("1%"),
    alignItems: "center",
  },
  label: {
    fontSize: wp("2.5%"),
    color: "#FFF",
    marginBottom: wp("1%"),
    fontFamily: "monospace",
  },
  button: {
    borderWidth: wp("0.5%"),
    borderColor: "#66FCF1",
    paddingVertical: wp("2%"),
    paddingHorizontal: wp("2%"),
    borderRadius: wp("1%"),
    backgroundColor: "rgba(255,255,255,0.15)",
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    fontSize: wp("3%"),
    color: "#FFF",
    fontFamily: "monospace",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(13,27,42,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: wp("80%"),
    maxHeight: hp("50%"),
    backgroundColor: "#0D1B2A",
    borderRadius: wp("2%"),
    padding: wp("4%"),
  },
  scrollView: {
    width: "100%",
  },
  modalItem: {
    paddingVertical: wp("2%"),
    borderBottomWidth: wp("0.5%"),
    borderColor: "#444",
  },
  modalItemText: {
    fontSize: wp("3%"),
    color: "#FFF",
    fontFamily: "monospace",
  },
});

export default CustomPicker;
