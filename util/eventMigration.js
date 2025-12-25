import AsyncStorage from '@react-native-async-storage/async-storage';

import { buildRemindersForEvent } from './reminderBuilder';

const MIGRATION_VERSION_KEY = '@event_migration_version';
const BACKUP_KEY_PREFIX = '@countdowns_backup_v';
const CURRENT_MIGRATION_VERSION = 2; // Incremented for reminderPlan/reminders migration

// Create a backup of the current data before migration
const createBackup = async (data, version) => {
  try {
    const backupKey = `${BACKUP_KEY_PREFIX}${version}_${Date.now()}`;
    await AsyncStorage.setItem(backupKey, data);
    // Also keep a "latest" backup reference
    await AsyncStorage.setItem('@countdowns_backup_latest', backupKey);
    console.log(`Created backup: ${backupKey}`);
    return backupKey;
  } catch (error) {
    console.error('Error creating backup:', error);
    return null;
  }
};

// Validate migrated events before saving
const validateMigratedEvents = (events) => {
  if (!Array.isArray(events)) {
    return false;
  }
  
  // Check that all events have required fields
  for (const event of events) {
    if (!event.id || !event.name || !event.date || !event.icon) {
      console.warn('Invalid event structure:', event);
      return false;
    }
  }
  
  return true;
};

