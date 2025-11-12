import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Modal, ScrollView, Animated, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Calendar } from "react-native-calendars";
import moment from "moment";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { useTheme } from "../context/ThemeContext";
import { Analytics } from "../util/analytics";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from "@react-navigation/native";

const EventCard = ({ event, isDark }) => {
  const eventCardScale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPressIn={() => {
        Animated.spring(eventCardScale, {
          toValue: 0.98,
          useNativeDriver: true,
        }).start();
      }}
      onPressOut={() => {
        Animated.spring(eventCardScale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      }}
    >
      <Animated.View style={[
        styles.eventCard, 
        { 
          backgroundColor: isDark ? '#2A2A2A' : '#F9FAFB',
          borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'transparent',
          shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          transform: [{ scale: eventCardScale }],
        }
      ]}>
        <View style={[
          styles.eventIcon, 
          { 
            backgroundColor: isDark ? 'rgba(78,158,255,0.15)' : 'rgba(78,158,255,0.08)',
          }
        ]}>
          <Text style={{ fontSize: wp('6%') }}>{event.icon}</Text>
        </View>
        <View style={styles.eventInfo}>
          <Text style={[styles.eventTitle, { color: isDark ? '#F5F5F5' : '#111111' }]}>{event.name}</Text>
          <Text style={[styles.eventTime, { color: isDark ? '#A1A1A1' : '#6B7280' }]}>
            {moment(event.date).format('ddd, D MMM YYYY [at] hh:mm A')}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

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
  
  // Animation for modal
  const modalScale = useRef(new Animated.Value(0.95)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const closeButtonScale = useRef(new Animated.Value(1)).current;

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

  // Modal animation
  useEffect(() => {
    if (modalVisible) {
      Animated.parallel([
        Animated.spring(modalScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      modalScale.setValue(0.95);
      modalOpacity.setValue(0);
    }
  }, [modalVisible]);

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
          <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.25)' }]}>
            <Animated.View style={[
              styles.modalContent, 
              { 
                backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)',
                transform: [{ scale: modalScale }],
                opacity: modalOpacity,
              }
            ]}> 
              <View style={styles.modalHeader}>
                <Text style={[
                  styles.modalTitle, 
                  { color: isDark ? '#F3F4F6' : '#111111' }
                ]}>
                  {selectedDate ? moment(selectedDate).format("MMMM Do, YYYY") : ""}
                </Text>
                <Pressable
                  onPress={() => setModalVisible(false)}
                  onPressIn={() => {
                    Animated.spring(closeButtonScale, {
                      toValue: 0.9,
                      useNativeDriver: true,
                    }).start();
                  }}
                  onPressOut={() => {
                    Animated.spring(closeButtonScale, {
                      toValue: 1,
                      useNativeDriver: true,
                    }).start();
                  }}
                >
                  <Animated.View style={[
                    styles.closeIconButton,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      transform: [{ scale: closeButtonScale }],
                    }
                  ]}>
                    <Ionicons 
                      name="close" 
                      size={wp('5%')} // 20px
                      color={isDark ? '#9CA3AF' : '#6B7280'} 
                    />
                  </Animated.View>
                </Pressable>
              </View>
              <View style={[
                styles.modalDivider,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }
              ]} />
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
                  <EventCard key={e.id} event={e} isDark={isDark} />
                ))}
              </ScrollView>
            </Animated.View>
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
    maxWidth: wp('85%'),
    maxHeight: '80%',
    borderRadius: wp('4.5%'), // 18-20px
    padding: wp('5%'), // 20-24px
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: wp('3%'), // 12-16px spacing
  },
  modalTitle: {
    fontSize: wp('4.5%'), // 17-18px
    fontWeight: '600', // Semibold
    flex: 1,
    fontFamily: 'System',
    letterSpacing: 0.4, // 4px letter spacing
  },
  modalDivider: {
    height: 1,
    marginBottom: wp('4%'), // 12-16px spacing
  },
  closeIconButton: {
    width: wp('9%'), // 36px circular touch target
    height: wp('9%'),
    borderRadius: wp('4.5%'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: wp('5%'), // 20-24px bottom padding
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
    borderRadius: wp('3.5%'), // 14-16px
    padding: wp('4%'), // 16px
    marginBottom: wp('3%'),
    borderWidth: 0,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  eventIcon: {
    width: wp('11%'), // 44px
    height: wp('11%'),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: wp('5.5%'), // Circular
    marginRight: wp('4%'),
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: wp('4%'), // 16px
    fontWeight: '600', // Semibold
    marginBottom: wp('1%'), // 4-6px spacing
    fontFamily: 'System',
    lineHeight: wp('5%'),
  },
  eventTime: {
    fontSize: wp('3.5%'), // 14px
    fontWeight: '500', // Medium
    fontFamily: 'System',
    lineHeight: wp('4.5%'),
  },
});

export default CalendarScreen;
