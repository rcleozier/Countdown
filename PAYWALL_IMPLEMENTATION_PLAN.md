# Paywall Implementation Plan

## Files to Create

### Shared UI Primitives
1. `components/Pill.js` - Filter/sort chip component
2. `components/Card.js` - Reusable card component
3. `components/IconButton.js` - Icon button component
4. `components/SectionHeader.js` - Section header with title/subtitle
5. `components/SkeletonCard.js` - Loading skeleton card
6. `components/FabButton.js` - Floating action button
7. `components/BottomSheet.js` - Reusable bottom sheet component

### Pro Gating System
8. `hooks/useEntitlements.js` - Entitlements hook (local flag for now)
9. `components/ProBadge.js` - Pro badge indicator
10. `components/LockedRow.js` - Locked feature row component
11. `components/ProUpsellSheet.js` - Paywall bottom sheet

## Files to Modify

1. `screens/AnalyticsScreen.js` - KPI dashboard improvements
2. `screens/HomeScreen.js` - Events list, loading state, create modal
3. `components/CountdownItem.js` - Edit modal improvements
4. `App.js` - Loading state improvements (if needed)

## Pro Features (Paywalled)

1. **Custom Reminders** - Multiple reminders per event with custom offsets
2. **Notes** - Unlimited notes per event + search notes
3. **Advanced Templates** - Wedding, Flight, Exam packs + template editing
4. **Event Unit Controls** - Hide seconds, show weeks/months
5. **Smart Reminder Suggestions** - Escalating, "prep mode"

## Free Features

- Unlimited countdowns
- Basic reminders (one per event, simple preset)
- Basic templates
- Basic charts + KPIs
- Search by title
- Dark mode

