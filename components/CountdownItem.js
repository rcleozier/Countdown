import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Animated,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import moment from "moment";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { Calendar } from "react-native-calendars";
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useEntitlements } from '../src/billing/useEntitlements';
import { getRecurrenceLabel, RECURRENCE_TYPES } from '../util/recurrence';
import PaywallSheet from '../src/billing/PaywallSheet';
import ProUpsellInline from './ProUpsellInline';
import LockRow from './LockRow';
import ReminderPresetExplainer from './ReminderPresetExplainer';
import { getPresetDescription, REMINDER_PRESETS, isPresetPro } from '../util/reminderPresets';
import ProBadge from './ProBadge';
import { buildRemindersForEvent, createDefaultReminderPlan } from '../util/reminderBuilder';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import eventIcons from '../util/eventIcons';

// IconItem component for icon picker modal
const IconItem = ({ icon, isSelected, onPress, isDark }) => {
  const iconScale = useRef(new Animated.Value(1)).current;
  const iconOpacity = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPressIn={() => {
        Animated.parallel([
          Animated.spring(iconScale, {
            toValue: 1.05,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(iconOpacity, {
            toValue: 0.9,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }}
      onPressOut={() => {
        Animated.parallel([
          Animated.spring(iconScale, {
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(iconOpacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }}
      onPress={() => {
        // Pulse animation for selection
        Animated.sequence([
          Animated.timing(iconOpacity, {
            toValue: 0.8,
            duration: 75,
            useNativeDriver: true,
          }),
          Animated.timing(iconOpacity, {
            toValue: 1,
            duration: 75,
            useNativeDriver: true,
          }),
        ]).start();
        setTimeout(() => onPress(), 150);
      }}
    >
      <Animated.View style={[
        {
          width: wp('13%'),
          height: wp('13%'),
          borderRadius: wp('3%'),
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isSelected 
            ? (isDark ? 'rgba(78,158,255,0.15)' : 'rgba(78,158,255,0.1)')
            : (isDark ? '#2A2A2A' : '#F9FAFB'),
          borderColor: isSelected
            ? (isDark ? '#3CC4A2' : '#4E9EFF')
            : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
          borderWidth: isSelected ? 2 : 1,
          shadowColor: isSelected 
            ? (isDark ? '#3CC4A2' : '#4E9EFF')
            : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
          shadowOffset: isSelected ? { width: 0, height: 0 } : { width: 0, height: 2 },
          shadowOpacity: isSelected ? 0.2 : 1,
          shadowRadius: isSelected ? 4 : 2,
          elevation: isSelected ? 4 : 2,
          transform: [{ scale: iconScale }],
          opacity: iconOpacity,
        }
      ]}>
        <Text style={{ fontSize: wp('7%') }}>{icon}</Text>
      </Animated.View>
    </Pressable>
  );
};

const CountdownItem = ({ event, index, onDelete, onEdit }) => {
  // Use nextOccurrenceAt for recurring events, otherwise use date
  const displayDate = event.nextOccurrenceAt || event.date;
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(displayDate));
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const [showNotesEditor, setShowNotesEditor] = useState(false);
  const { theme, isDark } = useTheme();
  const { t } = useLocale();
  
  // Animation refs
  const cardScale = useRef(new Animated.Value(1)).current;
  const editButtonScale = useRef(new Animated.Value(1)).current;
  const deleteButtonScale = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  // Edit form states
  const [editName, setEditName] = useState(event.name);
  const [editIcon, setEditIcon] = useState(event.icon);
  const [editNotes, setEditNotes] = useState(event.notes || '');
  const [editReminderPreset, setEditReminderPreset] = useState(event.reminderPlan?.preset || 'off');
  const [editRecurrence, setEditRecurrence] = useState(event.recurrence || RECURRENCE_TYPES.NONE);
  const [recurrencePickerVisible, setRecurrencePickerVisible] = useState(false);
  const [tempSelectedDate, setTempSelectedDate] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date(event.date));
  const [selectedHour, setSelectedHour] = useState(moment(event.date).hour());
  const [selectedMinute, setSelectedMinute] = useState(moment(event.date).minute());
  const [inputFocused, setInputFocused] = useState({});
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState('notes');
  const [reminderExplainerVisible, setReminderExplainerVisible] = useState(false);
  const { isPro, getLimit } = useEntitlements();
  
  // Modal animation refs
  const modalScale = useRef(new Animated.Value(0.95)).current;
  const iconModalScale = useRef(new Animated.Value(0.95)).current;

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
      setTimeLeft(getTimeLeft(displayDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [displayDate]);

  // Animate progress bar when progress changes
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Modal animation
  useEffect(() => {
    if (editModalVisible || detailsModalVisible) {
      Animated.spring(modalScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      modalScale.setValue(0.95);
    }
  }, [editModalVisible, detailsModalVisible]);

  // Icon modal animation
  useEffect(() => {
    if (iconPickerVisible) {
      Animated.spring(iconModalScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      iconModalScale.setValue(0.95);
    }
  }, [iconPickerVisible]);

  // Progress calculation
  const getProgress = () => {
    const now = moment();
    const end = moment(displayDate);
    const todayStart = moment().startOf('day');
    if (now.isAfter(end)) return 1;
    if (now.isBefore(todayStart)) return 0;
    const total = end.diff(todayStart);
    const elapsed = now.diff(todayStart);
    return Math.min(Math.max(elapsed / total, 0), 1);
  };
  const progress = getProgress();
  const isPastEvent = moment(displayDate).isBefore(moment());

  // Icons are centralized in util/eventIcons to ensure add and edit use the same set

  const handleOpenEditModal = () => {
    // Light haptic feedback for opening edit modal
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setEditName(event.name);
    setEditIcon(event.icon);
    setEditNotes(event.notes || '');
    // For editing, use originalDateAt if available (for recurring events), otherwise use date
    const editDate = event.originalDateAt || event.date;
    setSelectedDate(new Date(editDate));
    setSelectedHour(moment(editDate).hour());
    setSelectedMinute(moment(editDate).minute());
    setEditModalVisible(true);
  };

  const handleDayPress = (day) => {
    setTempSelectedDate(day.dateString);
  };

  const handleConfirmDate = () => {
    if (!tempSelectedDate) {
      alert(t('countdown.pickDateError'));
      return;
    }
    const [year, month, day] = tempSelectedDate.split("-");
    const finalDate = new Date(
      year,
      parseInt(month, 10) - 1,
      parseInt(day, 10)
    );
    setSelectedDate(finalDate);
    setCalendarModalVisible(false);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) return;
    
    const combinedDateTime = new Date(selectedDate);
    combinedDateTime.setHours(selectedHour);
    combinedDateTime.setMinutes(selectedMinute);
    combinedDateTime.setSeconds(0);
    combinedDateTime.setMilliseconds(0);
    
    if (combinedDateTime <= new Date()) {
      alert(t('countdown.futureDateError'));
      return;
    }
    
    // Validate preset selection - ensure free users can't use Pro presets
    let finalPreset = editReminderPreset;
    if (!isPro && isPresetPro(editReminderPreset)) {
      // Fallback to 'simple' if free user tries to use Pro preset
      finalPreset = 'simple';
    }
    
    const updatedEvent = {
      ...event,
      name: editName,
      icon: editIcon,
      date: combinedDateTime.toISOString(),
      notes: editNotes.trim() || '',
      // Update reminder plan
      reminderPlan: {
        preset: finalPreset,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        enabled: finalPreset !== 'off',
      },
      // Update recurrence fields
      recurrence: editRecurrence,
      // If recurring, update nextOccurrenceAt and preserve originalDateAt
      nextOccurrenceAt: editRecurrence && editRecurrence !== RECURRENCE_TYPES.NONE 
        ? combinedDateTime.toISOString() 
        : combinedDateTime.toISOString(),
      originalDateAt: editRecurrence && editRecurrence !== RECURRENCE_TYPES.NONE
        ? (event.originalDateAt || event.date)
        : undefined,
    };
    
    // Rebuild reminders for the updated event
    updatedEvent.reminders = buildRemindersForEvent(updatedEvent, isPro);
    
    onEdit(updatedEvent);
    setEditModalVisible(false);
  };

  // Accent color
  const accentColor = isDark ? '#4E9EFF' : '#4A9EFF';
  const clearButtonColor = isDark ? '#D64C3C' : '#E15747';
  
  // Card press handlers
  const handleCardPressIn = () => {
    Animated.spring(cardScale, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handleCardPressOut = () => {
    Animated.spring(cardScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  // Action button press handlers
  const handleEditPressIn = () => {
    Animated.spring(editButtonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handleEditPressOut = () => {
    Animated.spring(editButtonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleDeletePressIn = () => {
    Animated.spring(deleteButtonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handleDeletePressOut = () => {
    Animated.spring(deleteButtonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <>
      {/* Main Item Card */}
      <Pressable
        onPressIn={handleCardPressIn}
        onPressOut={handleCardPressOut}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setDetailsModalVisible(true);
        }}
      >
        <Animated.View style={[
          styles.cardWrapper,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
            borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            transform: [{ scale: cardScale }],
          }
        ]}>
          <View style={[
            styles.container,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderRadius: wp('3.5%'),
            }
          ]}>
            <View style={styles.leftSection}>
              <View style={[
                styles.iconContainer,
                {
                  backgroundColor: isDark 
                    ? 'rgba(78,158,255,0.15)' 
                    : 'rgba(78,158,255,0.1)',
                  borderWidth: 1,
                  borderColor: isDark 
                    ? 'rgba(78,158,255,0.2)' 
                    : 'rgba(78,158,255,0.15)',
                  borderRadius: wp('3%'),
                }
              ]}>
                <Text style={[styles.icon, { fontSize: wp('6.5%') }]}>{event.icon}</Text>
              </View>
              <View style={styles.textContainer}>
                <Text style={[
                  styles.title,
                  {
                    color: isDark ? '#FFFFFF' : '#1A1A1A',
                    fontSize: wp('4.25%'), // 17px semibold
                  }
                ]}>{event.name}</Text>
                {timeLeft === null ? (
                  <Text style={[
                    styles.expiredText,
                    {
                      color: theme.colors.error,
                      fontSize: wp('3.5%'),
                    }
                  ]}>Expired</Text>
                ) : (
                  <Text style={[
                    styles.countdownText,
                    {
                      color: accentColor,
                      fontSize: wp('4%'), // 15-16px
                    }
                  ]}>
                    {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
                  </Text>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: wp('1%') }}>
                  <Text style={[
                    styles.date,
                    {
                      color: isDark ? '#A1A1A1' : '#6B7280',
                      fontSize: wp('3.5%'), // 13-14px
                    }
                  ]}>
                    {(() => {
                      const m = moment(displayDate);
                      if (m.hours() === 0 && m.minutes() === 0 && m.seconds() === 0) {
                        return m.format("MMM D, YYYY") + " (All Day)";
                      } else {
                        return m.format("MMM D, YYYY [at] hh:mm A");
                      }
                    })()}
                  </Text>
                  {event.recurrence && event.recurrence !== RECURRENCE_TYPES.NONE && (
                    <Text style={[
                      styles.date,
                      {
                        color: isDark ? '#6B7280' : '#9CA3AF',
                        fontSize: wp('3%'),
                        marginLeft: wp('1%'),
                      }
                    ]}>
                      ↻ {event.recurrence === RECURRENCE_TYPES.DAILY ? t('countdown.recurrenceDaily') : event.recurrence === RECURRENCE_TYPES.WEEKLY ? t('countdown.recurrenceWeekly') : event.recurrence === RECURRENCE_TYPES.MONTHLY ? t('countdown.recurrenceMonthly') : event.recurrence === RECURRENCE_TYPES.YEARLY ? t('countdown.recurrenceYearly') : ''}
                    </Text>
                  )}
                </View>
              </View>
            </View>
            {/* Action buttons */}
            <View style={styles.actionsTopRight}>
              {!isPastEvent && (
                <Pressable
                  onPressIn={handleEditPressIn}
                  onPressOut={handleEditPressOut}
                  onPress={handleOpenEditModal}
                >
                  <Animated.View style={[
                    styles.actionButton,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      transform: [{ scale: editButtonScale }],
                    }
                  ]}>
                    <Ionicons 
                      name="pencil" 
                      size={wp('4.5%')} // 16-18px
                      color={isDark ? '#FFFFFF' : '#6B7280'} 
                    />
                  </Animated.View>
                </Pressable>
              )}
              <Pressable
                onPressIn={handleDeletePressIn}
                onPressOut={handleDeletePressOut}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setDeleteModalVisible(true);
                }}
              >
                <Animated.View style={[
                  styles.actionButton,
                  {
                    backgroundColor: isDark 
                      ? 'rgba(231,76,60,0.15)' 
                      : 'rgba(231,76,60,0.1)',
                    transform: [{ scale: deleteButtonScale }],
                  }
                ]}>
                  <Ionicons 
                    name="trash" 
                    size={wp('4.5%')} // 16-18px
                    color="#E74C3C" 
                  />
                </Animated.View>
              </Pressable>
            </View>
          </View>
          
          {/* Progress Bar */}
          <View style={[
            styles.progressBarBackground,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              marginHorizontal: wp('4%'),
              marginTop: wp('3%'),
              marginBottom: wp('1%'),
              height: 3, // 3-4px for sleeker profile
              borderRadius: 1.5,
              overflow: 'hidden',
            }
          ]}>
            <Animated.View style={[
              styles.progressBarFill,
              {
                height: 3,
                borderRadius: 1.5,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: accentColor,
              }
            ]} />
          </View>
          <Text style={[
            styles.progressText,
            {
              color: isDark ? '#A1A1A1' : '#6B7280',
              fontSize: wp('3%'),
              marginLeft: wp('4%'),
              marginBottom: wp('2%'),
            }
          ]}>
            {progress === 0
              ? t('countdown.justStarted')
              : `${Math.round(progress * 100)}% of the way there`}
          </Text>
        </Animated.View>
      </Pressable>

      {/* Details Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={[
          styles.modalOverlay,
          { backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)' }
        ]}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setDetailsModalVisible(false)}
          >
            <View style={styles.modalBackdropInner} />
          </Pressable>
          <Animated.View style={[
            styles.detailsModalContent,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              transform: [{ scale: modalScale }],
            }
          ]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.detailsModalScrollContent}
            >
              {/* Header */}
              <View style={styles.detailsHeader}>
                <View style={[
                  styles.detailsIconContainer,
                  {
                    backgroundColor: isDark 
                      ? 'rgba(78,158,255,0.15)' 
                      : 'rgba(78,158,255,0.1)',
                  }
                ]}>
                  <Text style={[styles.detailsIcon, { fontSize: wp('10%') }]}>
                    {event.icon}
                  </Text>
                </View>
                <Text style={[
                  styles.detailsTitle,
                  { color: isDark ? '#FFFFFF' : '#1A1A1A' }
                ]}>
                  {event.name}
                </Text>
                <TouchableOpacity
                  onPress={() => setDetailsModalVisible(false)}
                  style={styles.detailsCloseButton}
                >
                  <Ionicons
                    name="close"
                    size={wp('5%')}
                    color={isDark ? '#A1A1A1' : '#6B7280'}
                  />
                </TouchableOpacity>
              </View>

              {/* Date & Time */}
              <View style={styles.detailsSection}>
                <View style={styles.detailsRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={wp('4.5%')}
                    color={isDark ? '#6B7280' : '#9CA3AF'}
                  />
                  <Text style={[
                    styles.detailsLabel,
                    { color: isDark ? '#A1A1A1' : '#6B7280' }
                  ]}>
                    {t('countdown.dateTime')}
                  </Text>
                </View>
                <Text style={[
                  styles.detailsValue,
                  { color: isDark ? '#FFFFFF' : '#1A1A1A' }
                ]}>
                  {(() => {
                    const m = moment(displayDate);
                    if (m.hours() === 0 && m.minutes() === 0 && m.seconds() === 0) {
                      return m.format("MMMM D, YYYY") + " (All Day)";
                    } else {
                      return m.format("MMMM D, YYYY [at] h:mm A");
                    }
                  })()}
                </Text>
                {event.recurrence && event.recurrence !== RECURRENCE_TYPES.NONE && (
                  <Text style={[
                    styles.detailsValue,
                    { 
                      color: isDark ? '#6B7280' : '#9CA3AF',
                      fontSize: wp('3.5%'),
                      marginTop: wp('1%'),
                    }
                  ]}>
                    ↻ {getRecurrenceLabel(event.recurrence)}
                  </Text>
                )}
              </View>

              {/* Countdown */}
              <View style={styles.detailsSection}>
                <View style={styles.detailsRow}>
                  <Ionicons
                    name="time-outline"
                    size={wp('4.5%')}
                    color={isDark ? '#6B7280' : '#9CA3AF'}
                  />
                  <Text style={[
                    styles.detailsLabel,
                    { color: isDark ? '#A1A1A1' : '#6B7280' }
                  ]}>
                    {t('countdown.timeRemaining')}
                  </Text>
                </View>
                {timeLeft === null ? (
                  <Text style={[
                    styles.detailsValue,
                    { color: theme.colors.error }
                  ]}>
                    {t('countdown.expired')}
                  </Text>
                ) : (
                  <>
                    <Text style={[
                      styles.detailsCountdown,
                      { color: accentColor }
                    ]}>
                      {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
                    </Text>
                    <Text style={[
                      styles.detailsHumanized,
                      { color: isDark ? '#6B7280' : '#9CA3AF', marginLeft: wp('6.5%'), marginTop: wp('1%') }
                    ]}>
                      {timeLeft.days === 0 
                        ? t('countdown.endsToday')
                        : timeLeft.days === 1
                        ? t('countdown.endsTomorrow')
                        : t('countdown.endsIn', { count: timeLeft.days })}
                    </Text>
                  </>
                )}
              </View>

              {/* Progress Bar */}
              {timeLeft !== null && (
                <View style={styles.detailsSection}>
                  <View style={[
                    styles.progressBarContainer,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    }
                  ]}>
                    <Animated.View
                      style={[
                        styles.progressBarFill,
                        {
                          width: progressAnim.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%'],
                          }),
                          backgroundColor: accentColor,
                        }
                      ]}
                    />
                  </View>
                </View>
              )}

              {/* Notes Section - Always visible */}
              <View style={styles.detailsSection}>
                <View style={styles.detailsRow}>
                  <Ionicons
                    name="document-text-outline"
                    size={wp('4.5%')}
                    color={isDark ? '#6B7280' : '#9CA3AF'}
                  />
                  <Text style={[
                    styles.detailsLabel,
                    { color: isDark ? '#A1A1A1' : '#6B7280' }
                  ]}>
                    {t('countdown.notes')}
                  </Text>
                </View>
                {event.notes && event.notes.trim() ? (
                  <>
                    <View style={[
                      styles.detailsNotesContainer,
                      {
                        backgroundColor: isDark ? '#2A2A2A' : '#F9FAFB',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                      }
                    ]}>
                      <Text 
                        style={[
                          styles.detailsNotesText,
                          { color: isDark ? '#F5F5F5' : '#111111' }
                        ]}
                        numberOfLines={3}
                      >
                        {event.notes}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setDetailsModalVisible(false);
                        setTimeout(() => handleOpenEditModal(), 300);
                      }}
                      style={styles.viewEditButton}
                    >
                      <Text style={[
                        styles.viewEditText,
                        { color: accentColor }
                      ]}>
                        {t('countdown.viewEdit')}
                      </Text>
                    </TouchableOpacity>
                    {!isPro && event.notes.length >= 80 && (
                      <TouchableOpacity
                        onPress={() => {
                          setPaywallVisible(true);
                        }}
                        style={styles.notesUpsellLink}
                      >
                        <Text style={[
                          styles.notesUpsellLinkText,
                          { color: isDark ? '#6B7280' : '#9CA3AF' }
                        ]}>
                          Upgrade for longer notes
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      setDetailsModalVisible(false);
                      setTimeout(() => handleOpenEditModal(), 300);
                    }}
                    style={[
                      styles.addNoteButton,
                      {
                        backgroundColor: isDark ? '#2A2A2A' : '#F9FAFB',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                      }
                    ]}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={wp('4%')}
                      color={isDark ? '#6B7280' : '#9CA3AF'}
                    />
                    <Text style={[
                      styles.addNoteText,
                      { color: isDark ? '#6B7280' : '#9CA3AF' }
                    ]}>
                      {t('common.addNote')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Reminders Section */}
              <View style={styles.detailsSection}>
                <View style={styles.detailsRow}>
                  <Ionicons
                    name="notifications-outline"
                    size={wp('4.5%')}
                    color={isDark ? '#6B7280' : '#9CA3AF'}
                  />
                  <Text style={[
                    styles.detailsLabel,
                    { color: isDark ? '#A1A1A1' : '#6B7280' }
                  ]}>
                    {t('countdown.reminders')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setReminderExplainerVisible(true);
                    }}
                    style={styles.infoButton}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={wp('4%')}
                      color={isDark ? '#6B7280' : '#9CA3AF'}
                    />
                  </TouchableOpacity>
                </View>
                {event.reminderPlan?.preset ? (
                  <Text style={[
                    styles.detailsValue,
                    { color: isDark ? '#FFFFFF' : '#1A1A1A', marginLeft: wp('6.5%') }
                  ]}>
                    {(() => {
                      const preset = event.reminderPlan?.preset || 'off';
                      if (preset === 'off') {
                        return t('countdown.noNotificationsScheduled');
                      }
                      const presetKey = `reminders.preset${preset.charAt(0).toUpperCase() + preset.slice(1)}`;
                      return t(presetKey);
                    })()}
                  </Text>
                ) : event.reminders && event.reminders.length > 0 ? (
                  <Text style={[
                    styles.detailsValue,
                    { color: isDark ? '#FFFFFF' : '#1A1A1A', marginLeft: wp('6.5%') }
                  ]}>
                    {event.reminders.length} reminder{event.reminders.length > 1 ? 's' : ''} set
                  </Text>
                ) : (
                  <Text style={[
                    styles.detailsValue,
                    { 
                      color: isDark ? '#6B7280' : '#9CA3AF',
                      fontStyle: 'italic',
                      marginLeft: wp('6.5%')
                    }
                  ]}>
                    No reminders set
                  </Text>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.detailsActions}>
                <TouchableOpacity
                  onPress={() => {
                    setDetailsModalVisible(false);
                    setTimeout(() => handleOpenEditModal(), 300);
                  }}
                  style={[
                    styles.detailsActionButton,
                    {
                      backgroundColor: isDark ? 'rgba(78,158,255,0.15)' : 'rgba(78,158,255,0.1)',
                      borderColor: isDark ? 'rgba(78,158,255,0.3)' : 'rgba(78,158,255,0.2)',
                    }
                  ]}
                >
                  <Ionicons
                    name="create-outline"
                    size={wp('4.5%')}
                    color={accentColor}
                  />
                  <Text style={[
                    styles.detailsActionText,
                    { color: accentColor }
                  ]}>
                    {t('common.edit')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setDetailsModalVisible(false);
                    setTimeout(() => setDeleteModalVisible(true), 300);
                  }}
                  style={[
                    styles.detailsActionButton,
                    {
                      backgroundColor: isDark ? 'rgba(225,87,71,0.1)' : 'rgba(225,87,71,0.05)',
                      borderColor: isDark ? 'rgba(225,87,71,0.3)' : 'rgba(225,87,71,0.2)',
                    }
                  ]}
                >
                  <Ionicons
                    name="trash-outline"
                    size={wp('4.5%')}
                    color={clearButtonColor}
                  />
                  <Text style={[
                    styles.detailsActionText,
                    { color: clearButtonColor }
                  ]}>
                    {t('common.delete')}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Reminder Preset Explainer */}
      <ReminderPresetExplainer
        visible={reminderExplainerVisible}
        onClose={() => setReminderExplainerVisible(false)}
      />

      {/* Confirmation Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('countdown.deleteTitle')}</Text>
            <Text style={styles.modalMessage}>
              {t('countdown.deleteMessage', { name: event.name })}
            </Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#444" }]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#66FCF1" }]}
                onPress={() => {
                  onDelete(event.id);
                  setDeleteModalVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>{t('common.delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              if (iconPickerVisible || calendarModalVisible || timePickerVisible) return;
              setEditModalVisible(false);
            }}
            style={[
              styles.modalContainer,
              { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.25)' }
            ]}
          >
            <Animated.View style={[
              styles.modalContent,
              {
                backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
                transform: [{ scale: modalScale }],
              }
            ]}>
              {/* Icon Picker Overlay - Inside edit modal */}
              {iconPickerVisible && (
                <View style={[
                  styles.iconPickerOverlay,
                  {
                    backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                  }
                ]}>
                  <Pressable
                    style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => setIconPickerVisible(false)}
                  >
                    <Pressable onPress={(e) => e.stopPropagation()}>
                      <Animated.View style={[
                        {
                          width: '100%',
                          maxWidth: wp('90%'),
                          maxHeight: hp('75%'),
                          borderRadius: wp('5%'),
                          paddingHorizontal: wp('5%'),
                          paddingTop: wp('6%'),
                          paddingBottom: wp('6%'),
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 1,
                          shadowRadius: 16,
                          elevation: 8,
                          backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                          shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)',
                          transform: [{ scale: iconModalScale }],
                        }
                      ]}>
                        <Text style={[
                          {
                            fontSize: wp('4.5%'),
                            fontWeight: '600',
                            fontFamily: 'System',
                            textAlign: 'center',
                            marginBottom: wp('4%'),
                            color: isDark ? '#F3F4F6' : '#111111',
                          }
                        ]}>{t('create.selectIcon')}</Text>
                        <View style={[
                          {
                            height: 1,
                            marginBottom: wp('3%'),
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
                          }
                        ]} />
                        <ScrollView 
                          style={{ maxHeight: hp('55%') }}
                          contentContainerStyle={{ paddingBottom: wp('5%') }}
                          showsVerticalScrollIndicator={false}
                          bounces={true}
                        >
                          <View style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            justifyContent: "flex-start",
                            gap: wp('2.5%'),
                          }}>
                            {eventIcons.map((icon, index) => (
                              <IconItem
                                key={`${icon}-${index}`}
                                icon={icon}
                                isSelected={editIcon === icon}
                                isDark={isDark}
                                onPress={() => {
                                  setEditIcon(icon);
                                  setIconPickerVisible(false);
                                }}
                              />
                            ))}
                          </View>
                        </ScrollView>
                        <TouchableOpacity
                          onPress={() => {
                            setIconPickerVisible(false);
                          }}
                          style={{
                            backgroundColor: isDark ? '#2E2E2E' : '#F3F4F6',
                            height: 48,
                            borderRadius: wp('3%'),
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            marginTop: wp('2%'),
                          }}
                        >
                          <Text 
                            allowFontScaling={false}
                            style={{
                              color: isDark ? '#FFFFFF' : '#000000',
                              fontSize: 16,
                              fontWeight: '600',
                              textAlign: 'center',
                            }}
                          >
                            {t('common.cancel')}
                          </Text>
                        </TouchableOpacity>
                      </Animated.View>
                    </Pressable>
                  </Pressable>
                </View>
              )}
              <ScrollView 
                style={styles.modalFormScroll}
                contentContainerStyle={styles.modalFormContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={true}
                nestedScrollEnabled={true}
                bounces={true}
              >
              <Text style={[
                styles.modalTitle,
                { color: isDark ? '#F5F5F5' : '#111111' }
              ]}>{t('edit.title')}</Text>
              
              {/* Countdown Name Input */}
              <View style={styles.modalSection}>
                <Text style={[
                  styles.modalSectionLabel,
                  { color: isDark ? '#A1A1A1' : '#6B7280' }
                ]}>Name</Text>
              <TextInput
                placeholder={t('edit.namePlaceholder')}
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                value={editName}
                onChangeText={setEditName}
                onFocus={() => setInputFocused({ name: true })}
                onBlur={() => setInputFocused({ name: false })}
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#2B2B2B' : '#F9FAFB',
                    borderColor: inputFocused.name 
                      ? (isDark ? '#4E9EFF' : '#4A9EFF')
                      : (isDark ? 'rgba(255,255,255,0.05)' : '#E5E7EB'),
                    color: isDark ? '#F5F5F5' : '#111111',
                    marginBottom: wp('4%'),
                  }
                ]}
              />
              </View>

              {/* Date Section */}
              <View style={styles.modalSection}>
                <Text style={[
                  styles.modalSectionLabel,
                  { color: isDark ? '#A1A1A1' : '#6B7280' }
                ]}>Date</Text>
            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  backgroundColor: isDark ? '#2B2B2B' : '#F9FAFB',
                  borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E5E7EB',
                }
              ]}
              onPress={() => setCalendarModalVisible(true)}
            >
              <Text style={[
                styles.iconButtonText,
                { color: isDark ? '#F5F5F5' : '#111111' }
              ]}>
                {moment(selectedDate).format("ddd, D MMM YYYY")}
              </Text>
            </TouchableOpacity>
              </View>

            {/* Calendar Modal */}
            <Modal
              animationType="fade"
              transparent
              visible={calendarModalVisible}
              onRequestClose={() => {
                setCalendarModalVisible(false);
              }}
            >
              <View style={[
                styles.modalContainer,
                { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.25)' }
              ]}>
                <Animated.View style={[
                  styles.calendarModalContent,
                  {
                    backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                    shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
                    transform: [{ scale: modalScale }],
                  }
                ]}>
                  <Text style={[
                    styles.modalTitle,
                    { color: isDark ? '#F5F5F5' : '#111111' }
                  ]}>Select a Date</Text>
                  <Calendar
                    key={theme.name}
                    style={styles.calendar}
                    onDayPress={handleDayPress}
                    minDate={moment().format("YYYY-MM-DD")}
                    theme={{
                      backgroundColor: 'transparent',
                      calendarBackground: 'transparent',
                      textSectionTitleColor: isDark ? '#A1A1A1' : '#6B7280',
                      dayTextColor: isDark ? '#F5F5F5' : '#111111',
                      todayTextColor: '#4E9EFF',
                      monthTextColor: isDark ? '#A1A1A1' : '#6B7280',
                      arrowColor: '#4E9EFF',
                      selectedDayBackgroundColor: isDark ? '#3CC4A2' : '#4E9EFF',
                      selectedDayTextColor: '#FFFFFF',
                      textDisabledColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                      dotColor: '#4E9EFF',
                      selectedDotColor: '#FFFFFF',
                      "stylesheet.calendar.header": {
                        week: {
                          marginTop: wp('2%'),
                          marginBottom: wp('1%'),
                          flexDirection: "row",
                          justifyContent: "space-between",
                        },
                      },
                    }}
                  />
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={[
                        styles.button,
                        {
                          backgroundColor: isDark ? '#2E2E2E' : '#F3F4F6',
                        }
                      ]}
                      onPress={() => setCalendarModalVisible(false)}
                    >
                      <Text style={[
                        styles.buttonText,
                        { color: isDark ? '#E5E7EB' : '#111111' }
                      ]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.button,
                        {
                          backgroundColor: isDark ? '#3CC4A2' : '#4E9EFF',
                          shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 1,
                          shadowRadius: 4,
                          elevation: 3,
                        }
                      ]}
                      onPress={handleConfirmDate}
                    >
                      <Text style={styles.buttonTextSave}>{t('common.confirm')}</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </View>
            </Modal>

            {/* Time Section */}
            <View style={styles.modalSection}>
              <Text style={[
                styles.modalSectionLabel,
                { color: isDark ? '#A1A1A1' : '#6B7280' }
              ]}>Time</Text>
            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  backgroundColor: isDark ? '#2B2B2B' : '#F9FAFB',
                  borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E5E7EB',
                }
              ]}
              onPress={() => setTimePickerVisible(true)}
            >
              <Text style={[
                styles.iconButtonText,
                { color: isDark ? '#F5F5F5' : '#111111' }
              ]}>
                {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}
              </Text>
            </TouchableOpacity>
              </View>

            {/* Time Picker Modal */}
            <Modal
              animationType="fade"
              transparent
              visible={timePickerVisible}
              onRequestClose={() => setTimePickerVisible(false)}
            >
              <View style={[styles.timePickerOverlay, { backgroundColor: theme.colors.modalOverlay }]}>
                <View style={[styles.timePickerContent, { backgroundColor: theme.colors.modalBackground, borderColor: theme.colors.border }]}>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Time</Text>
                  {Picker ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                      <Picker
                        selectedValue={selectedHour}
                        style={{ width: wp('25%') }}
                        onValueChange={(itemValue) => setSelectedHour(itemValue)}
                      >
                        {[...Array(24).keys()].map((h) => (
                          <Picker.Item key={h} label={h.toString().padStart(2, '0')} value={h} />
                        ))}
                      </Picker>
                      <Text style={{ fontSize: wp('6%'), marginHorizontal: wp('2%') }}>:</Text>
                      <Picker
                        selectedValue={selectedMinute}
                        style={{ width: wp('25%') }}
                        onValueChange={(itemValue) => setSelectedMinute(itemValue)}
                      >
                        {[...Array(60).keys()].map((m) => (
                          <Picker.Item key={m} label={m.toString().padStart(2, '0')} value={m} />
                        ))}
                      </Picker>
                    </View>
                  ) : (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Text style={{ color: theme.colors.text }}>Loading time picker...</Text>
                    </View>
                  )}
                  <View style={styles.timePickerButtonContainer}>
                    <TouchableOpacity
                      style={[styles.button, { backgroundColor: theme.colors.border }]}
                      onPress={() => setTimePickerVisible(false)}
                    >
                      <Text style={[styles.buttonText, { color: theme.colors.text }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, { backgroundColor: theme.colors.primary }]}
                      onPress={() => setTimePickerVisible(false)}
                    >
                      <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

              {/* Icon Section */}
              <View style={styles.modalSection}>
                <Text style={[
                  styles.modalSectionLabel,
                  { color: isDark ? '#A1A1A1' : '#6B7280' }
                ]}>{t('countdown.icon')}</Text>
                <TouchableOpacity
                  onPress={() => setIconPickerVisible(true)}
                  style={[
                    styles.iconButton,
                    {
                      backgroundColor: isDark ? '#2B2B2B' : '#F9FAFB',
                      borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E5E7EB',
                    }
                  ]}
                >
                  <Text style={[
                    styles.iconButtonText,
                    { color: isDark ? '#F5F5F5' : '#111111' }
                  ]}>
                    {editIcon ? `${t('countdown.iconLabel')} ${editIcon}` : t('edit.selectIcon')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Notes Section */}
              <View style={styles.modalSection}>
              <View style={styles.notesHeader}>
                <Ionicons
                  name="document-text-outline"
                  size={wp('4%')}
                  color={isDark ? '#6B7280' : '#9CA3AF'}
                  style={styles.notesIcon}
                />
                <Text style={[
                  styles.iconLabel,
                  { color: isDark ? '#A1A1A1' : '#6B7280' }
                ]}>{t('countdown.notesOptional')}</Text>
              </View>
              <TextInput
                placeholder={t('countdown.notesPlaceholder')}
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                value={editNotes}
                onChangeText={(text) => {
                  const maxLength = isPro ? 5000 : 100;
                  if (text.length <= maxLength) {
                    setEditNotes(text);
                  }
                }}
                editable={true}
                multiline
                textAlignVertical="top"
                maxLength={isPro ? 5000 : 100}
                style={[
                  styles.notesInput,
                  {
                    backgroundColor: isDark ? '#2B2B2B' : '#F9FAFB',
                    borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E5E7EB',
                    color: isDark ? '#F5F5F5' : '#111111',
                  }
                ]}
              />
              <View style={styles.notesCounterContainer}>
                <Text style={[
                  styles.notesCharCount,
                  { 
                    color: (!isPro && editNotes.length >= 100) 
                      ? (isDark ? '#E74C3C' : '#DC2626')
                      : (isDark ? '#6B7280' : '#9CA3AF')
                  }
                ]}>
                  {editNotes.length}/{isPro ? 5000 : 100}
                </Text>
                {!isPro && (
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setPaywallFeature(t('countdown.longNotes'));
                      setPaywallVisible(true);
                    }}
                    activeOpacity={0.7}
                    style={styles.notesUpsellRow}
                  >
                    <Text style={[
                      styles.notesUpsellText,
                      { color: isDark ? '#6B7280' : '#9CA3AF' }
                    ]}>
                      {t('countdown.upgradeNotes')}
                    </Text>
                    <Ionicons
                      name="lock-closed"
                      size={wp('3%')}
                      color={isDark ? '#6B7280' : '#9CA3AF'}
                      style={{ marginLeft: wp('1%') }}
                    />
                  </TouchableOpacity>
                )}
                {isPro && (
                  <View style={styles.proEnabledRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={wp('3%')}
                      color={isDark ? 'rgba(60,196,162,0.5)' : 'rgba(78,158,255,0.5)'}
                    />
                    <Text style={[
                      styles.proEnabledText,
                      { color: isDark ? 'rgba(60,196,162,0.5)' : 'rgba(78,158,255,0.5)' }
                    ]}>
                      {t('countdown.proEnabled')}
                    </Text>
                  </View>
                )}
              </View>
            </View>

              {/* Reminders Section */}
              <View style={styles.modalSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: wp('1%') }}>
                  <Text style={[
                    styles.modalSectionLabel,
                    { color: isDark ? '#A1A1A1' : '#6B7280' }
                  ]}>{t('countdown.reminders')}</Text>
                  {(editReminderPreset === 'standard' || editReminderPreset === 'intense') && (
                    <View style={{ marginLeft: wp('2%') }}>
                      <ProBadge size="small" />
                    </View>
                  )}
                </View>
                
                <Text style={[
                  styles.modalSectionSubLabel,
                  { color: isDark ? '#6B7280' : '#9CA3AF' }
                ]}>{t('countdown.notifyMe')}</Text>
                
                {/* Preset Buttons - 2x2 Grid */}
                <View style={styles.reminderButtonsGrid}>
                  {['off', 'simple', 'standard', 'intense'].map((preset) => {
                    const isProPreset = isPresetPro(preset);
                    const isLocked = !isPro && isProPreset;
                    const isActive = editReminderPreset === preset;

                    return (
                      <TouchableOpacity
                        key={preset}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          if (isLocked) {
                            setPaywallFeature('reminders_presets');
                            setPaywallVisible(true);
                            return;
                          }
                          setEditReminderPreset(preset);
                        }}
                        style={[
                          styles.reminderButton,
                          {
                            backgroundColor: isActive
                              ? (isDark ? 'rgba(78,158,255,0.2)' : 'rgba(78,158,255,0.15)')
                              : (isDark ? '#2B2B2B' : '#F9FAFB'),
                            borderColor: isActive
                              ? (isDark ? '#4E9EFF' : '#4A9EFF')
                              : (isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB'),
                            borderWidth: isActive ? 2 : 1,
                            opacity: isLocked ? 0.6 : 1,
                          }
                        ]}
                      >
                        <View style={styles.reminderButtonContent}>
                          <Text style={[
                            styles.reminderButtonLabel,
                            {
                              color: isActive
                                ? (isDark ? '#4E9EFF' : '#4A9EFF')
                                : (isDark ? '#F5F5F5' : '#111111'),
                              fontWeight: isActive ? '600' : '500',
                            }
                          ]}>
                            {t(`reminders.preset${preset.charAt(0).toUpperCase() + preset.slice(1)}Label`)}
                          </Text>
                          {isLocked && (
                            <Ionicons
                              name="lock-closed"
                              size={wp('3%')}
                              color={isDark ? '#6B7280' : '#9CA3AF'}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                
                {/* Description */}
                <View style={{ marginTop: wp('2%'), marginBottom: wp('1%') }}>
                  <Text style={[
                    styles.reminderDescription,
                    { color: isDark ? '#A1A1A1' : '#6B7280' }
                  ]}>
                    {(() => {
                      if (!editReminderPreset || editReminderPreset === 'off') {
                        return t('countdown.noNotificationsScheduled');
                      }
                      const presetKey = `reminders.preset${editReminderPreset.charAt(0).toUpperCase() + editReminderPreset.slice(1)}`;
                      return t(presetKey) || t('countdown.remindersEnabled');
                    })()}
                  </Text>
                </View>
              </View>

              {/* Recurrence Section */}
              <View style={styles.modalSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[
                    styles.modalSectionLabel,
                    { color: isDark ? '#A1A1A1' : '#6B7280' }
                  ]}>{t('countdown.repeats')}</Text>
                  {editRecurrence !== RECURRENCE_TYPES.NONE && (
                    <View style={{ marginLeft: wp('2%') }}>
                      <ProBadge size="small" />
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (!isPro) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setPaywallFeature('recurring_countdowns');
                      setPaywallVisible(true);
                      return;
                    }
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setRecurrencePickerVisible(true);
                  }}
                  style={[
                    styles.iconButton,
                    {
                      backgroundColor: isDark ? '#2B2B2B' : '#F9FAFB',
                      borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E5E7EB',
                      opacity: !isPro ? 0.6 : 1,
                    }
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Text style={[
                      styles.iconButtonText,
                      { color: isDark ? '#F5F5F5' : '#111111' }
                    ]}>
                      {editRecurrence === RECURRENCE_TYPES.NONE ? t('countdown.recurrenceNone') : getRecurrenceLabel(editRecurrence)}
                    </Text>
                    {!isPro && (
                      <Ionicons
                        name="lock-closed"
                        size={wp('3%')}
                        color={isDark ? '#6B7280' : '#9CA3AF'}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {/* Recurrence Picker Modal */}
              <Modal
                animationType="slide"
                transparent
                visible={recurrencePickerVisible}
                onRequestClose={() => setRecurrencePickerVisible(false)}
              >
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => setRecurrencePickerVisible(false)}
                  style={[
                    styles.modalContainer,
                    { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.25)' }
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                    style={[
                      styles.recurrencePickerContent,
                      {
                        backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                        shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
                      }
                    ]}
                  >
                    <Text style={[
                      styles.modalTitle,
                      { color: isDark ? '#F5F5F5' : '#111111' }
                    ]}>Select Recurrence</Text>
                    <ScrollView>
                      {Object.values(RECURRENCE_TYPES).map((type) => (
                        <TouchableOpacity
                          key={type}
                          onPress={() => {
                            setEditRecurrence(type);
                            setRecurrencePickerVisible(false);
                          }}
                          style={[
                            styles.recurrenceOption,
                            {
                              backgroundColor: editRecurrence === type
                                ? (isDark ? 'rgba(78,158,255,0.2)' : 'rgba(78,158,255,0.15)')
                                : 'transparent',
                              borderColor: editRecurrence === type
                                ? (isDark ? '#4E9EFF' : '#4A9EFF')
                                : 'transparent',
                            }
                          ]}
                        >
                          <Text style={[
                            styles.recurrenceOptionText,
                            {
                              color: editRecurrence === type
                                ? (isDark ? '#4E9EFF' : '#4A9EFF')
                                : (isDark ? '#F5F5F5' : '#111111'),
                              fontWeight: editRecurrence === type ? '600' : '400',
                            }
                          ]}>
                            {type === RECURRENCE_TYPES.NONE ? t('countdown.recurrenceNone') : getRecurrenceLabel(type)}
                          </Text>
                          {editRecurrence === type && (
                            <Ionicons
                              name="checkmark"
                              size={wp('4%')}
                              color={isDark ? '#4E9EFF' : '#4A9EFF'}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <TouchableOpacity
                      onPress={() => setRecurrencePickerVisible(false)}
                      style={[
                        styles.button,
                        {
                          backgroundColor: isDark ? '#2E2E2E' : '#F3F4F6',
                          marginTop: wp('2%'),
                        }
                      ]}
                    >
                      <Text style={[
                        styles.buttonText,
                        { color: isDark ? '#E5E7EB' : '#111111' }
                      ]}>Cancel</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Modal>

              {/* Footer Buttons */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setEditModalVisible(false);
                  }}
                  style={[
                    styles.modalFooterButton,
                    styles.modalFooterButtonSecondary,
                    {
                      backgroundColor: isDark ? '#2E2E2E' : '#F3F4F6',
                    }
                  ]}
                >
                  <Text style={[
                    styles.modalFooterButtonText,
                    { color: isDark ? '#E5E7EB' : '#111111' }
                  ]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveEdit}
                  disabled={!editName.trim()}
                  style={[
                    styles.modalFooterButton,
                    styles.modalFooterButtonPrimary,
                    {
                      backgroundColor: !editName.trim()
                        ? (isDark ? '#2A2A2A' : '#E5E7EB')
                        : (isDark ? '#3CC4A2' : '#4E9EFF'),
                      opacity: !editName.trim() ? 0.5 : 1,
                    }
                  ]}
                >
                  <Text style={[
                    styles.modalFooterButtonText,
                    { color: !editName.trim() 
                      ? (isDark ? '#6B7280' : '#9CA3AF')
                      : '#FFFFFF'
                    }
                  ]}>{t('common.save')}</Text>
                </TouchableOpacity>
              </View>
              </ScrollView>
            </Animated.View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Calendar Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={calendarModalVisible}
        onRequestClose={() => {
          setCalendarModalVisible(false);
        }}
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            <Text style={styles.modalTitle}>Select a Date</Text>
            <Calendar
              key={theme.name}
              style={styles.calendar}
              onDayPress={handleDayPress}
              minDate={moment().format("YYYY-MM-DD")}
              markedDates={{
                [moment(selectedDate).format("YYYY-MM-DD")]: {
                  selected: true,
                  selectedColor: theme.colors.primary,
                },
                ...(tempSelectedDate && {
                  [tempSelectedDate]: {
                    selected: true,
                    selectedColor: theme.colors.success,
                  },
                }),
              }}
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
            <View style={styles.calendarButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#444" }]}
                onPress={() => {
                  setCalendarModalVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#66FCF1" }]}
                onPress={() => {
                  handleConfirmDate();
                  setCalendarModalVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={timePickerVisible}
        onRequestClose={() => {
          setTimePickerVisible(false);
        }}
      >
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerContent}>
            <Text style={styles.modalTitle}>Select Time</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
              <Picker
                selectedValue={selectedHour}
                style={{ width: wp('25%') }}
                onValueChange={(itemValue) => setSelectedHour(itemValue)}
              >
                {[...Array(24).keys()].map((h) => (
                  <Picker.Item key={h} label={h.toString().padStart(2, '0')} value={h} />
                ))}
              </Picker>
              <Text style={{ fontSize: wp('6%'), marginHorizontal: wp('2%') }}>:</Text>
              <Picker
                selectedValue={selectedMinute}
                style={{ width: wp('25%') }}
                onValueChange={(itemValue) => setSelectedMinute(itemValue)}
              >
                {[...Array(60).keys()].map((m) => (
                  <Picker.Item key={m} label={m.toString().padStart(2, '0')} value={m} />
                ))}
              </Picker>
            </View>
            <View style={styles.timePickerButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#444" }]}
                onPress={() => {
                  setTimePickerVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#66FCF1" }]}
                onPress={() => {
                  setTimePickerVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* Paywall Sheet */}
      <PaywallSheet
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        feature={paywallFeature}
      />
    </>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: wp('4%'), // ~16px spacing between cards (reduced from ~24px)
    marginHorizontal: wp('4%'),
    borderRadius: wp('3.5%'),
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: wp('4.5%'), // 16-18px internal padding
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: wp('2%'),
  },
  icon: {
    fontSize: wp("6.5%"),
  },
  iconContainer: {
    width: wp('12%'),
    height: wp('12%'),
    alignItems: "center",
    justifyContent: "center",
    marginRight: wp('3.5%'),
  },
  textContainer: {
    justifyContent: "center",
    flex: 1,
  },
  title: {
    fontWeight: "600", // Semibold
    fontFamily: "System",
    marginBottom: wp('0.75%'),
  },
  date: {
    fontWeight: "500",
    fontFamily: "System",
    marginTop: wp('0.5%'),
    lineHeight: wp('4.5%'),
  },
  notesPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: wp('0.5%'),
  },
  notesPreview: {
    fontSize: wp('3%'),
    fontWeight: '400',
    fontFamily: 'System',
    fontStyle: 'italic',
    flex: 1,
  },
  countdownText: {
    fontWeight: "600",
    fontFamily: "System",
    marginBottom: wp('0.5%'),
  },
  expiredText: {
    fontWeight: "600",
    fontFamily: "System",
    marginBottom: wp('0.5%'),
  },
  actionsTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
  },
  actionButton: {
    width: wp('8%'), // 32px circular container
    height: wp('8%'),
    borderRadius: wp('4%'),
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp("5%"),
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp("5%"),
  },
  modalContent: {
    width: '100%',
    maxWidth: wp('90%'),
    maxHeight: hp('75%'),
    borderRadius: wp('4%'), // 16px
    paddingHorizontal: wp('4%'),
    paddingTop: wp('3.5%'),
    paddingBottom: wp('2.5%'),
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: wp('4.25%'), // Even smaller
    fontWeight: '600', // Semibold
    fontFamily: 'System',
    marginBottom: wp('2%'), // Even more reduced
    textAlign: 'center',
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
  progressBarBackground: {
    overflow: 'hidden',
  },
  progressBarFill: {
    // Height and styling applied inline
  },
  progressText: {
    fontWeight: "500",
    fontFamily: "System",
  },
  editModalContent: {
    width: '100%',
    maxWidth: wp('90%'),
    maxHeight: hp('75%'),
    borderRadius: wp('4%'), // 16px
    paddingHorizontal: wp('4%'),
    paddingTop: wp('3.5%'),
    paddingBottom: wp('2.5%'),
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  modalFormScroll: {
    flexShrink: 1,
  },
  modalFormContent: {
    paddingBottom: wp('1%'),
  },
  input: {
    borderWidth: 1,
    borderRadius: wp('2.5%'), // 10px
    height: wp('8.5%'), // Even smaller
    paddingHorizontal: wp('2.5%'), // Slightly less padding
    marginBottom: wp('1.5%'), // Even more reduced
    fontSize: wp('3.5%'), // Slightly smaller
    fontWeight: '600', // Semibold
    fontFamily: 'System',
    width: '100%',
  },
  iconLabel: {
    fontSize: wp('3%'), // Smaller
    fontWeight: '500', // Medium
    fontFamily: 'System',
    marginBottom: wp('0.5%'), // Minimal margin
    marginTop: wp('0%'), // No top margin
    alignSelf: 'flex-start',
  },
  iconButton: {
    borderWidth: 1,
    borderRadius: wp('2.5%'), // 10px
    height: wp('8.5%'), // Even smaller
    paddingHorizontal: wp('2.5%'),
    marginBottom: wp('1.5%'), // Even more reduced
    alignItems: "center",
    justifyContent: "center",
    width: '100%',
  },
  iconButtonText: {
    fontSize: wp('3.5%'), // Slightly smaller
    fontWeight: '600', // Semibold
    fontFamily: 'System',
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: wp('2.5%'), // 8-10px gap
    marginTop: wp('2%'), // Better spacing
    flexShrink: 0, // Prevent shrinking
  },
  button: {
    flex: 1,
    height: wp('10%'), // Better height
    borderRadius: wp('3%'), // 10-12px
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: wp('2.5%'),
    paddingHorizontal: wp('2%'),
  },
  buttonText: {
    fontWeight: "600", // Semibold
    fontSize: wp('4%'), // 15-16px
    fontFamily: "System",
  },
  buttonTextSave: {
    color: "#FFFFFF",
    fontWeight: "600", // Semibold
    fontSize: wp('4%'), // 15-16px
    fontFamily: "System",
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  calendarModalContent: {
    width: wp("90%"),
    backgroundColor: "#FFFFFF",
    borderRadius: wp("2%"),
    padding: wp("4%"),
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  calendar: {
    borderRadius: wp("2%"),
    marginBottom: wp("4%"),
  },
  calendarButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  timePickerContent: {
    width: wp("90%"),
    backgroundColor: "#FFFFFF",
    borderRadius: wp("2%"),
    padding: wp("4%"),
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  timePickerButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconModalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  iconModalContent: {
    margin: wp("4%"),
    backgroundColor: "#FFFFFF",
    borderRadius: wp("2%"),
    padding: wp("4%"),
    elevation: 5,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    maxHeight: '80%',
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
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  iconText: {
    fontSize: wp("3%"),
  },
  notesSection: {
    marginTop: wp('3%'),
    marginBottom: wp('2%'),
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: wp('2%'),
  },
  notesIcon: {
    marginRight: wp('2%'),
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: wp('2.5%'),
    paddingHorizontal: wp('3%'),
    paddingVertical: wp('3%'),
    minHeight: wp('20%'),
    maxHeight: wp('40%'),
    fontSize: wp('3.5%'),
    fontFamily: 'System',
    lineHeight: wp('5%'),
  },
  notesCharCount: {
    fontSize: wp('2.8%'),
    marginTop: wp('1.5%'),
    textAlign: 'right',
    fontFamily: 'System',
  },
  lockedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: wp('2%'),
    padding: wp('2%'),
    borderRadius: wp('2%'),
    backgroundColor: 'rgba(78,158,255,0.05)',
  },
  lockedText: {
    fontSize: wp('3%'),
    marginLeft: wp('2%'),
    fontStyle: 'italic',
    fontFamily: 'System',
  },
  addNotesButton: {
    paddingVertical: wp('2%'),
    paddingHorizontal: wp('3%'),
    borderRadius: wp('2%'),
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: wp('1%'),
  },
  addNotesButtonText: {
    fontSize: wp('3.5%'),
    fontFamily: 'System',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalBackdropInner: {
    flex: 1,
  },
  detailsModalContent: {
    width: '90%',
    maxWidth: wp('90%'),
    maxHeight: hp('85%'),
    borderRadius: wp('4%'),
    padding: wp('5%'),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  detailsModalScrollContent: {
    paddingBottom: wp('2%'),
  },
  detailsHeader: {
    alignItems: 'center',
    marginBottom: wp('5%'),
    position: 'relative',
  },
  detailsIconContainer: {
    width: wp('20%'),
    height: wp('20%'),
    borderRadius: wp('5%'),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: wp('3%'),
  },
  detailsIcon: {
    fontSize: wp('10%'),
  },
  detailsTitle: {
    fontSize: wp('5%'),
    fontWeight: '700',
    fontFamily: 'System',
    textAlign: 'center',
    marginBottom: wp('2%'),
  },
  detailsCloseButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: wp('2%'),
  },
  detailsSection: {
    marginBottom: wp('4%'),
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: wp('2%'),
  },
  detailsLabel: {
    fontSize: wp('3.5%'),
    fontWeight: '600',
    fontFamily: 'System',
    marginLeft: wp('2%'),
  },
  detailsValue: {
    fontSize: wp('4%'),
    fontWeight: '500',
    fontFamily: 'System',
    marginLeft: wp('6.5%'),
  },
  detailsCountdown: {
    fontSize: wp('5%'),
    fontWeight: '700',
    fontFamily: 'System',
    marginLeft: wp('6.5%'),
  },
  detailsNotesContainer: {
    borderRadius: wp('2.5%'),
    padding: wp('4%'),
    borderWidth: 1,
    marginLeft: wp('6.5%'),
    marginTop: wp('1%'),
  },
  detailsNotesText: {
    fontSize: wp('3.5%'),
    fontWeight: '400',
    fontFamily: 'System',
    lineHeight: wp('5%'),
  },
  detailsActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: wp('3%'),
    gap: wp('3%'),
  },
  detailsActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: wp('3.5%'),
    borderRadius: wp('2.5%'),
    borderWidth: 1,
    gap: wp('2%'),
  },
  detailsActionText: {
    fontSize: wp('4%'),
    fontWeight: '600',
    fontFamily: 'System',
  },
  detailsHumanized: {
    fontSize: wp('3%'),
    fontWeight: '400',
    fontFamily: 'System',
    fontStyle: 'italic',
  },
  viewEditButton: {
    marginTop: wp('2%'),
    marginLeft: wp('6.5%'),
  },
  viewEditText: {
    fontSize: wp('3.5%'),
    fontWeight: '600',
    fontFamily: 'System',
  },
  notesUpsellLink: {
    marginTop: wp('1%'),
    marginLeft: wp('6.5%'),
  },
  notesUpsellLinkText: {
    fontSize: wp('3%'),
    fontWeight: '400',
    fontFamily: 'System',
    fontStyle: 'italic',
    textDecorationLine: 'underline',
  },
  /* New detail modal styles */
  detailCloseNew: {
    position: 'absolute',
    top: wp('3%'),
    right: wp('3%'),
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  detailHeaderNew: {
    alignItems: 'center',
    paddingTop: wp('8%'),
    paddingBottom: wp('4%'),
    gap: wp('2%'),
  },
  detailIconBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailIconText: {
    fontSize: 30,
  },
  detailTitleNew: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'System',
    textAlign: 'center',
    color: '#0F172A',
  },
  detailSubtitleNew: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: '#6B7280',
    textAlign: 'center',
  },
  heroCard: {
    paddingVertical: wp('4%'),
    paddingHorizontal: wp('4%'),
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: wp('4%'),
  },
  heroCountdown: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'System',
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: '#6B7280',
    marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: wp('4%'),
    marginBottom: wp('3%'),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: wp('2%'),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'System',
    color: '#0F172A',
  },
  sectionAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(74,158,255,0.12)',
  },
  sectionActionText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'System',
    color: '#4A9EFF',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: wp('2%'),
  },
  detailRowLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
    color: '#0F172A',
  },
  detailRowValue: {
    marginLeft: 'auto',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: '#475569',
  },
  detailPillButton: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  detailPillText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
    color: '#0F172A',
  },
  notesPreview: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: '#0F172A',
    lineHeight: 20,
  },
  notesInputNew: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    padding: 12,
    fontSize: 14,
    fontFamily: 'System',
    minHeight: 100,
    color: '#0F172A',
    marginTop: 8,
  },
  notesHint: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'System',
    color: '#6B7280',
  },
  notesCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  reminderPreviewList: {
    gap: 8,
  },
  reminderPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reminderPreviewText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: '#0F172A',
  },
  reminderEmpty: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: '#6B7280',
  },
  reminderMore: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'System',
    marginTop: 4,
  },
  detailFooterBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: wp('4%'),
    paddingBottom: wp('4%'),
  },
  footerButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'System',
    color: '#FFFFFF',
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp('4%'),
    borderRadius: wp('2.5%'),
    borderWidth: 1,
    borderStyle: 'dashed',
    marginLeft: wp('6.5%'),
    marginTop: wp('1%'),
  },
  addNoteText: {
    fontSize: wp('3.5%'),
    fontWeight: '500',
    fontFamily: 'System',
    marginLeft: wp('2%'),
  },
  infoButton: {
    marginLeft: wp('2%'),
    padding: wp('1%'),
  },
  modalSection: {
    marginBottom: wp('4%'), // 16px spacing between sections
  },
  modalSectionLabel: {
    fontSize: wp('3.5%'),
    fontWeight: '600',
    fontFamily: 'System',
    marginBottom: wp('2%'), // 8px between label and input
  },
  modalFooter: {
    flexDirection: 'row',
    gap: wp('2%'),
    paddingTop: wp('3%'),
    paddingBottom: wp('2%'),
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    marginTop: wp('2%'),
  },
  modalFooterButton: {
    flex: 1,
    paddingVertical: wp('3%'),
    borderRadius: wp('2.5%'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFooterButtonSecondary: {
    // Already styled above
  },
  modalFooterButtonPrimary: {
    // Already styled above
  },
  modalFooterButtonText: {
    fontSize: wp('3.5%'),
    fontWeight: '600',
    fontFamily: 'System',
  },
  notesCounterContainer: {
    marginTop: wp('1.5%'),
    alignItems: 'flex-end',
  },
  notesUpsellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: wp('0.5%'),
  },
  notesUpsellText: {
    fontSize: wp('2.5%'),
    fontFamily: 'System',
    fontStyle: 'italic',
  },
  proEnabledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: wp('0.5%'),
  },
  proEnabledText: {
    fontSize: wp('2.5%'),
    fontFamily: 'System',
    fontStyle: 'italic',
    marginLeft: wp('0.5%'),
  },
  modalSectionSubLabel: {
    fontSize: wp('3%'),
    fontWeight: '400',
    fontFamily: 'System',
    marginBottom: wp('2%'),
  },
  reminderButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp('2%'),
    marginBottom: wp('2%'),
  },
  reminderButton: {
    flex: 1,
    minWidth: '45%',
    maxWidth: '48%',
    paddingVertical: wp('2.4%'),
    paddingHorizontal: wp('2%'),
    borderRadius: wp('2.5%'),
    alignItems: 'center',
    justifyContent: 'center',
    height: wp('14%'),
  },
  reminderButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: wp('0.5%'),
  },
  reminderButtonLabel: {
    fontSize: wp('3.15%'),
    fontFamily: 'System',
    textAlign: 'center',
    lineHeight: wp('3.8%'),
  },
  reminderDescription: {
    fontSize: wp('3%'),
    fontWeight: '400',
    fontFamily: 'System',
    lineHeight: wp('4.5%'),
  },
  recurrencePickerContent: {
    width: '85%',
    maxWidth: wp('90%'),
    borderRadius: wp('4%'),
    padding: wp('5%'),
    borderWidth: 1,
  },
  recurrenceOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: wp('3.5%'),
    paddingHorizontal: wp('4%'),
    borderRadius: wp('2.5%'),
    marginBottom: wp('2%'),
    borderWidth: 1,
  },
  recurrenceOptionText: {
    fontSize: wp('4%'),
    fontWeight: '500',
    fontFamily: 'System',
  },
  iconPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    paddingHorizontal: wp('5%'),
    overflow: 'hidden',
  },
});

export default CountdownItem;
