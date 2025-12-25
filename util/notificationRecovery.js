import * as Notifications from 'expo-notifications';
import moment from 'moment';
import { buildRemindersForEvent } from './reminderBuilder';

/**
 * Recovers notifications from older app versions
 * Matches scheduled notifications to events and rebuilds reminder structure
 * @param {Array} events - Array of all events
 * @returns {Promise<Object>} Object with recovery stats and updated events
 */
export const recoverLegacyNotifications = async (events) => {
  const results = {
    recovered: 0,
    matched: 0,
    unmatched: 0,
    errors: [],
  };

  try {
    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('🔍 [RECOVERY] Notification permissions not granted');
      return { ...results, events };
    }

    // Get all currently scheduled notifications
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log('🔍 [RECOVERY] Found', allScheduled.length, 'scheduled notifications');

    if (allScheduled.length === 0) {
      console.log('🔍 [RECOVERY] No scheduled notifications to recover');
      return { ...results, events };
    }

    // Build a map of notification identifiers to events
    // Method 1: Match by notificationId stored on event (legacy)
    const eventNotificationMap = new Map();
    events.forEach(event => {
      if (event.notificationId) {
        eventNotificationMap.set(event.notificationId, event);
        console.log('🔍 [RECOVERY] Event', event.id, 'has legacy notificationId:', event.notificationId);
      }
    });

    // Method 2: Match by eventId in notification data (newer format)
    const eventIdMap = new Map();
    events.forEach(event => {
      eventIdMap.set(event.id, event);
    });

    // Process each scheduled notification
    const updatedEvents = events.map(event => {
      const updatedEvent = { ...event };
      let eventRecovered = false;

      // Check if this event has a legacy notificationId that matches a scheduled notification
      if (event.notificationId) {
        const matchingNotification = allScheduled.find(
          n => n.identifier === event.notificationId
        );

        if (matchingNotification) {
          console.log('🔍 [RECOVERY] Matched legacy notificationId for event', event.id);
          
          // Extract event info from notification
          const notificationData = matchingNotification.content?.data || {};
          const eventId = notificationData.eventId || event.id;
          
          // Get trigger time
          let fireAtISO;
          if (matchingNotification.trigger?.type === 'timeInterval') {
            // Calculate fire time from seconds
            const seconds = matchingNotification.trigger.seconds;
            fireAtISO = moment().add(seconds, 'seconds').toISOString();
          } else if (matchingNotification.trigger?.date) {
            fireAtISO = moment(matchingNotification.trigger.date).toISOString();
          } else {
            // Fallback: use event date
            fireAtISO = event.date;
          }

          // Create a reminder entry for this notification
          if (!updatedEvent.reminders) {
            updatedEvent.reminders = [];
          }

          // Check if reminder already exists
          const existingReminder = updatedEvent.reminders.find(
            r => r.notificationId === event.notificationId
          );

          if (!existingReminder) {
            updatedEvent.reminders.push({
              id: `recovered-${event.notificationId}`,
              eventId: event.id,
              notificationId: event.notificationId,
              fireAtISO: fireAtISO,
              typeLabel: 'On time', // Legacy notifications were typically "on time"
              enabled: true,
            });
            eventRecovered = true;
            results.recovered++;
          }
        }
      }

      // Also check for notifications with this event's ID in their data
      const notificationsForEvent = allScheduled.filter(
        n => n.content?.data?.eventId === event.id
      );

      if (notificationsForEvent.length > 0) {
        console.log('🔍 [RECOVERY] Found', notificationsForEvent.length, 'notifications for event', event.id);
        
        if (!updatedEvent.reminders) {
          updatedEvent.reminders = [];
        }

        notificationsForEvent.forEach(notification => {
          // Check if this reminder already exists
          const existingReminder = updatedEvent.reminders.find(
            r => r.notificationId === notification.identifier
          );

          if (!existingReminder) {
            // Extract fire time
            let fireAtISO;
            if (notification.trigger?.type === 'timeInterval') {
              const seconds = notification.trigger.seconds;
              fireAtISO = moment().add(seconds, 'seconds').toISOString();
            } else if (notification.trigger?.date) {
              fireAtISO = moment(notification.trigger.date).toISOString();
            } else {
              fireAtISO = event.date;
            }

            // Get type label from notification content
            const title = notification.content?.title || '';
            const body = notification.content?.body || '';
            let typeLabel = 'On time';
            
            if (title.includes(' - ')) {
              // Extract type from title like "Event Name - 1 day before"
              const parts = title.split(' - ');
              if (parts.length > 1) {
                typeLabel = parts[1];
              }
            } else if (body.includes('before') || body.includes('after')) {
              // Try to extract from body
              const match = body.match(/(\d+\s*(day|week|month|hour|minute)s?\s*(before|after))/i);
              if (match) {
                typeLabel = match[0];
              }
            }

            updatedEvent.reminders.push({
              id: notification.content?.data?.reminderId || `recovered-${notification.identifier}`,
              eventId: event.id,
              notificationId: notification.identifier,
              fireAtISO: fireAtISO,
              typeLabel: typeLabel,
              enabled: true,
            });
            eventRecovered = true;
            results.recovered++;
          }
        });
      }

      // If we recovered notifications, ensure reminderPlan is set
      if (eventRecovered && (!updatedEvent.reminderPlan || !updatedEvent.reminderPlan.enabled)) {
        updatedEvent.reminderPlan = {
          preset: 'chill', // Default to chill since they had notifications
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          enabled: true,
        };
        console.log('🔍 [RECOVERY] Enabled reminderPlan for event', event.id);
      }

      return updatedEvent;
    });

    // Count unmatched notifications (orphaned)
    const matchedNotificationIds = new Set();
    updatedEvents.forEach(event => {
      if (event.reminders) {
        event.reminders.forEach(reminder => {
          if (reminder.notificationId) {
            matchedNotificationIds.add(reminder.notificationId);
          }
        });
      }
    });

    const unmatchedNotifications = allScheduled.filter(
      n => !matchedNotificationIds.has(n.identifier)
    );
    results.unmatched = unmatchedNotifications.length;

    if (unmatchedNotifications.length > 0) {
      console.log('🔍 [RECOVERY] Found', unmatchedNotifications.length, 'unmatched notifications (orphaned)');
      unmatchedNotifications.forEach(n => {
        console.log('🔍 [RECOVERY] Unmatched notification:', {
          id: n.identifier,
          eventId: n.content?.data?.eventId,
          reminderId: n.content?.data?.reminderId,
          title: n.content?.title,
        });
      });
    }

    results.matched = results.recovered;
    console.log('🔍 [RECOVERY] Recovery complete:', {
      recovered: results.recovered,
      unmatched: results.unmatched,
    });

    return { ...results, events: updatedEvents };
  } catch (error) {
    console.error('❌ [RECOVERY] Error recovering notifications:', error);
    results.errors.push({ type: 'recovery', error: error.message });
    return { ...results, events };
  }
};

/**
 * Runs recovery and updates events in AsyncStorage
 * @param {Array} events - Current events array
 * @returns {Promise<Array>} Updated events array
 */
export const runNotificationRecovery = async (events) => {
  try {
    const recovery = await recoverLegacyNotifications(events);
    
    if (recovery.recovered > 0) {
      console.log('✅ [RECOVERY] Recovered', recovery.recovered, 'notifications');
      // Save updated events
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('countdowns', JSON.stringify(recovery.events));
      console.log('✅ [RECOVERY] Saved recovered events to storage');
    } else {
      console.log('🔍 [RECOVERY] No notifications to recover');
    }
    
    return recovery.events;
  } catch (error) {
    console.error('❌ [RECOVERY] Error running recovery:', error);
    return events;
  }
};

