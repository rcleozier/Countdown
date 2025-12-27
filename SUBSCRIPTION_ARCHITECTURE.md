# Subscription Code Architecture (RevenueCat)

## Overview
The app implements a monthly subscription system using **RevenueCat** for iOS (Android support can be added later). RevenueCat simplifies subscription management by handling store connections, purchases, restore, entitlements, expiration validation, and receipt validation automatically.

## Product Configuration
- **Bundle ID**: `com.chronox.app`
- **Product ID**: `com.chronox.app.pro.monthly`
- **Type**: Auto-renewable monthly subscription
- **Price**: $1.99/month (configured in App Store Connect)
- **RevenueCat API Key (iOS)**: `appl_lbJizGKaENVDSBTckaxkybVnxTo`
- **Entitlement ID**: `pro`

## Final Paywall Rules

### Reminder Tiers
- **Free**: `off`, `simple`
- **Pro**: `off`, `simple`, `standard`, `intense`
- **No Custom Option**: Custom reminders have been removed entirely

### Notes Limit
- **Free**: 100 characters max
- **Pro**: 5,000 characters max

### Pro Features
- Advanced reminders (Standard & Intense tiers)
- Extended notes (up to 5,000 characters)
- Recurring countdowns
- No ads

## File Structure

### Core Billing Files

#### 1. `src/billing/PurchasesProvider.jsx`
**Purpose**: React Context Provider that manages subscription state using RevenueCat

**Key Responsibilities**:
- Configures RevenueCat SDK once on app boot
- Manages subscription state (`isPro`, `isLoading`, `activeProductId`)
- Handles purchase and restore flows
- Loads product offerings for display
- Refreshes subscription status on app resume (throttled)

**Key State**:
- `isPro` - Boolean derived ONLY from `customerInfo.entitlements.active['pro']` presence
- `isLoading` - Loading state during initialization/purchases
- `activeProductId` - Current subscription product ID
- `offerings` - Product information including full `current` offering and packages
- `__debug` - Debug info (dev only): isPro, activeEntitlement, timestamps, offering/package IDs

**Key Methods**:
- `initializePurchases()` - Configures RevenueCat SDK (only once)
- `refreshEntitlements()` - Fetches latest subscription status using `Purchases.getCustomerInfo()`
- `purchase(pkgId)` - Initiates purchase flow using `Purchases.purchasePackage()`
- `restore()` - Restores purchases using `Purchases.restorePurchases()` then updates state

**Important Features**:
- `Purchases.configure()` called once on app boot
- `Purchases.addCustomerInfoUpdateListener` keeps `isPro` reactive
- `isPro` derived ONLY from `info.entitlements.active['pro']` presence
- Offerings loaded via `Purchases.getOfferings()` and `offerings.current` stored
- AppState refresh throttled (max once every 60 seconds) as backup
- Restore calls `Purchases.restorePurchases()` then updates state

#### 2. `src/billing/PaywallSheet.jsx`
**Purpose**: UI component for the subscription paywall modal

**Key Responsibilities**:
- Displays subscription features and pricing
- Handles purchase button interactions
- Shows restore purchases option
- Displays error messages
- Provides "Not now" option

**Features Displayed**:
- Advanced reminders (Standard & Intense)
- Extended notes (up to 5,000 characters)
- Recurring countdowns
- No ads

**User Actions**:
- "Start Pro" - Initiates purchase via `Purchases.purchasePackage(selectedPackage)`
- "Restore Purchases" - Restores previous purchases
- "Not now" - Closes modal

**Implementation Details**:
- Uses `offerings.current.availablePackages` to find monthly package
- Displays price from `package.storeProduct.priceString`
- Handles `userCancelled` errors gracefully (no error shown)

#### 3. `src/billing/useEntitlements.js`
**Purpose**: Hook for feature gating throughout the app

**Key Responsibilities**:
- Provides `hasFeature(featureName)` to check if feature is available
- Provides `getLimit(featureName)` to get feature limits (free vs pro)
- Provides `getAllowedReminderTiers()` to get allowed reminder tiers based on Pro status
- Provides `isReminderTierAllowed(tier)` to check if a specific tier is allowed
- Defines FREE_FEATURES and PRO_FEATURES lists
- Defines FEATURE_LIMITS for notes

