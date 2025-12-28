import * as Notifications from 'expo-notifications';
import moment from 'moment';

/**
 * Syncs scheduled notifications with reminder entries
 * Cancels removed/disabled reminders and schedules new ones
 * @param {Array} events - Array of all events
 * @param {boolean} isPro - Whether user has Pro subscription
 * @returns {Promise<Object>} Object with scheduled count and errors
 */
export const syncScheduledReminders = async (events, isPro) => {
  const results = {
    scheduled: 0,
    cancelled: 0,
    errors: [],
  };

  try {
    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Notification permissions not granted');
      return results;
    }

    // Get all currently scheduled notifications
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const scheduledIds = new Set(allScheduled.map(n => n.identifier));
    const scheduledReminderIds = new Set(
      allScheduled
        .map(n => n.content?.data?.reminderId)
        .filter(Boolean)
    );

    // Build reminders for all events
    // Always include reminders (even if reminderPlan.enabled is false, we still schedule "on time")
    const allReminders = [];
    events.forEach(event => {
      const eventReminders = event.reminders || [];
      eventReminders.forEach(reminder => {
        // Always schedule enabled reminders
        // For free users, only schedule if enabled (Pro users can toggle per-reminder)
        if (reminder.enabled) {
          allReminders.push({
            ...reminder,
            event,
          });
        }
      });
    });

    // Cancel notifications that are no longer needed
    for (const scheduled of allScheduled) {
      const reminderId = scheduled.content?.data?.reminderId;
      const eventId = scheduled.content?.data?.eventId;
      
      if (reminderId) {
        // Check if this reminder still exists and is enabled
        const stillExists = allReminders.some(r => 
          r.id === reminderId && r.enabled && r.eventId === eventId
        );
        
        if (!stillExists) {
          try {
            await Notifications.cancelScheduledNotificationAsync(scheduled.identifier);
            results.cancelled++;
          } catch (error) {
            results.errors.push({ type: 'cancel', error: error.message });
          }
        }
      }
    }

    // Schedule new reminders
    for (const reminder of allReminders) {
      const fireAt = moment(reminder.fireAtISO);
      const now = moment();
      
      // Only schedule if in the future
      if (fireAt.isBefore(now)) {
        continue;
      }

      // Check if already scheduled (by notificationId or reminderId)
      if (reminder.notificationId && scheduledIds.has(reminder.notificationId)) {
        continue;
      }
      if (scheduledReminderIds.has(reminder.id)) {
        continue;
      }

      try {
        const diffSeconds = Math.ceil(fireAt.diff(now) / 1000);
        
        // Minimum 5 second buffer
        if (diffSeconds < 5) {
          continue;
        }

        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: reminder.typeLabel === 'On time' 
              ? reminder.event.name 
              : `${reminder.event.name} - ${reminder.typeLabel}`,
            body: reminder.typeLabel === 'On time'
              ? `"${reminder.event.name}" is happening now!`
              : `"${reminder.event.name}" ${reminder.typeLabel}`,
            sound: true,
            data: {
              eventId: reminder.eventId,
              reminderId: reminder.id,
              type: 'reminder',
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: diffSeconds,
            repeats: false,
          },
        });

        // Update the reminder with notificationId
        reminder.notificationId = notificationId;
        results.scheduled++;
      } catch (error) {
        console.error(`Error scheduling reminder ${reminder.id}:`, error);
        results.errors.push({ 
          type: 'schedule', 
          reminderId: reminder.id, 
          error: error.message 
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error syncing reminders:', error);
    results.errors.push({ type: 'sync', error: error.message });
    return results;
  }
};

/**
 * Cancels all notifications for a specific event
 * @param {string} eventId - Event ID
 * @returns {Promise<number>} Number of notifications cancelled
 */
export const cancelEventReminders = async (eventId) => {
  try {
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    let cancelled = 0;

    for (const notification of allScheduled) {
      if (notification.content?.data?.eventId === eventId) {
        try {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          cancelled++;
        } catch (error) {
          console.error(`Error cancelling notification ${notification.identifier}:`, error);
        }
      }
    }

    return cancelled;
  } catch (error) {
    console.error('Error cancelling event reminders:', error);
    return 0;
  }
};

