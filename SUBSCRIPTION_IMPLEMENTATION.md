# Subscription Implementation Summary

## Overview
Complete end-to-end subscription system implemented using `expo-in-app-purchases` with Free vs Pro feature gating, reduced ads, and full purchase/restore flow.

## Architecture

### Billing Layer (`src/billing/`)
- **ExpoStoreAdapter.js**: Store adapter interface using `expo-in-app-purchases`
  - Handles store connection, product fetching, purchases, restore, entitlements
  - Gracefully handles missing module (Expo Go/dev mode)
  - Purchase listener system for async purchase handling

- **PurchasesProvider.jsx**: React context provider for billing state
  - Manages `isPro` status, offerings, purchase/restore functions
  - Caches entitlements locally for fast boot
  - Refreshes from store in background
  - Product IDs: `com.chronox.app.pro.monthly`, `com.chronox.app.pro.yearly`

- **useEntitlements.js**: Hook for feature gating
  - `hasFeature(featureName)` - checks if feature is available
  - FREE_FEATURES: unlimited_countdowns, basic_reminders (1 per event), basic_templates, basic_charts, search_title, dark_mode, icons, progress_bar, filters, basic_sort
  - PRO_FEATURES: custom_reminders (multiple + custom offsets), notes, notes_search, unit_controls, advanced_templates, advanced_analytics, no_ads

- **gate.js**: Helper for feature gating
  - `requirePro(featureName, hasFeature, callbacks)` - gate function with onAllowed/onBlocked callbacks

- **PaywallSheet.jsx**: Bottom sheet paywall UI
  - Shows monthly/annual pricing options
  - "Upgrade to Pro" with 3 feature bullets
  - Restore purchases button
  - Loading states, error handling
  - Success toast on purchase

### Ads Layer (`src/ads/`)
- **AdProvider.jsx**: Context provider for ad management
  - `adsEnabled = !isPro` (Pro users see zero ads)
  - Frequency caps for free users:
    - Banner: Only on HomeScreen, below fold
    - Interstitial: Max 1 every 3 minutes, max 3 per day
    - Never within 60 seconds of app open
    - Only after meaningful actions (create_countdown, complete_navigation)
  - Session tracking, daily reset
  - `canShowBanner(screen)`, `canShowInterstitial(action)` helpers
  - `recordAdShown(type, placement)` for analytics

## Integration Points

### App.js
- Wrapped with `PurchasesProvider` and `AdProvider`
- Removed old `SubscriptionProvider`

### SettingsScreen.js
- Uses `usePurchases()` instead of `useSubscription()`
- Shows Pro status with visual indicator
- "Restore Purchases" button in Actions section
- Debug toggle (dev only) to force Pro on/off
- Opens `PaywallSheet` when subscription card tapped

### HomeScreen.js
- Should use `useEntitlements()` for feature gating
- Notes field should be gated (Pro only)
- "Customize reminders" should be gated (Pro only)
- Ads should use `useAds()` to check `canShowBanner('HomeScreen')`

### CountdownItem.js
- Notes editing should be gated (Pro only)
- Show Pro badge on locked features

### Components/Ads.js
- Should use `useAds()` hook
- Check `adsEnabled` and `canShowBanner()` before rendering
- Call `recordAdShown()` when ad displays

## Feature Gating Rules

### FREE (Core - Must Remain Usable)
- ✅ Unlimited events
- ✅ Countdown + progress bar
- ✅ Icons
- ✅ Basic reminder preset (Chill/Standard/Intense) - BUT only 1 reminder per event
- ✅ Search by title
- ✅ Upcoming/Past filters + basic sort
- ✅ Basic analytics cards/charts

### PRO (Paywalled)
- 🔒 Multiple reminders per event + custom offsets ("Customize reminders")
- 🔒 Notes per event (notes editor) + search notes
- 🔒 Advanced time display controls (hide seconds, show weeks/months)
- 🔒 Advanced templates (if/when reintroduced)
- 🔒 Any "advanced insights" / extra analytics
- 🔒 No ads

## Soft Paywall Behavior
- Don't block viewing existing data
- When user taps a locked control, show `PaywallSheet` with feature context
- Add "PRO" pill label on locked UI elements

## Product Configuration

### iOS (App Store Connect)
- Product ID: `com.chronox.app.pro.monthly` (Auto-renewable subscription, monthly)
- Product ID: `com.chronox.app.pro.yearly` (Auto-renewable subscription, yearly)

### Android (Google Play Console)
- Product ID: `com.chronox.app.pro.monthly` (Subscription, monthly)
- Product ID: `com.chronox.app.pro.yearly` (Subscription, yearly)

## Analytics Events
- `paywall_shown` - when paywall displayed (with feature context)
- `purchase_started` - when purchase initiated
- `purchase_success` - when purchase completes
- `purchase_failed` - when purchase fails (with error)
- `restore_started` - when restore initiated
- `restore_success` - when restore finds active subscription
- `restore_no_purchases` - when restore finds no purchases
- `restore_failed` - when restore fails (with error)
- `ad_shown` - when ad displays (type, placement)

## Offline Mode
- Uses cached `isPro` from AsyncStorage (`@entitlements_cache`)
- Cache expires after 1 hour
- Refreshes from store when available

## Debug Features (Dev Only)
- Debug toggle in Settings to force Pro on/off
- Updates cache directly (requires app restart to see changes)

## Next Steps
1. Update `HomeScreen.js` to gate Notes and Customize reminders
2. Update `CountdownItem.js` to gate Notes editing
3. Update `components/Ads.js` to use `AdProvider`
4. Test purchase flow on real devices
5. Configure products in App Store Connect / Google Play Console
6. Test restore purchases flow
7. Verify ads are completely disabled for Pro users

## Files Created/Modified

### Created:
- `src/billing/ExpoStoreAdapter.js`
- `src/billing/PurchasesProvider.jsx`
- `src/billing/useEntitlements.js`
- `src/billing/gate.js`
- `src/billing/PaywallSheet.jsx`
- `src/ads/AdProvider.jsx`

### Modified:
- `App.js` - Added PurchasesProvider and AdProvider
- `app.json` - Removed RevenueCat config
- `screens/SettingsScreen.js` - Updated to use new billing system
- `package.json` - Replaced react-native-purchases with expo-in-app-purchases

### To Update:
- `screens/HomeScreen.js` - Gate features, use AdProvider
- `components/CountdownItem.js` - Gate Notes, show Pro badges
- `components/Ads.js` - Use AdProvider

