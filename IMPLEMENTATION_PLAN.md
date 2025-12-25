# Implementation Plan: Pro Features Foundation

## Overview
Adding 5 core features: i18n, Event Notes, Templates, Reminder Presets, and Search/Filter.

---

## Step 1: Internationalization (i18n) Foundation

### Files to Create:
- `util/i18n.js` - i18n system with locale detection
- `locales/en.json` - English translations
- `locales/hi.json` - Hindi translations  
- `locales/es.json` - Spanish translations
- `context/LocaleContext.js` - Locale context provider (similar to ThemeContext)

### Files to Modify:
- `App.js` - Wrap app with LocaleProvider
- `context/ThemeContext.js` - Add RTL support detection
- All screen files - Replace hardcoded strings with i18n keys
- `components/CountdownItem.js` - Replace strings

### Key Features:
- Auto-detect device locale on first launch
- Store locale preference in AsyncStorage
- RTL readiness (layout direction support)
- DEV-only RTL toggle in Settings
- Locale-aware date/time formatting using Intl APIs

---

## Step 2: Event Data Model Updates

### Files to Create:
- `util/eventMigration.js` - Migration layer for existing events

### Files to Modify:
- All files that read/write countdowns from AsyncStorage

### Schema Changes:
```javascript
{
  id: string,
  name: string,
  icon: string,
  date: string (ISO),
  createdAt: string (ISO),
  notificationId: string | null,
  // NEW FIELDS:
  notes: string, // Plain text notes
  templateId: string | null, // Template used
  reminderPresetId: string | null, // Preset used
  reminders: Array<{offset: number, unit: 'days'|'weeks'|'months'}> // Multiple reminders
}
```

---

## Step 3: Event Notes (Per Countdown)

### Files to Create:
- `components/NotesEditor.js` - Reusable notes editor component

### Files to Modify:
- `components/CountdownItem.js` - Add notes display and edit button
- `screens/HomeScreen.js` - Handle notes in event creation/editing
- Event detail modal - Add notes section

### Features:
- Unlimited plain-text notes per event
- Autosave with debounce (500ms)
- Store in event record (normalized)
- Clear UI affordance ("Add note" / "Edit note")

---

## Step 4: Event Templates

### Files to Create:
- `util/eventTemplates.js` - Template definitions
- `components/TemplatePicker.js` - Template selection UI

### Files to Modify:
- `screens/HomeScreen.js` - Add template picker to create flow
- `components/CountdownItem.js` - Show template info if used

### Templates:
1. Birthday - 🎂, default title pattern, 1 day reminder
2. Trip - ✈️, default title pattern, 1 week + 1 day
3. Exam - 📝, default title pattern, 1 week + 1 day
4. Wedding - 💒, default title pattern, 1 month + 1 week + 1 day
5. Flight - 🛫, default title pattern, 1 day
6. Appointment - 📅, default title pattern, 1 day

All template names and patterns must be i18n'd.

---

## Step 5: Smarter Reminder Presets

### Files to Create:
- `util/reminderPresets.js` - Preset definitions
- `components/ReminderPresetSelector.js` - Preset selection UI
- `components/ReminderEditor.js` - Custom reminder editor

### Files to Modify:
- `screens/HomeScreen.js` - Add reminder preset selector
- `components/CountdownItem.js` - Show reminders, allow editing
- Notification scheduling logic - Support multiple reminders

### Presets:
- "Chill": 1 day before
- "Standard": 1 week + 1 day before
- "Intense": 1 month + 1 week + 1 day before

### Features:
- Selectable as chips
- Editable (add/remove reminders)
- Locale-friendly phrasing ("1 week before", pluralization)
- Store as offsets array in event

---

## Step 6: Search + Filters

### Files to Create:
- `components/SearchBar.js` - Search input component
- `components/FilterBar.js` - Filter chips component

### Files to Modify:
- `screens/HomeScreen.js` - Add search and filter UI
- `screens/PastScreen.js` - Add search and filter UI

### Features:
- Search over event title AND notes
- Filters:
  - Upcoming / Past toggle
  - Sort: Soonest, Recently Added
  - Optional: Template filter
- Debounced input (300ms)
- Works offline with local data
- Fast performance

---

## Step 7: Settings Screen Updates

### Files to Modify:
- `screens/SettingsScreen.js` - Add language selector + dev RTL toggle

### Features:
- Language picker (English, Hindi, Spanish)
- DEV-only RTL toggle (if __DEV__)
- Locale-aware date/time format preview

---

## Migration Strategy

1. On app start, check if events have new fields
2. If missing, run migration:
   - Add empty `notes: ""`
   - Add `templateId: null`
   - Add `reminderPresetId: null`
   - Convert single `notificationId` to `reminders: []` array
3. Preserve all existing data
4. Run migration once per user

---

## Android Compatibility Notes

- Use `react-native-localize` or `expo-localization` for locale detection (works on both platforms)
- Intl APIs are available on both iOS and Android
- RTL support: Use `I18nManager` from React Native
- Date formatting: Use `Intl.DateTimeFormat` (cross-platform)
- No iOS-only APIs needed

---

## Expo Config Changes

- No additional native modules required
- All features use existing dependencies
- RTL support is built into React Native

---

## Implementation Order

1. i18n foundation + translations
2. Data model migration
3. Event Notes
4. Templates
5. Reminder Presets
6. Search + Filters
7. Settings updates

