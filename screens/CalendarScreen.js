import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Modal, ScrollView, Animated } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Calendar } from "react-native-calendars";
import moment from "moment";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { useTheme } from "../context/ThemeContext";
import { Analytics } from "../util/analytics";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from "@react-navigation/native";

const CalendarScreen = () => {
  const { theme, isDark } = useTheme();
  const [events, setEvents] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [eventsForDay, setEventsForDay] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(moment().format('YYYY-MM-DD'));
  
  // Animation for month transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Analytics.initialize();
    Analytics.trackScreenView("Calendar");
    loadEvents();
  }, []);

  // Reload events when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [])
  );

  // Rebuild marked dates when theme changes
  useEffect(() => {
    if (!events || events.length === 0) return;
    const marks = {};
    events.forEach((e) => {
      const key = moment(e.date).format("YYYY-MM-DD");
      marks[key] = { 
        ...(marks[key] || {}), 
        marked: true, 
        dotColor: isDark ? '#3CC4A2' : theme.colors.primary,
        customStyles: {
          container: {
            backgroundColor: 'transparent',
          },
        },
      };
    });
    setMarkedDates(marks);
  }, [theme, events, isDark]);

  const loadEvents = async () => {
    try {
      const stored = await AsyncStorage.getItem("countdowns");
      const parsed = stored ? JSON.parse(stored) : [];
      setEvents(parsed);
      const marks = {};
      parsed.forEach((e) => {
        const key = moment(e.date).format("YYYY-MM-DD");
        marks[key] = { 
          marked: true, 
          dotColor: isDark ? '#3CC4A2' : theme.colors.primary,
          customStyles: {
            container: {
              backgroundColor: 'transparent',
            },
          },
        };
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

  const onMonthChange = (month) => {
    // Animate month transition
    fadeAnim.setValue(0);
    slideAnim.setValue(-20);
    setCurrentMonth(month.dateString);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Background gradient colors based on theme
  const backgroundGradient = isDark 
    ? ['#121212', '#1E1E1E']
    : ['#F8F9FA', '#FFFFFF'];

  // Muted accent color for lines and highlights
  const accentColor = isDark ? '#3CC4A2' : theme.colors.primary;

  return (
    <LinearGradient colors={backgroundGradient} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Animated.View 
            style={[
              styles.calendarWrapper,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Calendar
              key={`${theme.name}-${currentMonth}`}
              current={currentMonth}
              onMonthChange={onMonthChange}
              onDayPress={onDayPress}
              markedDates={markedDates}
              markingType="custom"
              theme={{
                backgroundColor: 'transparent',
                calendarBackground: 'transparent',
                textSectionTitleColor: isDark ? 'rgba(255,255,255,0.6)' : theme.colors.textSecondary,
                dayTextColor: isDark ? 'rgba(255,255,255,0.9)' : theme.colors.text,
                todayTextColor: accentColor,
                monthTextColor: isDark ? '#FFFFFF' : theme.colors.text,
                arrowColor: accentColor,
                selectedDayBackgroundColor: 'transparent',
                selectedDayTextColor: accentColor,
                textDisabledColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                dotColor: accentColor,
                selectedDotColor: accentColor,
                'stylesheet.calendar.header': {
                  week: {
                    marginTop: hp('1.5%'),
                    marginBottom: hp('1%'),
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingHorizontal: wp('2%'),
                  },
                  dayHeader: {
                    marginTop: hp('0.5%'),
                    marginBottom: hp('0.5%'),
                    width: wp('12%'),
                    textAlign: 'center',
                    fontSize: wp('3.5%'),
                    fontWeight: '600',
                    color: isDark ? 'rgba(255,255,255,0.6)' : theme.colors.textSecondary,
                    fontFamily: 'System', // SF Pro on iOS, Roboto on Android
                  },
                },
                'stylesheet.day.basic': {
                  base: {
                    width: wp('12%'),
                    height: wp('12%'),
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  text: {
                    marginTop: hp('0.3%'),
                    fontSize: wp('4%'),
                    fontWeight: '500',
                    color: isDark ? 'rgba(255,255,255,0.9)' : theme.colors.text,
                    fontFamily: 'System',
                  },
                  today: {
                    backgroundColor: `${accentColor}15`,
                    borderRadius: wp('6%'),
                    borderWidth: 1.5,
                    borderColor: `${accentColor}40`,
                  },
                  todayText: {
                    color: accentColor,
                    fontWeight: '600',
                  },
                  selected: {
                    backgroundColor: 'transparent',
                    borderRadius: wp('6%'),
                    borderWidth: 2,
                    borderColor: `${accentColor}60`,
                    shadowColor: accentColor,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 2,
                  },
                  disabledText: {
                    color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
                    opacity: 0.4,
                  },
                },
                'stylesheet.day.period': {
                  text: {
                    fontSize: wp('4%'),
                    fontWeight: '500',
                  },
                },
              }}
              style={styles.calendar}
              // Increase spacing between rows
              hideExtraDays={true}
              firstDay={1} // Monday
              enableSwipeMonths={true}
            />
          </Animated.View>
        </View>

        <Modal 
          transparent 
          visible={modalVisible} 
          animationType="fade" 
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)' }]}>
            <View style={[
              styles.modalContent, 
              { 
                backgroundColor: isDark ? '#1E1E1E' : theme.colors.card, 
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : theme.colors.border,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 8,
              }
            ]}> 
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : theme.colors.text }]}>
                  {selectedDate ? moment(selectedDate).format("MMMM Do, YYYY") : ""}
                </Text>
                <TouchableOpacity 
                  onPress={() => setModalVisible(false)}
                  style={[styles.closeIconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                >
                  <Ionicons name="close" size={wp('5%')} color={isDark ? '#FFFFFF' : theme.colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {eventsForDay.length === 0 && (
                  <View style={styles.emptyState}>
                    <Ionicons name="calendar-outline" size={wp('12%')} color={isDark ? 'rgba(255,255,255,0.3)' : theme.colors.textSecondary} />
                    <Text style={[styles.emptyStateText, { color: isDark ? 'rgba(255,255,255,0.6)' : theme.colors.textSecondary }]}>
                      No events on this day
                    </Text>
                  </View>
                )}
                {eventsForDay.map((e) => (
                  <TouchableOpacity 
                    key={e.id} 
                    activeOpacity={0.7}
                    style={[
                      styles.eventCard, 
                      { 
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : theme.colors.surface, 
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : theme.colors.border,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 2,
                      }
                    ]}
                  >
                    <View style={[
                      styles.eventIcon, 
                      { 
                        backgroundColor: isDark ? 'rgba(60,196,162,0.15)' : `${accentColor}15`,
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(60,196,162,0.3)' : `${accentColor}30`,
                      }
                    ]}>
                      <Text style={{ fontSize: wp('6%') }}>{e.icon}</Text>
                    </View>
                    <View style={styles.eventInfo}>
                      <Text style={[styles.eventTitle, { color: isDark ? '#FFFFFF' : theme.colors.text }]}>{e.name}</Text>
                      <Text style={[styles.eventTime, { color: isDark ? 'rgba(255,255,255,0.6)' : theme.colors.textSecondary }]}>
                        {moment(e.date).format('ddd, D MMM YYYY [at] hh:mm A')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: wp('5%'),
    paddingTop: hp('2%'),
  },
  calendarWrapper: {
    flex: 1,
  },
  calendar: {
    borderRadius: wp('4%'),
    paddingVertical: hp('1%'),
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: wp('5%'),
    padding: wp('5%'),
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('2%'),
    paddingBottom: hp('1.5%'),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: wp('5.5%'),
    fontWeight: '700',
    flex: 1,
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  closeIconButton: {
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('5%'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: wp('2%'),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp('5%'),
  },
  emptyStateText: {
    fontSize: wp('4%'),
    fontWeight: '500',
    marginTop: hp('2%'),
    fontFamily: 'System',
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: wp('4%'),
    padding: wp('4%'),
    marginBottom: wp('3%'),
  },
  eventIcon: {
    width: wp('14%'),
    height: wp('14%'),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: wp('3.5%'),
    marginRight: wp('4%'),
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: wp('4.5%'),
    fontWeight: '600',
    marginBottom: wp('1%'),
    fontFamily: 'System',
  },
  eventTime: {
    fontSize: wp('3.5%'),
    fontWeight: '500',
    fontFamily: 'System',
  },
});

export default CalendarScreen;