**Feature Lists**:
- **FREE_FEATURES**: Basic reminders (off, simple), basic notes (100 chars), unlimited countdowns, etc.
- **PRO_FEATURES**: Advanced reminders (standard, intense), long notes (5,000 chars), no ads, recurring countdowns, etc.

**Feature Limits**:
- Notes: 100 chars (free) vs 5,000 chars (pro)

**Reminder Tiers**:
- Free: `['off', 'simple']`
- Pro: `['off', 'simple', 'standard', 'intense']`

**Removed Features**:
- ❌ Custom reminders (removed entirely)
- ❌ Reminder count limits (replaced with tier-based gating)

## Data Flow

### 1. App Initialization
```
App.js → PurchasesProvider → Purchases.configure() (once)
  ↓
Set user attributes
  ↓
Add customerInfoUpdateListener (reactive updates)
  ↓
Refresh entitlements (getCustomerInfo)
  ↓
Load offerings (getOfferings)
  ↓
Store offerings.current
  ↓
Update state
```

### 2. Purchase Flow
```
User taps "Start Pro"
  ↓
PaywallSheet.handlePurchase()
  ↓
Get offerings.current.availablePackages
  ↓
Find monthly package
  ↓
Purchases.purchasePackage(selectedPackage)
  ↓
Store shows native purchase dialog
  ↓
CustomerInfoUpdateListener fires
  ↓
Update isPro from customerInfo.entitlements.active['pro']
  ↓
Show success alert
```

### 3. Restore Purchases
```
User taps "Restore Purchases"
  ↓
PurchasesProvider.restore()
  ↓
Purchases.restorePurchases()
  ↓
Update isPro from customerInfo.entitlements.active['pro']
  ↓
Refresh offerings
  ↓
Update state
  ↓
Show success/failure alert
```

### 4. Subscription Status Check
```
App resumes (AppState listener, throttled 60s)
  ↓
PurchasesProvider.refreshEntitlements()
  ↓
Purchases.getCustomerInfo()
  ↓
Check customerInfo.entitlements.active['pro']
  ↓
Update isPro state
```

## RevenueCat Benefits

### What RevenueCat Handles Automatically
✅ **Store Connection**: No manual connection management
✅ **Purchase Flow**: Simplified purchase API
✅ **Restore Purchases**: Single method call
✅ **Expiration Validation**: Automatic entitlement checking
✅ **Receipt Validation**: Server-side validation included
✅ **Cross-Platform**: Easy Android support later
✅ **Webhooks**: Real-time subscription updates
✅ **Analytics**: Built-in subscription analytics
✅ **Reactive Updates**: CustomerInfoUpdateListener keeps state in sync

### Simplified Code
- **Before**: ~694 lines (ExpoStoreAdapter + PurchasesProvider)
- **After**: ~300 lines (PurchasesProvider only) = **~57% reduction**

## Error Handling

### Purchase Errors
- **User Cancellation**: `err.userCancelled` flag, not treated as error (no alert shown)
- **Purchase Failed**: Shows error alert, tracks analytics
- **Network Errors**: Handled by RevenueCat SDK

### RevenueCat Errors
- **Configuration Errors**: Logged, falls back gracefully
- **API Failures**: Handled by SDK, state remains consistent

## Production Readiness Features

✅ **New Subscriptions**: Fully implemented via RevenueCat
✅ **Restore Purchases**: Single method call with state update
✅ **Cancellations**: Detected via entitlement status
✅ **Expirations**: Automatic validation by RevenueCat
✅ **Error Handling**: Comprehensive error handling
✅ **App State Refresh**: Throttled refresh on app resume (60s)
✅ **Analytics**: Tracks purchase events (started, success, failed, restore)
✅ **Server-Side Validation**: RevenueCat handles receipt validation
✅ **Reactive Updates**: CustomerInfoUpdateListener keeps state in sync

## Usage Examples

### Check if User is Pro
```javascript
import { usePurchases } from './src/billing/PurchasesProvider';

const { isPro } = usePurchases();
```

