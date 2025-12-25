import AsyncStorage from '@react-native-async-storage/async-storage';

const MIGRATION_VERSION_KEY = '@event_migration_version';
const CURRENT_MIGRATION_VERSION = 1;

// Migrate events to new schema
export const migrateEvents = async () => {
  try {
    // Check if migration is needed
    const migrationVersion = await AsyncStorage.getItem(MIGRATION_VERSION_KEY);
    if (migrationVersion && parseInt(migrationVersion) >= CURRENT_MIGRATION_VERSION) {
      return; // Already migrated
    }

    const stored = await AsyncStorage.getItem('countdowns');
    if (!stored) {
      // No events to migrate
      await AsyncStorage.setItem(MIGRATION_VERSION_KEY, String(CURRENT_MIGRATION_VERSION));
      return;
    }

    const events = JSON.parse(stored);
    if (!Array.isArray(events)) {
      await AsyncStorage.setItem(MIGRATION_VERSION_KEY, String(CURRENT_MIGRATION_VERSION));
      return;
    }

    // Migrate each event
    const migratedEvents = events.map(event => {
      const migrated = { ...event };

      // Add notes field if missing
      if (migrated.notes === undefined) {
        migrated.notes = '';
      }

      // Add templateId if missing
      if (migrated.templateId === undefined) {
        migrated.templateId = null;
      }

      // Add reminderPresetId if missing
      if (migrated.reminderPresetId === undefined) {
        migrated.reminderPresetId = null;
      }

      // Migrate from single notificationId to reminders array
      if (migrated.reminders === undefined) {
        if (migrated.notificationId) {
          // If there was a notification, create a default reminder
          // We can't know the exact offset, so we'll set a default 1 day reminder
          migrated.reminders = [{ offset: 1, unit: 'days' }];
        } else {
          migrated.reminders = [];
        }
      }

      // Ensure reminders is an array
      if (!Array.isArray(migrated.reminders)) {
        migrated.reminders = [];
      }

      // Ensure all reminder objects have the correct structure
      migrated.reminders = migrated.reminders.map(reminder => {
        if (typeof reminder === 'number') {
          // Legacy format: just a number (days)
          return { offset: reminder, unit: 'days' };
        }
        if (typeof reminder === 'object' && reminder.offset !== undefined) {
          return {
            offset: reminder.offset,
            unit: reminder.unit || 'days',
          };
        }
        return null;
      }).filter(Boolean);

      return migrated;
    });

    // Save migrated events
    await AsyncStorage.setItem('countdowns', JSON.stringify(migratedEvents));
    
    // Mark migration as complete
    await AsyncStorage.setItem(MIGRATION_VERSION_KEY, String(CURRENT_MIGRATION_VERSION));

    console.log(`Migrated ${migratedEvents.length} events to version ${CURRENT_MIGRATION_VERSION}`);
  } catch (error) {
    console.error('Error migrating events:', error);
    // Don't throw - allow app to continue even if migration fails
  }
};

// Run migration on app start
export const runMigration = async () => {
  await migrateEvents();
};

