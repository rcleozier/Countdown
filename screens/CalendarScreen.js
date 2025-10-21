import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Modal, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Calendar } from "react-native-calendars";
import moment from "moment";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { useTheme } from "../context/ThemeContext";
import OptimizedBannerAd from "../components/Ads";
import { Analytics } from "../util/analytics";

const CalendarScreen = () => {
  const { theme } = useTheme();
  const [events, setEvents] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [eventsForDay, setEventsForDay] = useState([]);

  useEffect(() => {
    Analytics.initialize();
    Analytics.trackScreenView("Calendar");
    loadEvents();
  }, []);

  // Rebuild marked dates when theme changes so dotColor updates immediately
  useEffect(() => {
    if (!events || events.length === 0) return;
    const marks = {};
    events.forEach((e) => {
      const key = moment(e.date).format("YYYY-MM-DD");
      marks[key] = { ...(marks[key] || {}), marked: true, dotColor: theme.colors.primary };
    });
    setMarkedDates(marks);
  }, [theme, events]);

  const loadEvents = async () => {
    try {
      const stored = await AsyncStorage.getItem("countdowns");
      const parsed = stored ? JSON.parse(stored) : [];
      setEvents(parsed);
      const marks = {};
      parsed.forEach((e) => {
        const key = moment(e.date).format("YYYY-MM-DD");
        marks[key] = { ...(marks[key] || {}), marked: true, dotColor: theme.colors.primary };
      });
      setMarkedDates(marks);
    } catch (e) {
      console.error("Failed to load events", e);
    }
  };

  const onDayPress = (day) => {
    const key = day.dateString;
    const items = events
      .filter((e) => moment(e.date).format("YYYY-MM-DD") === key)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    setSelectedDate(key);
    setEventsForDay(items);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <OptimizedBannerAd />
        <Calendar
          key={theme.name}
          style={styles.calendar}
          onDayPress={onDayPress}
          markedDates={markedDates}
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

        <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
          <View style={[styles.modalOverlay, { backgroundColor: theme.colors.modalOverlay }]}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}> 
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {selectedDate ? moment(selectedDate).format("MMMM Do, YYYY") : ""}
              </Text>
              <ScrollView contentContainerStyle={{ paddingBottom: wp('2%') }}>
                {eventsForDay.length === 0 && (
                  <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', marginVertical: wp('2%') }}>No events</Text>
                )}
                {eventsForDay.map((e) => (
                  <View key={e.id} style={[styles.eventCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <View style={[styles.eventIcon, { backgroundColor: theme.colors.card }]}>
                      <Text style={{ fontSize: wp('6%') }}>{e.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.eventTitle, { color: theme.colors.text }]}>{e.name}</Text>
                      <Text style={[styles.eventTime, { color: theme.colors.textSecondary }]}>
                        {moment(e.date).format('ddd, D MMM YYYY [at] hh:mm A')}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.colors.primary }]} onPress={() => setModalVisible(false)}>
                <Text style={[styles.closeButtonText, { color: theme.colors.buttonText }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: wp('4%') },
  calendar: { borderRadius: wp('3%'), overflow: 'hidden', marginTop: wp('2%') },
  modalOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '92%', borderRadius: wp('3%'), padding: wp('4%'), borderWidth: 1 },
  modalTitle: { fontSize: wp('5%'), fontWeight: '700', marginBottom: wp('3%'), textAlign: 'center' },
  eventCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: wp('3%'), padding: wp('3%'), marginBottom: wp('2%') },
  eventIcon: { width: wp('12%'), height: wp('12%'), alignItems: 'center', justifyContent: 'center', borderRadius: wp('2.5%'), marginRight: wp('3%') },
  eventTitle: { fontSize: wp('4%'), fontWeight: '600', marginBottom: wp('1%') },
  eventTime: { fontSize: wp('3%') },
  closeButton: { marginTop: wp('2%'), borderRadius: wp('3%'), paddingVertical: wp('3%'), alignItems: 'center' },
  closeButtonText: { fontSize: wp('4%'), fontWeight: '600' },
});

export default CalendarScreen;
