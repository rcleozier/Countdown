# Chronox Architecture Documentation

## Overview

Chronox is a React Native countdown app built with Expo that allows users to create and manage countdown events with reminders. This document describes the data model, recurring functionality, Pro features, and the relationship between notifications and events.

---

## Data Model

### Core Entities

#### Event (Countdown)
An event represents a single countdown with the following structure:

```javascript
{
  id: string,                    // Unique identifier (GUID)
  name: string,                  // Event name/title
  icon: string,                  // Emoji icon
  date: string,                  // ISO string - Original event date/time
  createdAt: string,             // ISO string - When event was created
  notes: string,                 // Event notes (max 500 chars free, 5000 Pro)
  reminderPlan: {                // Reminder configuration
    preset: 'off' | 'simple' | 'standard' | 'intense',
    enabled: boolean,
    timezone: string
  },
  reminders: Reminder[],        // Array of reminder objects (see below)
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly',
  nextOccurrenceAt: string,     // ISO string - For recurring events, the next occurrence
  originalDateAt: string         // ISO string - Original date for recurring events
}
```

**Key Points:**
- Events are stored in AsyncStorage under the key `"countdowns"` as a JSON array
- Each event can have multiple reminders
- For recurring events, `nextOccurrenceAt` is used for display and reminder scheduling
- The `date` field represents the original event date (useful for editing recurring events)

#### Reminder
A reminder represents a single notification scheduled for an event:

```javascript
{
  id: string,                    // Unique identifier (e.g., "eventId_reminder_0_timestamp")
  eventId: string,               // Reference to parent event
  fireAtISO: string,             // ISO string - When the reminder should fire
  typeLabel: string,             // Human-readable label (e.g., "1 day before", "At start")
  enabled: boolean,              // Whether reminder is active
  notificationId: string | null  // Expo notification identifier (set when scheduled)
}
```

**Key Points:**
- Reminders are generated from `reminderPlan.preset` using `buildRemindersForEvent()`
- Each reminder has a calculated `fireAtISO` based on the event date and offset
- Reminders are stored within the event object, not separately
- The `notificationId` links the reminder to an actual scheduled notification in Expo

#### Notification (Expo Notification)
A notification is the actual system notification scheduled via Expo:

```javascript
{
  identifier: string,            // Expo notification ID (stored in reminder.notificationId)
  content: {
    title: string,               // "Event Name - 1 day before"
    body: string,                // "Event Name" 1 day before
    data: {
      eventId: string,
      reminderId: string,
      type: 'reminder'
    }
  },
  trigger: {
    type: 'timeInterval',
    seconds: number,             // Seconds from now until fire time
    repeats: false
  }
}
```