### Check if Feature is Available
```javascript
import { useEntitlements } from './src/billing/useEntitlements';

const { hasFeature } = useEntitlements();
const canUseRecurring = hasFeature('recurring_countdowns');
```

### Get Feature Limit
```javascript
const { getLimit } = useEntitlements();
const notesLimit = getLimit('notes'); // 100 (free) or 5000 (pro)
```

### Get Allowed Reminder Tiers
```javascript
const { getAllowedReminderTiers, isReminderTierAllowed } = useEntitlements();
const allowedTiers = getAllowedReminderTiers(); // ['off', 'simple'] or ['off', 'simple', 'standard', 'intense']
const canUseStandard = isReminderTierAllowed('standard'); // false (free) or true (pro)
```

### Show Paywall
```javascript
import PaywallSheet from './src/billing/PaywallSheet';

<PaywallSheet 
  visible={showPaywall} 
  onClose={() => setShowPaywall(false)}
  feature="advanced_reminders"
/>
```

## RevenueCat Dashboard Setup

### Required Configuration
1. **Create App** in RevenueCat dashboard
2. **Add iOS App** with bundle ID: `com.chronox.app`
3. **Create Entitlement**: `pro`
4. **Create Product**: `com.chronox.app.pro.monthly`
5. **Attach Product to Entitlement**: Link product to `pro` entitlement
6. **Configure Offering**: Set up default offering with monthly package

### Entitlement Configuration
- **Entitlement ID**: `pro`
- **Products**: `com.chronox.app.pro.monthly`
- **Type**: Subscription

## Integration Points

### App.js
- Wraps app with `<PurchasesProvider>`
- Provides subscription context to entire app

### Settings Screen
- Shows "Upgrade to Pro" card for free users
- Shows "Pro Active" status for Pro users
- Provides "Restore Purchases" button
- Provides "Manage Subscription" link
- **Dev Only**: Subscription Debug section showing isPro, activeEntitlement, timestamps, offering/package IDs

### Feature Gating
- Recurring countdowns: Pro-only
- Advanced reminders (Standard/Intense): Pro-only
- Long notes (5,000 chars): Pro-only
- No ads: Pro-only

### Reminder Selector UI
- Create/Edit Countdown modals show 4 options: Off, Simple, Standard🔒, Intense🔒
- Tapping locked option opens PaywallSheet with `feature='advanced_reminders'`
- Free users can only select Off or Simple
- Pro users can select any tier

## Testing Considerations

### Sandbox Testing
- Use sandbox test accounts from App Store Connect
- Test purchase flow end-to-end
- Test restore purchases
- Test expiration scenarios

### RevenueCat Test Mode
- RevenueCat automatically uses sandbox in development
- Test purchases work seamlessly
- No additional configuration needed

## Migration from Expo In-App Purchases

### What Changed
- ❌ Removed: `ExpoStoreAdapter.js` (426 lines)
- ✅ Simplified: `PurchasesProvider.jsx` (reduced from 268 to ~300 lines with better features)
- ✅ Added: CustomerInfoUpdateListener for reactive updates
- ✅ Added: Throttled AppState refresh (60s)
- ✅ Added: Debug info in dev mode
- ✅ Removed: Manual caching logic (RevenueCat handles it)
- ✅ Removed: Manual expiration validation (RevenueCat handles it)
- ✅ Removed: Manual store connection management (RevenueCat handles it)

### What Stayed the Same
- ✅ Same interface: `usePurchases()` hook
- ✅ Same UI: `PaywallSheet` component
- ✅ Same feature gating: `useEntitlements()` hook
- ✅ No changes needed in rest of app

## Future Enhancements

### Potential Additions
- Android support (just add Android API key)
- Promotional offers support
- Family Sharing support
- Subscription status webhooks
- A/B testing paywall variants
- Subscription analytics dashboard

## Notes

- RevenueCat handles all the complexity of store management
- Server-side receipt validation is automatic
- Cross-platform support is easy (just add Android API key)
- No manual caching or expiration checking needed
- All user-facing strings are internationalized through the locale system
- The code is much simpler and easier to maintain
- CustomerInfoUpdateListener ensures state stays in sync automatically
- Throttled AppState refresh prevents excessive API calls