// Migrate events to new schema
export const migrateEvents = async () => {
  let backupKey = null;
  let originalData = null;
  
  try {
    // Check if migration is needed
    const migrationVersion = await AsyncStorage.getItem(MIGRATION_VERSION_KEY);
    if (migrationVersion && parseInt(migrationVersion) >= CURRENT_MIGRATION_VERSION) {
      console.log('Migration already completed, skipping');
      return; // Already migrated
    }

    const stored = await AsyncStorage.getItem('countdowns');
    if (!stored || stored.trim() === '') {
      // No events to migrate
      await AsyncStorage.setItem(MIGRATION_VERSION_KEY, String(CURRENT_MIGRATION_VERSION));
      console.log('No events to migrate');
      return;
    }

    // Store original data for recovery
    originalData = stored;

    let events;
    try {
      events = JSON.parse(stored);
    } catch (parseError) {
      console.error('Error parsing countdowns during migration:', parseError);
      // If parsing fails, try to create a backup and rename the corrupted data
      try {
        await AsyncStorage.setItem('@countdowns_corrupted', stored);
        await AsyncStorage.removeItem('countdowns');
        console.warn('Moved corrupted data to @countdowns_corrupted');
      } catch (e) {
        console.error('Error handling corrupted data:', e);
      }
      // Mark migration as complete to avoid retrying
      await AsyncStorage.setItem(MIGRATION_VERSION_KEY, String(CURRENT_MIGRATION_VERSION));
      return;
    }

    if (!Array.isArray(events)) {
      console.warn('Countdowns data is not an array, skipping migration');
      // Create backup of non-array data
      await createBackup(stored, CURRENT_MIGRATION_VERSION);
      await AsyncStorage.setItem(MIGRATION_VERSION_KEY, String(CURRENT_MIGRATION_VERSION));
      return;
    }

    // Safety check: don't migrate if events array is empty (might be intentional)
    if (events.length === 0) {
      await AsyncStorage.setItem(MIGRATION_VERSION_KEY, String(CURRENT_MIGRATION_VERSION));
      console.log('Empty events array, marking migration as complete');
      return;
    }

    // CREATE BACKUP BEFORE MIGRATION
    backupKey = await createBackup(stored, CURRENT_MIGRATION_VERSION);
    if (!backupKey) {
      console.warn('Failed to create backup, but continuing with migration');
    }

    console.log(`Starting migration of ${events.length} events...`);

    // Migrate each event
    const migratedEvents = events.map(event => {
      // Create a copy to avoid mutating original
      const migrated = { ...event };

      // Add notes field if missing
      if (migrated.notes === undefined) {
        migrated.notes = '';
      }

      // Add templateId if missing
      if (migrated.templateId === undefined) {
        migrated.templateId = null;
      }

      // Add reminderPresetId if missing (legacy field, kept for compatibility)
      if (migrated.reminderPresetId === undefined) {
        migrated.reminderPresetId = null;
      }

      // Add reminderPlan if missing
      if (migrated.reminderPlan === undefined) {
        // Default to 'none' preset if no existing notification
        const defaultPreset = migrated.notificationId ? 'chill' : 'none';
        migrated.reminderPlan = {
          preset: defaultPreset,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          enabled: !!migrated.notificationId,
        };
      }

      // Ensure reminderPlan has required fields
      if (!migrated.reminderPlan.preset) {
        migrated.reminderPlan.preset = 'none';
      }
      if (!migrated.reminderPlan.timezone) {
        migrated.reminderPlan.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      }
      if (migrated.reminderPlan.enabled === undefined) {
        migrated.reminderPlan.enabled = migrated.reminderPlan.preset !== 'none';
      }

      // Migrate reminders array - generate from reminderPlan if not already in new format
      if (migrated.reminders === undefined || migrated.reminders.length === 0) {
        // Generate reminders from reminderPlan
        try {
          migrated.reminders = buildRemindersForEvent(migrated);
        } catch (error) {
          console.warn(`Error generating reminders for event ${migrated.id}:`, error);
          migrated.reminders = [];
        }
      } else {
        // Ensure reminders is an array
        if (!Array.isArray(migrated.reminders)) {
          migrated.reminders = [];
        } else {
          // Validate and fix reminder structure
          const validReminders = migrated.reminders.filter(reminder => {
            // If it's already the new format, keep it
            return reminder && reminder.id && reminder.eventId && reminder.fireAtISO;
          });
          
          // If all were legacy format, regenerate
          if (validReminders.length === 0 && migrated.reminderPlan.enabled) {
            try {
              migrated.reminders = buildRemindersForEvent(migrated);
            } catch (error) {
              console.warn(`Error regenerating reminders for event ${migrated.id}:`, error);
              migrated.reminders = [];
            }
          } else {
            migrated.reminders = validReminders;
          }
        }
      }

      // Ensure createdAt exists
      if (!migrated.createdAt) {
        migrated.createdAt = migrated.date || new Date().toISOString();
      }

      return migrated;
    });

    // VALIDATE MIGRATED DATA BEFORE SAVING
    if (!validateMigratedEvents(migratedEvents)) {
      console.error('Migration validation failed, preserving original data');
      // Don't save invalid data - original data is still in AsyncStorage
      return;
    }

    // Safety check: ensure we have events to save
    if (!migratedEvents || migratedEvents.length === 0) {
      console.warn('Migration resulted in empty array, preserving original data');
      // Don't overwrite with empty array - original data is preserved
      await AsyncStorage.setItem(MIGRATION_VERSION_KEY, String(CURRENT_MIGRATION_VERSION));
      return;
    }

    // Verify we didn't lose any events
    if (migratedEvents.length !== events.length) {
      console.error(`Event count mismatch: had ${events.length}, migrated ${migratedEvents.length}`);
      // Don't save if we lost events
      return;
    }

    // Save migrated events (only if validation passed)
    const migratedData = JSON.stringify(migratedEvents);
    await AsyncStorage.setItem('countdowns', migratedData);
    
    // Mark migration as complete ONLY after successful save
    await AsyncStorage.setItem(MIGRATION_VERSION_KEY, String(CURRENT_MIGRATION_VERSION));

    console.log(`✅ Successfully migrated ${migratedEvents.length} events to version ${CURRENT_MIGRATION_VERSION}`);
    
    // Clean up old backups (keep only the last 3)
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const backupKeys = allKeys.filter(key => key.startsWith(BACKUP_KEY_PREFIX)).sort();
      if (backupKeys.length > 3) {
        const keysToDelete = backupKeys.slice(0, backupKeys.length - 3);
        await AsyncStorage.multiRemove(keysToDelete);
        console.log(`Cleaned up ${keysToDelete.length} old backups`);
      }
    } catch (cleanupError) {
      console.warn('Error cleaning up old backups:', cleanupError);
      // Non-critical, continue
    }
    
  } catch (error) {
    console.error('❌ Error migrating events:', error);
    
    // ATTEMPT RECOVERY: Restore from backup if migration failed
    if (backupKey && originalData) {
      try {
        console.log('Attempting to restore from backup...');
        await AsyncStorage.setItem('countdowns', originalData);
        console.log('✅ Restored original data from backup');
      } catch (restoreError) {
        console.error('❌ Failed to restore from backup:', restoreError);
        // Last resort: try to get the backup
        try {
          const backupData = await AsyncStorage.getItem(backupKey);
          if (backupData) {
            await AsyncStorage.setItem('countdowns', backupData);
            console.log('✅ Restored from backup key');
          }
        } catch (e) {
          console.error('❌ All recovery attempts failed:', e);
        }
      }
    }
    
    // Don't throw - allow app to continue even if migration fails
    // Original data should still be in AsyncStorage
  }
};

// Run migration on app start
export const runMigration = async () => {
  await migrateEvents();
};

