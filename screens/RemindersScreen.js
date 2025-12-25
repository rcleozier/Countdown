import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import moment from 'moment';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useEntitlements } from '../src/billing/useEntitlements';
import PaywallSheet from '../src/billing/PaywallSheet';
import ProBadge from '../components/ProBadge';
import { LinearGradient } from 'expo-linear-gradient';
import { Analytics } from '../util/analytics';
import { buildRemindersForEvent } from '../util/reminderBuilder';
import { syncScheduledReminders } from '../util/reminderScheduler';
import { runNotificationRecovery } from '../util/notificationRecovery';
import { rollForwardIfNeeded } from '../util/recurrence';
import * as Haptics from 'expo-haptics';
import BottomSheet from '../components/BottomSheet';
import Pill from '../components/Pill';

const FREE_REMINDERS_MAX_DAYS = 7;
const FREE_REMINDERS_MAX_COUNT = 10;

const FilterChip = ({ label, selected, locked, showPro, onPress }) => {
  const { theme, isDark } = useTheme();
  const baseBg = isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6';
  const baseText = isDark ? '#E5E7EB' : '#0F172A';
  const lockedText = isDark ? 'rgba(229,231,235,0.6)' : 'rgba(15,23,42,0.6)';
  const selectedBg = isDark ? '#4E9EFF' : '#4A9EFF';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? selectedBg : baseBg,
          borderColor: selected ? selectedBg : 'transparent',
        },
      ]}
    >
      <Text
        style={[
          styles.chipLabel,
          {
            color: selected ? '#FFFFFF' : (locked ? lockedText : baseText),
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {locked && (
        <Ionicons
          name="lock-closed"
          size={wp('3.5%')}
          color={lockedText}
          style={styles.chipIcon}
        />
      )}
    </TouchableOpacity>
  );
};

const UpsellCard = ({ onPress, isDark, accentColor }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.9}
    style={[
      styles.upsellCardNew,
      {
        backgroundColor: isDark ? 'rgba(78,158,255,0.12)' : 'rgba(74,158,255,0.08)',
      }
    ]}
  >
    <View style={styles.upsellTopRow}>
      <View style={styles.upsellIconWrap}>
        <Ionicons name="lock-closed" size={wp('7%')} color={accentColor} />
      </View>
      <View style={styles.upsellTextWrap}>
        <Text style={[styles.upsellTitleNew, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
          Unlock full reminder schedule
        </Text>
        <Text
          style={[styles.upsellBody, { color: isDark ? '#CBD5E1' : '#475569' }]}
          numberOfLines={2}
        >
          Get full filters, search, grouping, and unlimited reminders.
        </Text>
      </View>
    </View>
    <TouchableOpacity
      onPress={onPress}
      style={[styles.upsellButtonNew, { backgroundColor: accentColor }]}
      activeOpacity={0.9}
    >
      <Text style={styles.upsellButtonNewText}>Go Pro</Text>
    </TouchableOpacity>
  </TouchableOpacity>
);

const RemindersScreen = ({ navigation }) => {
  const [events, setEvents] = useState([]);
  const [allReminders, setAllReminders] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'today', 'week', 'enabled'
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationPermission, setNotificationPermission] = useState(null);
  const { theme, isDark } = useTheme();
  const { t } = useLocale();
  const { isPro } = useEntitlements();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState('');
  const [filterInfoVisible, setFilterInfoVisible] = useState(false);
  const [filterInfoLabel, setFilterInfoLabel] = useState('');

  // Load events and build reminders
  const loadReminders = async () => {
    try {
      const stored = await AsyncStorage.getItem('countdowns');
      if (!stored) {
        setEvents([]);
        setAllReminders([]);
        return;
      }

      const loadedEvents = JSON.parse(stored);

      // Try to recover legacy notifications first (one-time recovery)
      const recoveryKey = '@notification_recovery_completed';
      const recoveryCompleted = await AsyncStorage.getItem(recoveryKey);
      let eventsToUse = loadedEvents;
      
      if (!recoveryCompleted) {
        console.log('🔍 [REMINDERS] Running notification recovery...');
        try {
          const recoveredEvents = await runNotificationRecovery(loadedEvents);
          if (recoveredEvents && recoveredEvents.length > 0) {
            eventsToUse = recoveredEvents;
            await AsyncStorage.setItem(recoveryKey, 'true');
            console.log('✅ [REMINDERS] Notification recovery completed');
          }
        } catch (error) {
          console.error('Error recovering notifications:', error);
        }
      }

      // Roll forward recurring events
      const now = new Date();
      let needsSave = false;
      const rolledEvents = eventsToUse.map(event => {
        // Debug: Log event dates before roll-forward
        if (event.reminderPlan && event.reminderPlan.enabled) {
          console.log(`[ROLL-FORWARD] Before: ${event.name} - date=${event.date}, nextOccurrenceAt=${event.nextOccurrenceAt}`);
        }
        const rolled = rollForwardIfNeeded(event, now);
        if (rolled !== event) {
          needsSave = true;
          // Rebuild reminders for rolled events since nextOccurrenceAt changed
          rolled.reminders = buildRemindersForEvent(rolled, isPro);
          console.log(`[ROLL-FORWARD] After: ${rolled.name} - date=${rolled.date}, nextOccurrenceAt=${rolled.nextOccurrenceAt}`);
        }
        return rolled;
      });
      
      if (needsSave) {
        await AsyncStorage.setItem('countdowns', JSON.stringify(rolledEvents));
        // Reschedule notifications
        syncScheduledReminders(rolledEvents, isPro).catch(err => {
          console.error('Error rescheduling after roll-forward:', err);
        });
      }
      
      setEvents(rolledEvents);

      // Build reminders for all events (including recovered and rolled ones)
      const reminders = [];
      rolledEvents.forEach(event => {
        if (event.reminderPlan && event.reminderPlan.enabled) {
          // Always rebuild reminders to ensure they're based on current nextOccurrenceAt
          const eventDate = event.nextOccurrenceAt || event.date;
          const eventReminders = buildRemindersForEvent(event, isPro);
          // Debug: Log reminder dates for upcoming events
          if (eventReminders.length > 0 && eventDate) {
            const expectedDate = moment(eventDate);
            const actualFireAt = moment(eventReminders[0].fireAtISO);
            console.log(`[REMINDERS LOAD] ${event.name}: eventDate=${eventDate}, nextOccurrenceAt=${event.nextOccurrenceAt}, date=${event.date}, reminderFireAt=${eventReminders[0].fireAtISO}, sameDay=${actualFireAt.isSame(expectedDate, 'day')}`);
            if (!actualFireAt.isSame(expectedDate, 'day')) {
              console.warn(`[REMINDERS] ${event.name}: eventDate=${eventDate}, reminderFireAt=${eventReminders[0].fireAtISO}, mismatch!`);
            }
          }
          eventReminders.forEach(reminder => {
            const fireAt = moment(reminder.fireAtISO);
            if (!fireAt.isAfter(moment())) {
              return; // Skip past reminders
            }
            if (reminder.enabled || isPro) {
              reminders.push({
                ...reminder,
                event,
              });
            }
          });
        }
      });
      
      // Debug: Log all reminder dates
      console.log(`[REMINDERS] Total reminders: ${reminders.length}`);
      reminders.slice(0, 10).forEach((r, i) => {
        console.log(`[REMINDERS] ${i}: ${r.event.name} - fireAt=${r.fireAtISO} (${moment(r.fireAtISO).format('MMM D, YYYY h:mm A')})`);
      });

      // Sort by fireAt
      reminders.sort((a, b) => moment(a.fireAtISO).diff(moment(b.fireAtISO)));
      setAllReminders(reminders);

      // Sync scheduled notifications in background (use rolledEvents, not eventsToUse)
      syncScheduledReminders(rolledEvents, isPro).catch(err => {
        console.error('Error syncing reminders:', err);
      });
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  // Check notification permissions
  const checkPermissions = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationPermission(status);
    } catch (error) {
      console.error('Error checking permissions:', error);
      setNotificationPermission('undetermined');
    }
  };

  useEffect(() => {
    Analytics.initialize();
    Analytics.trackScreenView('Reminders');
    loadReminders();
    checkPermissions();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReminders();
      checkPermissions();
    }, [isPro])
  );

  const limitRemindersForFree = useCallback((reminders) => {
    const now = moment();
    const cutoff = now.clone().add(FREE_REMINDERS_MAX_DAYS, 'days').endOf('day');
    const withinWindow = reminders.filter(r => {
      const fireAt = moment(r.fireAtISO);
      return fireAt.isSameOrBefore(cutoff);
    });
    return withinWindow.slice(0, FREE_REMINDERS_MAX_COUNT);
  }, []);

  // Filter reminders
  const filteredReminders = allReminders.filter(reminder => {
    const fireAt = moment(reminder.fireAtISO);
    const now = moment();
    const today = now.clone().startOf('day');
    const weekEnd = now.clone().add(7, 'days').endOf('day');

    if (filter === 'today') {
      return fireAt.isSameOrAfter(today) && fireAt.isBefore(today.clone().add(1, 'day'));
    }
    if (filter === 'week') {
      return fireAt.isSameOrAfter(today) && fireAt.isBefore(weekEnd);
    }
    if (filter === 'enabled') {
      return reminder.enabled;
    }
    return true; // 'all'
  }).filter(reminder => {
    if (!isPro || !searchQuery.trim()) return true;
    return reminder.event.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
  });

  // Limit for free users
  const displayReminders = isPro ? filteredReminders : limitRemindersForFree(filteredReminders);

  // Get next reminder time
  const nextReminder = allReminders.find(r => r.enabled && moment(r.fireAtISO).isAfter(moment()));
  const nextReminderTime = nextReminder 
    ? moment(nextReminder.fireAtISO).fromNow()
    : null;

  // Group reminders by date (always chronological)
  const groupedReminders = displayReminders.reduce((groups, reminder) => {
    const fireAt = moment(reminder.fireAtISO);
    const now = moment();
    let groupKey;

    if (fireAt.isSame(now, 'day')) {
      groupKey = t('reminders.today');
    } else if (fireAt.isSame(now.clone().add(1, 'day'), 'day')) {
      groupKey = t('reminders.tomorrow');
    } else {
      // Use the actual date as the group key for upcoming reminders
      // This ensures each date gets its own group instead of lumping all into "UPCOMING"
      groupKey = fireAt.format('YYYY-MM-DD');
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(reminder);
    return groups;
  }, {});

  // Sort groups: TODAY, TOMORROW, then UPCOMING (with dates sorted chronologically)
  const groupedArray = Object.entries(groupedReminders)
    .map(([date, reminders]) => ({
      date,
      reminders: reminders.sort((a, b) => moment(a.fireAtISO).diff(moment(b.fireAtISO))),
    }))
    .sort((a, b) => {
      const now = moment();
      const todayKey = t('reminders.today');
      const tomorrowKey = t('reminders.tomorrow');
      
      // Special handling for TODAY and TOMORROW
      if (a.date === todayKey) return -1;
      if (b.date === todayKey) return 1;
      if (a.date === tomorrowKey) return -1;
      if (b.date === tomorrowKey) return 1;
      
      // For date strings (YYYY-MM-DD), sort chronologically
      if (a.date.match(/^\d{4}-\d{2}-\d{2}$/) && b.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return moment(a.date).diff(moment(b.date));
      }
      
      // Fallback: compare as dates
      const dateA = moment(a.date);
      const dateB = moment(b.date);
      if (dateA.isValid() && dateB.isValid()) {
        return dateA.diff(dateB);
      }
      
      return 0;
    });

  // Toggle reminder enabled state (Pro only)
  const toggleReminderEnabled = async (reminder) => {
    if (!isPro) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPaywallVisible(true);
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const updatedEvents = events.map(event => {
        if (event.id === reminder.eventId) {
          const updatedReminders = (event.reminders || []).map(r => 
            r.id === reminder.id ? { ...r, enabled: !r.enabled } : r
          );
          return { ...event, reminders: updatedReminders };
        }
        return event;
      });

      await AsyncStorage.setItem('countdowns', JSON.stringify(updatedEvents));
      await loadReminders();
      
      // Resync notifications
      await syncScheduledReminders(updatedEvents, isPro);
    } catch (error) {
      console.error('Error toggling reminder:', error);
      Alert.alert(t('common.error'), t('reminders.updateError'));
    }
  };

  // Toggle event master reminder switch
  const toggleEventReminders = async (event) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const updatedEvents = events.map(e => {
        if (e.id === event.id) {
          const newEnabled = !(e.reminderPlan?.enabled ?? false);
          return {
            ...e,
            reminderPlan: {
              ...(e.reminderPlan || {}),
              enabled: newEnabled,
            },
          };
        }
        return e;
      });

      await AsyncStorage.setItem('countdowns', JSON.stringify(updatedEvents));
      await loadReminders();
      
      // Resync notifications
      await syncScheduledReminders(updatedEvents, isPro);
    } catch (error) {
      console.error('Error toggling event reminders:', error);
      Alert.alert(t('common.error'), t('reminders.updateErrorPlural'));
    }
  };


  // Open settings for notification permissions
  const openSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      Alert.alert(t('common.error'), t('reminders.settingsError'));
    }
  };

  const accentColor = isDark ? '#4E9EFF' : '#4A9EFF';
  const backgroundGradient = isDark 
    ? ['#121212', '#1C1C1C']
    : ['#F9FAFB', '#FFFFFF'];

  const renderReminderItem = ({ item: reminder }) => {
    const fireAt = moment(reminder.fireAtISO);
    const now = moment();
    const within7 = fireAt.diff(now, 'days') <= 7 && fireAt.isAfter(now);
    const line1 = reminder.typeLabel || reminder.type || t('reminders.reminder');
    const line2 = (() => {
      if (within7) {
        return fireAt.calendar(null, {
          sameDay: '[Today at] h:mm A',
          nextDay: '[Tomorrow at] h:mm A',
          nextWeek: 'dddd [at] h:mm A',
          lastDay: '[Yesterday at] h:mm A',
          lastWeek: '[Last] dddd [at] h:mm A',
          sameElse: 'MMM D [at] h:mm A',
        });
      }
      return fireAt.format('MMM D, h:mm A');
    })();

    return (
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate('Home', {
            screen: 'HomeScreen',
            params: { focusEventId: reminder.event.id },
          });
        }}
        style={[
          styles.reminderItem,
          {
            backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          }
        ]}
      >
        <View style={styles.reminderLeft}>
          <View style={[
            styles.eventIconContainer,
            {
              backgroundColor: isDark 
                ? 'rgba(78,158,255,0.15)' 
                : 'rgba(78,158,255,0.1)',
            }
          ]}>
            <Text style={styles.eventIcon}>{reminder.event.icon}</Text>
          </View>
          <View style={styles.reminderInfo}>
            <Text style={[
              styles.eventName,
              { color: isDark ? '#FFFFFF' : '#1A1A1A' }
            ]}>
              {line1}
            </Text>
            <Text style={[
              styles.typeLabel,
              { color: isDark ? '#A1A1A1' : '#6B7280' }
            ]}>
              {filter === 'all'
                ? `${reminder.event.name || t('reminders.untitledEvent')} · ${line2}`
                : line2}
            </Text>
          </View>
        </View>
        <Ionicons
          name={reminder.enabled ? "notifications" : "notifications-off"}
          size={wp('5%')}
          color={reminder.enabled ? accentColor : (isDark ? '#6B7280' : '#9CA3AF')}
          style={styles.toggleButton}
        />
      </TouchableOpacity>
    );
  };

  const renderGroup = ({ item: group }) => {
    // Format header based on group date
    let headerText = group.date;
    const todayKey = t('reminders.today');
    const tomorrowKey = t('reminders.tomorrow');
    
    if (group.date === todayKey || group.date === tomorrowKey) {
      // Keep TODAY and TOMORROW as-is
      headerText = group.date;
    } else if (group.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Format date string (YYYY-MM-DD) as readable date
      const date = moment(group.date);
      headerText = date.format('dddd, MMM D');
    } else if (group.reminders.length > 0) {
      // Fallback: use first reminder's date
      const firstDate = moment(group.reminders[0].fireAtISO);
      headerText = firstDate.format('dddd, MMM D');
    }
    
    return (
      <View style={styles.group}>
        <Text style={[
          styles.groupHeader,
          { color: isDark ? '#A1A1A1' : '#6B7280' }
        ]}>
          {headerText}
        </Text>
        {group.reminders.map((reminder, index) => (
          <View key={reminder.id || index}>
            {renderReminderItem({ item: reminder })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <LinearGradient colors={backgroundGradient} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[
              styles.title,
              { color: isDark ? '#FFFFFF' : '#1A1A1A' }
            ]}>
              Reminders
            </Text>
            {nextReminder
              ? (
                <Text style={[
                  styles.subtitle,
                  { color: isDark ? '#A1A1A1' : '#6B7280' }
                ]}>
                  Next reminder: {moment(nextReminder.fireAtISO).calendar(null, {
                    sameDay: `[Today at] h:mm A`,
                    nextDay: `[Tomorrow at] h:mm A`,
                    nextWeek: 'dddd [at] h:mm A',
                    sameElse: 'MMM D [at] h:mm A',
                  })}
                </Text>
              )
              : (
                <Text style={[
                  styles.subtitle,
                  { color: isDark ? '#A1A1A1' : '#6B7280' }
                ]}>
                  No reminders scheduled
                </Text>
              )}
          </View>

          {/* Permission Banner */}
          {notificationPermission !== 'granted' && (
            <View style={[
              styles.permissionBanner,
              {
                backgroundColor: isDark ? 'rgba(255,193,7,0.15)' : 'rgba(255,193,7,0.1)',
                borderColor: isDark ? 'rgba(255,193,7,0.3)' : 'rgba(255,193,7,0.2)',
              }
            ]}>
              <Ionicons
                name="warning-outline"
                size={wp('4%')}
                color={isDark ? '#FFC107' : '#F59E0B'}
              />
              <Text style={[
                styles.permissionText,
                { color: isDark ? '#FFC107' : '#F59E0B' }
              ]}>
                Enable notifications to receive reminders
              </Text>
              <TouchableOpacity
                onPress={openSettings}
                style={styles.settingsButton}
              >
                <Text style={[
                  styles.settingsButtonText,
                  { color: isDark ? '#FFC107' : '#F59E0B' }
                ]}>
                  Settings
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Inline upgrade card for non-pro */}
          {!isPro && (
            <View style={{ marginBottom: wp('3%') }}>
              <UpsellCard
                onPress={() => {
                  setPaywallFeature('reminders_filters');
                  setPaywallVisible(true);
                }}
                isDark={isDark}
                accentColor={accentColor}
              />
            </View>
          )}

          {/* Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <FilterChip
              label="All"
              selected={filter === 'all'}
              locked={false}
              showPro={false}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilter('all');
              }}
            />
            {[
              { key: 'today', label: t('reminders.today') },
              { key: 'week', label: 'This Week' },
              { key: 'enabled', label: 'Enabled' },
            ].map(({ key, label }) => {
              const locked = !isPro;
              const selected = filter === key;
              return (
                <FilterChip
                  key={key}
                  label={label}
                  selected={selected}
                  locked={locked}
                  showPro
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (locked) {
                      setFilterInfoLabel(label);
                      setFilterInfoVisible(true);
                      return;
                    }
                    setFilter(key);
                  }}
                />
              );
            })}
          </ScrollView>

          {/* Search bar (Pro only, moved under filters) */}
          {isPro && (
            <TextInput
              placeholder="Search reminders"
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[
                styles.searchInput,
                {
                  backgroundColor: isDark ? '#111827' : '#F3F4F6',
                  color: isDark ? '#FFFFFF' : '#0F172A',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  marginTop: wp('3%'),
                  marginBottom: wp('2%'),
                }
              ]}
            />
          )}


          {/* Reminders List */}
          {groupedArray.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="notifications-off-outline"
                size={wp('12%')}
                color={isDark ? '#6B7280' : '#9CA3AF'}
              />
              <Text style={[
                styles.emptyTitle,
                { color: isDark ? '#FFFFFF' : '#1A1A1A' }
              ]}>
                No reminders yet
              </Text>
              <Text style={[
                styles.emptySubtext,
                { color: isDark ? '#A1A1A1' : '#6B7280' }
              ]}>
                Add reminders from any event to get notified.
              </Text>
              <TouchableOpacity
                style={[
                  styles.emptyActionButton,
                  {
                    backgroundColor: isDark ? 'rgba(78,158,255,0.15)' : 'rgba(78,158,255,0.1)',
                    borderColor: isDark ? 'rgba(78,158,255,0.3)' : 'rgba(78,158,255,0.2)',
                  }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate('Home', { screen: 'HomeScreen' });
                }}
              >
                <Text style={[
                  styles.emptyActionText,
                  { color: accentColor }
                ]}>
                  View events
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <FlatList
                data={groupedArray}
                renderItem={renderGroup}
                keyExtractor={(item, index) => `group_${item.date}_${index}`}
                scrollEnabled={false}
              />
              
              {/* Free user upsell */}
              {!isPro && filteredReminders.length > displayReminders.length && (
                <View style={[
                  styles.upsellCard,
                  {
                    backgroundColor: isDark ? 'rgba(78,158,255,0.15)' : 'rgba(78,158,255,0.1)',
                    borderColor: isDark ? 'rgba(78,158,255,0.3)' : 'rgba(78,158,255,0.2)',
                  }
                ]}>
                  <Ionicons
                    name="lock-closed"
                    size={wp('5%')}
                    color={accentColor}
                  />
                  <View style={styles.upsellContent}>
                    <Text style={[
                      styles.upsellTitle,
                      { color: isDark ? '#FFFFFF' : '#1A1A1A' }
                    ]}>
                      Unlock unlimited reminders
                    </Text>
                    <Text style={[
                      styles.upsellText,
                      { color: isDark ? '#A1A1A1' : '#6B7280' }
                    ]}>
                      Upgrade to Pro for unlimited reminders + per-reminder toggles
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setPaywallVisible(true);
                    }}
                    style={[
                      styles.upsellButton,
                      { backgroundColor: accentColor }
                    ]}
                  >
                    <Text style={styles.upsellButtonText}>Upgrade</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Paywall Sheet */}
      <PaywallSheet
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        feature={paywallFeature || "reminders"}
      />

      {/* Filter info sheet (lightweight) */}
      <BottomSheet
        visible={filterInfoVisible}
        onClose={() => setFilterInfoVisible(false)}
        height="28%"
        showHandle
      >
        <View style={{ paddingHorizontal: wp('4%'), paddingTop: wp('2%'), gap: wp('3%') }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#FFFFFF' : '#0F172A' }}>
            Pro filter
          </Text>
          <Text style={{ fontSize: 15, fontWeight: '500', color: isDark ? '#CBD5E1' : '#475569' }}>
            {filterInfoLabel || t('reminders.thisFilter')} {t('reminders.filterProMessage')}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setFilterInfoVisible(false);
              setPaywallFeature('reminders_filters');
              setPaywallVisible(true);
            }}
            style={{
              backgroundColor: accentColor,
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>Go Pro</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: wp('5%'),
    paddingTop: wp('4%'),
    paddingBottom: wp('8%'),
  },
  header: {
    marginBottom: wp('4%'),
  },
  title: {
    fontSize: wp('6%'),
    fontWeight: '700',
    fontFamily: 'System',
    marginBottom: wp('1%'),
  },
  subtitle: {
    fontSize: wp('3.5%'),
    fontWeight: '400',
    fontFamily: 'System',
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp('3%'),
    borderRadius: wp('2.5%'),
    borderWidth: 1,
    marginBottom: wp('4%'),
    gap: wp('2%'),
  },
  permissionText: {
    flex: 1,
    fontSize: wp('3.5%'),
    fontWeight: '500',
    fontFamily: 'System',
  },
  settingsButton: {
    paddingHorizontal: wp('3%'),
    paddingVertical: wp('1.5%'),
  },
  settingsButtonText: {
    fontSize: wp('3.5%'),
    fontWeight: '600',
    fontFamily: 'System',
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp('2%'),
    marginBottom: wp('4%'),
  },
  group: {
    marginBottom: wp('5%'),
  },
  groupHeader: {
    fontSize: wp('4%'),
    fontWeight: '600',
    fontFamily: 'System',
    marginBottom: wp('2%'),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: wp('3.5%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
    marginBottom: wp('2%'),
  },
  reminderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eventIconContainer: {
    width: wp('12%'),
    height: wp('12%'),
    borderRadius: wp('3%'),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp('3%'),
  },
  eventIcon: {
    fontSize: wp('6%'),
  },
  reminderInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: wp('4%'),
    fontWeight: '600',
    fontFamily: 'System',
    marginBottom: wp('0.5%'),
  },
  typeLabel: {
    fontSize: wp('3.5%'),
    fontWeight: '500',
    fontFamily: 'System',
    marginBottom: wp('0.5%'),
  },
  timeInfo: {
    fontSize: wp('3%'),
    fontWeight: '400',
    fontFamily: 'System',
  },
  toggleButton: {
    padding: wp('2%'),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: wp('20%'),
    paddingHorizontal: wp('6%'),
  },
  emptyTitle: {
    fontSize: wp('5%'),
    fontWeight: '600',
    fontFamily: 'System',
    marginTop: wp('4%'),
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: wp('3.8%'),
    fontWeight: '400',
    fontFamily: 'System',
    marginTop: wp('2%'),
    textAlign: 'center',
    lineHeight: wp('5.5%'),
  },
  emptyActionButton: {
    marginTop: wp('4%'),
    paddingHorizontal: wp('5%'),
    paddingVertical: wp('3%'),
    borderRadius: wp('2.5%'),
    borderWidth: 1,
  },
  emptyActionText: {
    fontSize: wp('3.8%'),
    fontWeight: '600',
    fontFamily: 'System',
  },
  upsellCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp('4%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
    marginTop: wp('4%'),
    gap: wp('3%'),
  },
  upsellContent: {
    flex: 1,
  },
  upsellTitle: {
    fontSize: wp('4%'),
    fontWeight: '600',
    fontFamily: 'System',
    marginBottom: wp('0.5%'),
  },
  upsellText: {
    fontSize: wp('3.5%'),
    fontWeight: '400',
    fontFamily: 'System',
  },
  upsellButton: {
    paddingHorizontal: wp('4%'),
    paddingVertical: wp('2.5%'),
    borderRadius: wp('2%'),
  },
  upsellButtonText: {
    color: '#FFFFFF',
    fontSize: wp('3.5%'),
    fontWeight: '600',
    fontFamily: 'System',
  },
  filterScroll: {
    paddingVertical: wp('2%'),
    gap: wp('2%'),
    paddingHorizontal: wp('1%'),
  },
  chip: {
    height: 40,
    minWidth: 80,
    paddingHorizontal: 14,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: wp('2%'),
  },
  chipLabel: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'System',
    flexShrink: 1,
  },
  chipIcon: {
    marginLeft: 8,
  },
  chipBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(74,158,255,0.15)',
  },
  chipBadgeText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  upsellCardNew: {
    padding: wp('4%'),
    borderRadius: 16,
    marginBottom: wp('3%'),
    borderWidth: 0,
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  upsellTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp('3%'),
  },
  upsellIconWrap: {
    width: wp('12%'),
    height: wp('12%'),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  upsellTextWrap: {
    flex: 1,
    gap: wp('1%'),
  },
  upsellBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(74,158,255,0.15)',
  },
  upsellBadgeText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  upsellTitleNew: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'System',
  },
  upsellBody: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    lineHeight: 20,
  },
  upsellButtonNew: {
    marginTop: wp('3%'),
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  upsellButtonNewText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'System',
  },
  searchInput: {
    paddingHorizontal: wp('4%'),
    paddingVertical: wp('3%'),
    borderRadius: wp('2.5%'),
    borderWidth: 1,
    fontSize: wp('3.8%'),
    fontFamily: 'System',
  },
});

export default RemindersScreen;

