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
import * as Haptics from 'expo-haptics';
import Pill from '../components/Pill';

const FREE_REMINDERS_MAX_DAYS = 7;
const FREE_REMINDERS_MAX_COUNT = 10;

const RemindersScreen = ({ navigation }) => {
  const [events, setEvents] = useState([]);
  const [allReminders, setAllReminders] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'today', 'week', 'enabled'
  const [groupBy, setGroupBy] = useState('date'); // 'date' | 'event'
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationPermission, setNotificationPermission] = useState(null);
  const { theme, isDark } = useTheme();
  const { t } = useLocale();
  const { isPro } = useEntitlements();
  const [paywallVisible, setPaywallVisible] = useState(false);

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
      setEvents(loadedEvents);

      // Build reminders for all events
      const reminders = [];
      loadedEvents.forEach(event => {
        if (event.reminderPlan && event.reminderPlan.enabled) {
          const eventReminders = event.reminders || buildRemindersForEvent(event);
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

      // Sort by fireAt
      reminders.sort((a, b) => moment(a.fireAtISO).diff(moment(b.fireAtISO)));
      setAllReminders(reminders);

      // Sync scheduled notifications in background
      syncScheduledReminders(loadedEvents, isPro).catch(err => {
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

  // Group reminders by date or event
  const groupedReminders = displayReminders.reduce((groups, reminder) => {
    const fireAt = moment(reminder.fireAtISO);
    const now = moment();
    let groupKey = groupBy === 'event' ? (reminder.event.name || 'Event') : undefined;

    if (groupBy === 'date') {
      if (fireAt.isSame(now, 'day')) {
        groupKey = 'Today';
      } else if (fireAt.isSame(now.clone().add(1, 'day'), 'day')) {
        groupKey = 'Tomorrow';
      } else {
        groupKey = fireAt.format('dddd, MMM D');
      }
    } else {
      groupKey = groupKey || 'Event';
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(reminder);
    return groups;
  }, {});

  const groupedArray = Object.entries(groupedReminders).map(([date, reminders]) => ({
    date,
    reminders,
  }));

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
      Alert.alert('Error', 'Failed to update reminder');
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
      Alert.alert('Error', 'Failed to update reminders');
    }
  };

  const bulkToggleReminders = async (enabled) => {
    if (!isPro) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPaywallVisible(true);
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const updatedEvents = events.map(event => {
        const updatedReminders = (event.reminders || []).map(r => ({ ...r, enabled }));
        return {
          ...event,
          reminders: updatedReminders,
          reminderPlan: {
            ...(event.reminderPlan || {}),
            enabled,
          },
        };
      });
      await AsyncStorage.setItem('countdowns', JSON.stringify(updatedEvents));
      await loadReminders();
      await syncScheduledReminders(updatedEvents, isPro);
    } catch (error) {
      console.error('Error toggling reminders:', error);
      Alert.alert('Error', 'Failed to update reminders');
    }
  };

  // Open settings for notification permissions
  const openSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      Alert.alert('Error', 'Could not open settings');
    }
  };

  const accentColor = isDark ? '#4E9EFF' : '#4A9EFF';
  const backgroundGradient = isDark 
    ? ['#121212', '#1C1C1C']
    : ['#F9FAFB', '#FFFFFF'];

  const renderReminderItem = ({ item: reminder }) => {
    const fireAt = moment(reminder.fireAtISO);
    const relativeTime = fireAt.fromNow();
    const exactTime = fireAt.format('h:mm A');
    const isToday = fireAt.isSame(moment(), 'day');
    const exactDate = isToday ? 'Today' : fireAt.format('MMM D');

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
              {reminder.event.name}
            </Text>
            <Text style={[
              styles.typeLabel,
              { color: isDark ? '#A1A1A1' : '#6B7280' }
            ]}>
              {reminder.typeLabel}
            </Text>
            <Text style={[
              styles.timeInfo,
              { color: isDark ? '#6B7280' : '#9CA3AF' }
            ]}>
              {relativeTime} • {exactDate} {exactTime}
            </Text>
          </View>
        </View>
        {isPro && (
          <TouchableOpacity
            onPress={() => toggleReminderEnabled(reminder)}
            style={styles.toggleButton}
          >
            <Ionicons
              name={reminder.enabled ? "notifications" : "notifications-off"}
              size={wp('5%')}
              color={reminder.enabled ? accentColor : (isDark ? '#6B7280' : '#9CA3AF')}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderGroup = ({ item: group }) => (
    <View style={styles.group}>
      <Text style={[
        styles.groupHeader,
        { color: isDark ? '#A1A1A1' : '#6B7280' }
      ]}>
        {group.date}
      </Text>
      {group.reminders.map((reminder, index) => (
        <View key={reminder.id || index}>
          {renderReminderItem({ item: reminder })}
        </View>
      ))}
    </View>
  );

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
            {nextReminderTime ? (
              <Text style={[
                styles.subtitle,
                { color: isDark ? '#A1A1A1' : '#6B7280' }
              ]}>
                Next reminder {nextReminderTime}
              </Text>
            ) : (
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
            <TouchableOpacity
              onPress={() => setPaywallVisible(true)}
              style={[
                styles.inlineUpsell,
                {
                  backgroundColor: isDark ? 'rgba(78,158,255,0.15)' : 'rgba(78,158,255,0.08)',
                  borderColor: isDark ? 'rgba(78,158,255,0.3)' : 'rgba(78,158,255,0.2)',
                }
              ]}
            >
              <View style={styles.inlineUpsellLeft}>
                <Ionicons name="lock-closed" size={wp('5%')} color={accentColor} />
              </View>
              <View style={styles.inlineUpsellTextWrap}>
                <Text style={[styles.inlineUpsellTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                  Unlock full reminder schedule
                </Text>
                <Text style={[styles.inlineUpsellSubtitle, { color: isDark ? '#A1A1A1' : '#475569' }]}>
                  Get full filters, search, grouping, and unlimited upcoming reminders.
                </Text>
              </View>
              <ProBadge />
            </TouchableOpacity>
          )}

          {/* Filters */}
          <View style={styles.filters}>
            <Pill
              label="All"
              active={filter === 'all'}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilter('all');
              }}
            />
            {['today', 'week', 'enabled'].map(key => {
              const labelMap = {
                today: 'Today',
                week: 'This Week',
                enabled: 'Enabled',
              };
              const locked = !isPro;
              const active = filter === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (locked) {
                      setPaywallVisible(true);
                      return;
                    }
                    setFilter(key);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                  disabled={false}
                >
                  <Pill
                    label={labelMap[key]}
                    active={active}
                    onPress={null}
                    rightIcon={locked ? <Ionicons name="lock-closed" size={wp('3.8%')} color={accentColor} /> : null}
                  />
                  {locked && <ProBadge style={{ marginLeft: wp('1%') }} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Pro-only controls */}
          {isPro && (
            <>
              <View style={styles.proControls}>
                <TextInput
                  placeholder="Search reminders by event"
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={[
                    styles.searchInput,
                    {
                      backgroundColor: isDark ? '#111827' : '#F3F4F6',
                      color: isDark ? '#FFFFFF' : '#0F172A',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    }
                  ]}
                />
                <View style={styles.groupToggleRow}>
                  <Text style={[styles.groupLabel, { color: isDark ? '#A1A1A1' : '#475569' }]}>Group by</Text>
                  <View style={styles.groupTogglePills}>
                    {['date', 'event'].map(mode => (
                      <Pill
                        key={mode}
                        label={mode === 'date' ? 'Date' : 'Event'}
                        active={groupBy === mode}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setGroupBy(mode);
                        }}
                      />
                    ))}
                  </View>
                </View>
                <View style={styles.bulkRow}>
                  <TouchableOpacity
                    style={[styles.bulkButton, { backgroundColor: accentColor }]}
                    onPress={() => bulkToggleReminders(true)}
                  >
                    <Ionicons name="notifications" size={wp('4%')} color="#FFFFFF" />
                    <Text style={styles.bulkButtonText}>Enable all reminders</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.bulkButton,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB' }
                    ]}
                    onPress={() => bulkToggleReminders(false)}
                  >
                    <Ionicons name="notifications-off" size={wp('4%')} color={isDark ? '#E5E7EB' : '#374151'} />
                    <Text style={[styles.bulkButtonText, { color: isDark ? '#E5E7EB' : '#111827' }]}>
                      Disable all reminders
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* Reminders List */}
          {groupedArray.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="notifications-off-outline"
                size={wp('15%')}
                color={isDark ? '#6B7280' : '#9CA3AF'}
              />
              <Text style={[
                styles.emptyText,
                { color: isDark ? '#A1A1A1' : '#6B7280' }
              ]}>
                No reminders found
              </Text>
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
        feature="reminders"
      />
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
    padding: wp('4%'),
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
  },
  emptyText: {
    fontSize: wp('4%'),
    fontWeight: '500',
    fontFamily: 'System',
    marginTop: wp('3%'),
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
  inlineUpsell: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp('4%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
    marginBottom: wp('4%'),
    gap: wp('3%'),
  },
  inlineUpsellLeft: {
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('2.5%'),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(78,158,255,0.12)',
  },
  inlineUpsellTextWrap: {
    flex: 1,
  },
  inlineUpsellTitle: {
    fontSize: wp('4%'),
    fontWeight: '700',
    fontFamily: 'System',
    marginBottom: wp('1%'),
  },
  inlineUpsellSubtitle: {
    fontSize: wp('3.4%'),
    fontWeight: '500',
    fontFamily: 'System',
    lineHeight: wp('4.6%'),
  },
  proControls: {
    gap: wp('3%'),
    marginBottom: wp('4%'),
  },
  searchInput: {
    paddingHorizontal: wp('4%'),
    paddingVertical: wp('3%'),
    borderRadius: wp('2.5%'),
    borderWidth: 1,
    fontSize: wp('3.8%'),
    fontFamily: 'System',
  },
  groupToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp('3%'),
  },
  groupLabel: {
    fontSize: wp('3.6%'),
    fontWeight: '600',
    fontFamily: 'System',
  },
  groupTogglePills: {
    flexDirection: 'row',
    gap: wp('2%'),
  },
  bulkRow: {
    flexDirection: 'row',
    gap: wp('2%'),
    flexWrap: 'wrap',
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
    paddingHorizontal: wp('4%'),
    paddingVertical: wp('3%'),
    borderRadius: wp('2.5%'),
    minWidth: '48%',
    justifyContent: 'center',
  },
  bulkButtonText: {
    color: '#FFFFFF',
    fontSize: wp('3.6%'),
    fontWeight: '600',
    fontFamily: 'System',
  },
});

export default RemindersScreen;

