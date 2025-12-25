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
  console.log('🔍 [MIGRATION DEBUG] ========== MIGRATION STARTED ==========');
  console.log('🔍 [MIGRATION DEBUG] Current migration version:', CURRENT_MIGRATION_VERSION);
  
  let backupKey = null;
  let originalData = null;
  
  try {
    // Check if migration is needed
    const migrationVersion = await AsyncStorage.getItem(MIGRATION_VERSION_KEY);
    console.log('🔍 [MIGRATION DEBUG] Stored migration version:', migrationVersion);
    
    if (migrationVersion && parseInt(migrationVersion) >= CURRENT_MIGRATION_VERSION) {
      console.log('🔍 [MIGRATION DEBUG] Migration already completed, skipping');
      return; // Already migrated
    }

    const stored = await AsyncStorage.getItem('countdowns');
    console.log('🔍 [MIGRATION DEBUG] Raw stored data length:', stored ? stored.length : 0);
    console.log('🔍 [MIGRATION DEBUG] Raw stored data preview:', stored ? stored.substring(0, 200) : 'null');
    
    if (!stored || stored.trim() === '') {
      // No events to migrate
      await AsyncStorage.setItem(MIGRATION_VERSION_KEY, String(CURRENT_MIGRATION_VERSION));
      console.log('🔍 [MIGRATION DEBUG] No events to migrate - stored is empty or null');
      return;
    }

    // Store original data for recovery
    originalData = stored;

    let events;
    try {
      events = JSON.parse(stored);
      console.log('🔍 [MIGRATION DEBUG] Parsed old data type:', typeof events);
      console.log('🔍 [MIGRATION DEBUG] Parsed old data is array:', Array.isArray(events));
      if (Array.isArray(events)) {
        console.log('🔍 [MIGRATION DEBUG] Old data count:', events.length);
        console.log('🔍 [MIGRATION DEBUG] Old data sample (first event):', events.length > 0 ? JSON.stringify(events[0], null, 2) : 'no events');
        console.log('🔍 [MIGRATION DEBUG] Old data keys (first event):', events.length > 0 ? Object.keys(events[0]) : 'no events');
      } else {
        console.log('🔍 [MIGRATION DEBUG] Old data structure:', JSON.stringify(events, null, 2).substring(0, 500));
      }
    } catch (parseError) {
      console.error('❌ [MIGRATION DEBUG] Error parsing countdowns during migration:', parseError);
      console.error('🔍 [MIGRATION DEBUG] Raw data that failed to parse:', stored.substring(0, 500));
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
      console.warn('🔍 [MIGRATION DEBUG] Countdowns data is not an array, skipping migration');
      console.warn('🔍 [MIGRATION DEBUG] Data type:', typeof events);
      console.warn('🔍 [MIGRATION DEBUG] Data value:', JSON.stringify(events, null, 2).substring(0, 500));
      // Create backup of non-array data
      await createBackup(stored, CURRENT_MIGRATION_VERSION);
      await AsyncStorage.setItem(MIGRATION_VERSION_KEY, String(CURRENT_MIGRATION_VERSION));
      return;
    }

    // Safety check: don't migrate if events array is empty (might be intentional)
    if (events.length === 0) {
      await AsyncStorage.setItem(MIGRATION_VERSION_KEY, String(CURRENT_MIGRATION_VERSION));
      console.log('🔍 [MIGRATION DEBUG] Empty events array, marking migration as complete');
      return;
    }

    // CREATE BACKUP BEFORE MIGRATION
    backupKey = await createBackup(stored, CURRENT_MIGRATION_VERSION);
    if (!backupKey) {
      console.warn('Failed to create backup, but continuing with migration');
    }

    console.log(`🔍 [MIGRATION DEBUG] Starting migration of ${events.length} events...`);

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

      // Add recurrence fields if missing (for backward compatibility)
      // Note: This migration is optional - the app will work without it due to defensive coding
      // but it ensures data consistency and slightly better performance
      if (migrated.recurrence === undefined) {
        migrated.recurrence = 'none';
      }
      if (migrated.nextOccurrenceAt === undefined) {
        // For non-recurring events, nextOccurrenceAt equals the event date
        migrated.nextOccurrenceAt = migrated.date;
      }
      // originalDateAt is optional, only set if we have a recurring event that's been rolled forward
      // For new migrations, we'll leave it undefined unless needed

      return migrated;
    });

    // VALIDATE MIGRATED DATA BEFORE SAVING
    console.log('🔍 [MIGRATION DEBUG] Migrated data count:', migratedEvents.length);
    console.log('🔍 [MIGRATION DEBUG] Migrated data sample (first event):', migratedEvents.length > 0 ? JSON.stringify(migratedEvents[0], null, 2) : 'no events');
    console.log('🔍 [MIGRATION DEBUG] Migrated data keys (first event):', migratedEvents.length > 0 ? Object.keys(migratedEvents[0]) : 'no events');
    
    if (!validateMigratedEvents(migratedEvents)) {
      console.error('❌ [MIGRATION DEBUG] Migration validation failed, preserving original data');
      console.error('🔍 [MIGRATION DEBUG] Validation failed - migrated events:', JSON.stringify(migratedEvents, null, 2).substring(0, 1000));
      // Don't save invalid data - original data is still in AsyncStorage
      return;
    }

    // Safety check: ensure we have events to save
    if (!migratedEvents || migratedEvents.length === 0) {
      console.warn('🔍 [MIGRATION DEBUG] Migration resulted in empty array, preserving original data');
      console.warn('🔍 [MIGRATION DEBUG] Original events count was:', events.length);
      // Don't overwrite with empty array - original data is preserved
      await AsyncStorage.setItem(MIGRATION_VERSION_KEY, String(CURRENT_MIGRATION_VERSION));
      return;
    }

    // Verify we didn't lose any events
    if (migratedEvents.length !== events.length) {
      console.error(`❌ [MIGRATION DEBUG] Event count mismatch: had ${events.length}, migrated ${migratedEvents.length}`);
      console.error('🔍 [MIGRATION DEBUG] Original event IDs:', events.map(e => e.id));
      console.error('🔍 [MIGRATION DEBUG] Migrated event IDs:', migratedEvents.map(e => e.id));
      // Don't save if we lost events
      return;
    }

    // Save migrated events (only if validation passed)
    const migratedData = JSON.stringify(migratedEvents);
    console.log('🔍 [MIGRATION DEBUG] New data string length:', migratedData.length);
    console.log('🔍 [MIGRATION DEBUG] New data preview:', migratedData.substring(0, 200));
    await AsyncStorage.setItem('countdowns', migratedData);
    
    // Mark migration as complete ONLY after successful save
    await AsyncStorage.setItem(MIGRATION_VERSION_KEY, String(CURRENT_MIGRATION_VERSION));

    console.log(`✅ [MIGRATION DEBUG] Successfully migrated ${migratedEvents.length} events to version ${CURRENT_MIGRATION_VERSION}`);
    console.log('🔍 [MIGRATION DEBUG] ========== MIGRATION COMPLETED ==========');
    
    // Verify what was saved
    const verifySaved = await AsyncStorage.getItem('countdowns');
    console.log('🔍 [MIGRATION DEBUG] Verification - saved data length:', verifySaved ? verifySaved.length : 0);
    if (verifySaved) {
      try {
        const verifyParsed = JSON.parse(verifySaved);
        console.log('🔍 [MIGRATION DEBUG] Verification - saved data count:', Array.isArray(verifyParsed) ? verifyParsed.length : 'not an array');
      } catch (e) {
        console.error('🔍 [MIGRATION DEBUG] Verification - failed to parse saved data');
      }
    }
    
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

// Migration removed - all fields are normalized on-the-fly in loadCountdowns()
// This ensures backward compatibility without requiring a migration step