**Key Points:**
- Notifications are scheduled via `expo-notifications`
- Each notification is linked to a reminder via `reminder.notificationId`
- Notifications are scheduled with a time interval (seconds from now)
- Notifications do NOT repeat (they're one-time)

---

## Recurring Functionality

### Overview
Recurring events are **single events** that automatically "roll forward" to the next occurrence after the current one passes. They do NOT create multiple event instances.

### Recurrence Types
- `none` - Non-recurring (default)
- `daily` - Repeats every day
- `weekly` - Repeats every week
- `monthly` - Repeats every month (handles edge cases like Jan 31 → Feb 28)
- `yearly` - Repeats every year (handles Feb 29 → Feb 28 on non-leap years)

### Key Fields for Recurring Events

1. **`recurrence`**: The recurrence rule (`'none'`, `'daily'`, `'weekly'`, `'monthly'`, `'yearly'`)
2. **`nextOccurrenceAt`**: The date/time of the next occurrence (used for display and reminders)
3. **`originalDateAt`**: The original event date (preserved for editing)
4. **`date`**: The original event date (same as `originalDateAt` for non-recurring events)

### Roll-Forward Mechanism

When a recurring event's `nextOccurrenceAt` is in the past, it automatically "rolls forward" to the next occurrence:

```javascript
// Example: Weekly event on Dec 25, 2024
// After Dec 25 passes, nextOccurrenceAt becomes Jan 1, 2025
// The event itself doesn't duplicate - it just updates nextOccurrenceAt
```

**Roll-forward is triggered:**
- On app launch/resume
- When opening the event list screen
- When opening the reminders screen
- When viewing an event detail modal
- After a notification fires (on next app open)

**Implementation:**
- `rollForwardIfNeeded(event, now)` in `util/recurrence.js`
- Repeatedly calls `computeNextOccurrence()` until `nextOccurrenceAt` is in the future
- Has a max iteration limit (100) to prevent infinite loops
- Updates `nextOccurrenceAt` and preserves `originalDateAt`

### Edge Cases Handled

1. **Monthly edge cases**: Jan 31 → Feb 28/29 (clamps to last day of month)
2. **Yearly edge cases**: Feb 29 → Feb 28 on non-leap years
3. **Past recurring events**: Automatically roll forward to next future occurrence
4. **Multiple missed occurrences**: Rolls forward through all past occurrences in one pass

### Reminders for Recurring Events

- Reminders are built using `event.nextOccurrenceAt` (not `event.date`)
- When an event rolls forward, reminders are rebuilt and rescheduled
- Old notifications are cancelled, new ones are scheduled for the next occurrence
- Only reminders for the **next occurrence** are scheduled (not future occurrences)

---

## Pro Features

### Subscription Model
- **Product ID**: `com.chronox.app.pro.monthly`
- **Price**: $1.99/month
- **Platform**: Apple App Store (Android to follow)

### Pro Feature List

#### 1. Advanced Reminders
- **Free**: `off`, `simple` (1 reminder at start time)
- **Pro**: `off`, `simple`, `standard` (24h before + at start), `intense` (7 days, 24h, 1h before + at start)
- **No Custom Option**: Custom reminders have been removed entirely
- Free users see locked presets (Standard🔒, Intense🔒) with paywall on tap
- Tapping locked preset opens PaywallSheet with `feature='advanced_reminders'`

#### 2. Extended Notes
- **Free**: 100 characters max
- **Pro**: 5,000 characters max
- Character count enforced in UI

#### 3. Recurring Countdowns
- **Free**: Not available (locked, shows paywall on tap)
- **Pro**: Full access to all recurrence types (daily, weekly, monthly, yearly)
- Recurring events show a ↻ indicator and "Repeats {type}" subtitle

#### 4. No Ads
- **Free**: Ads displayed
- **Pro**: No ads

### Feature Gating

Features are gated using the `useEntitlements()` hook:

```javascript
const { isPro, hasFeature } = useEntitlements();

// Check if user has Pro
if (isPro) {
  // Show Pro features
}

// Check specific feature
if (hasFeature('long_notes')) {
  // Show extended notes
}
```

**Pro Feature Constants:**
- `advanced_reminders` - Standard & Intense reminder tiers
- `power_notes` - Extended notes features
- `notes_search` - Search notes
- `notes_overview` - All Notes screen
- `long_notes` - 5000 char limit (vs 100 for free)
- `unit_controls` - Hide seconds, show weeks/months
- `advanced_analytics` - Enhanced analytics
- `no_ads` - Ad-free experience
- `recurring_countdowns` - Recurring events

### Paywall Integration

- Paywall modal shown when free users try to access Pro features
- Tapping locked features opens `PaywallSheet` component
- Purchase flow handled via RevenueCat (`react-native-purchases`)
- Entitlements checked via `PurchasesProvider` context

---

## Notification to Event Relationship

### Architecture Flow

```
Event → Reminder Plan → Reminders → Notifications
```

### Step-by-Step Process

#### 1. Event Creation/Update
- User creates/edits an event with a `reminderPlan` (preset: `off`, `simple`, `standard`, `intense`)
- Event is saved to AsyncStorage

#### 2. Reminder Generation
- `buildRemindersForEvent(event, isPro)` is called
- Generates reminder objects based on `reminderPlan.preset`
- Each reminder has:
  - `fireAtISO`: Calculated from `event.nextOccurrenceAt || event.date` minus offset
  - `typeLabel`: Human-readable label (e.g., "1 day before")
  - `enabled`: Whether reminder is active

**Reminder Presets:**
- `off`: No reminders
- `simple`: 1 reminder at start time (offset: 0)
- `standard`: 2 reminders (24h before, at start) - **Pro only**
- `intense`: 4 reminders (7 days, 24h, 1h before, at start) - **Pro only**

#### 3. Notification Scheduling
- `syncScheduledReminders(events, isPro)` is called
- For each enabled reminder:
  - Calculates seconds until `fireAtISO`
  - Schedules Expo notification with time interval trigger
  - Stores `notificationId` in reminder object
  - Notification payload includes `eventId` and `reminderId` in `data`

#### 4. Notification Lifecycle

**Scheduling:**
```javascript
// When reminders are built/synced
reminder.notificationId = await Notifications.scheduleNotificationAsync({
  content: {
    title: "Event Name - 1 day before",
    body: "Event Name" 1 day before,
    data: { eventId, reminderId, type: 'reminder' }
  },
  trigger: { type: 'timeInterval', seconds: diffSeconds }
});
```

**Cancellation:**
- When event is deleted: All notifications for that `eventId` are cancelled
- When reminder is disabled: Notification with matching `reminderId` is cancelled
- When event rolls forward: Old notifications cancelled, new ones scheduled
- When reminder preset changes: Old notifications cancelled, new ones scheduled

**Recovery:**
- Legacy notifications (from older app versions) can be recovered
- `runNotificationRecovery()` matches scheduled notifications to events
- Rebuilds `reminders` array from existing notifications
- One-time recovery on app load

### Data Flow Diagram

```
┌─────────────┐
│   Event     │
│  (stored)   │
└──────┬──────┘
       │
       │ reminderPlan.preset
       ▼
┌─────────────┐
│  Reminders  │  ← Generated from preset
│  (in event) │
└──────┬──────┘
       │
       │ fireAtISO
       ▼
┌─────────────┐
│ Notifications│  ← Scheduled via Expo
│  (system)   │
└─────────────┘
```

### Key Relationships

1. **One Event → Many Reminders**
   - A single event can have multiple reminders (based on preset)
   - Each reminder is stored in `event.reminders[]`

2. **One Reminder → One Notification**
   - Each reminder maps to exactly one Expo notification
   - Link stored in `reminder.notificationId`

3. **Notification → Event (via payload)**
   - Notification `data.eventId` links back to event
   - Allows handling notification taps to navigate to event

4. **Recurring Events → Dynamic Reminders**
   - Reminders are rebuilt when event rolls forward
   - Old notifications cancelled, new ones scheduled
   - Always uses `nextOccurrenceAt` for reminder calculations

### Sync Process

The `syncScheduledReminders()` function ensures notifications stay in sync with reminders:

1. **Get all scheduled notifications** from Expo
2. **Build expected reminders** from all events
3. **Cancel orphaned notifications** (not in expected list)
4. **Schedule missing notifications** (in expected list but not scheduled)
5. **Skip already scheduled** (notificationId exists and is valid)

This ensures:
- No duplicate notifications
- No orphaned notifications
- Notifications match current reminder state
- Handles edge cases (app reinstalls, time changes, etc.)

---

## Storage

### AsyncStorage Keys

- `"countdowns"`: Array of event objects (JSON stringified)
- `"notes"`: Array of standalone notes (legacy, may be deprecated)
- `"@notification_recovery_completed"`: Flag for one-time notification recovery

### Data Persistence

- Events are saved immediately on create/update
- Reminders are stored within events (not separately)
- Notifications are scheduled in system (not persisted in AsyncStorage)
- Recovery mechanism rebuilds reminders from system notifications if needed

---

## Key Utilities

### `util/recurrence.js`
- `computeNextOccurrence()`: Calculates next occurrence date
- `rollForwardIfNeeded()`: Rolls forward past recurring events
- `getRecurrenceLabel()`: Human-readable labels
- `isRecurrencePro()`: Always returns true (recurrence is Pro-only)

### `util/reminderBuilder.js`
- `buildRemindersForEvent()`: Generates reminders from reminderPlan
- `getPresetOffsets()`: Gets time offsets for preset
- `createDefaultReminderPlan()`: Creates default reminder plan

### `util/reminderScheduler.js`
- `syncScheduledReminders()`: Syncs reminders with system notifications
- `cancelEventReminders()`: Cancels all notifications for an event

### `util/reminderPresets.js`
- Preset definitions and Pro gating
- `isPresetPro()`: Checks if preset requires Pro

### `util/notificationRecovery.js`
- `recoverLegacyNotifications()`: Recovers notifications from older app versions
- `runNotificationRecovery()`: One-time recovery runner

---

## Best Practices

1. **Always use `nextOccurrenceAt || date`** when calculating time until event
2. **Rebuild reminders** when event date changes or rolls forward
3. **Sync notifications** after any reminder changes
4. **Check Pro status** before showing Pro features
5. **Handle edge cases** for recurring events (monthly/yearly boundaries)
6. **Cancel old notifications** before scheduling new ones
7. **Use defensive coding** for missing fields (e.g., `event.recurrence || 'none'`)

---

## Future Considerations

- Custom reminder offsets (beyond presets)
- Recurring reminders (not just recurring events)
- Notification grouping/batching
- Timezone handling improvements
- Offline notification scheduling
- Notification actions (snooze, dismiss)

