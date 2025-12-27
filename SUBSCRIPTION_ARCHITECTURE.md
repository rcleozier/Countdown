# Subscription Code Architecture (RevenueCat)

## Overview
The app implements a monthly subscription system using **RevenueCat** for iOS (Android support can be added later). RevenueCat simplifies subscription management by handling store connections, purchases, restore, entitlements, expiration validation, and receipt validation automatically.

## Product Configuration
- **Product ID**: `com.chronox.app.pro.monthly`
- **Type**: Auto-renewable monthly subscription
- **Price**: $1.99/month (configured in App Store Connect)
- **Entitlement ID**: `pro`

## File Structure

### Core Billing Files

#### 1. `src/billing/PurchasesProvider.jsx`
**Purpose**: React Context Provider that manages subscription state using RevenueCat

**Key Responsibilities**:
- Initializes RevenueCat SDK
- Manages subscription state (`isPro`, `isLoading`, `activeProductId`)
- Handles purchase and restore flows
- Loads product offerings for display
- Refreshes subscription status on app resume

**Key State**:
- `isPro` - Boolean indicating if user has active Pro subscription
- `isLoading` - Loading state during initialization/purchases
- `activeProductId` - Current subscription product ID
- `offerings` - Product information (price, title, etc.)

**Key Methods**:
- `initializePurchases()` - Configures RevenueCat SDK
- `refreshEntitlements()` - Fetches latest subscription status from RevenueCat
- `purchase(pkgId)` - Initiates purchase flow with analytics tracking
- `restore()` - Restores purchases and refreshes entitlements

**Important Features**:
- RevenueCat handles all store complexity (connection, purchases, expiration)
- Automatic entitlement validation
- No manual caching needed (RevenueCat handles it)
- Automatically refreshes on app resume (AppState listener)
- Handles user cancellation gracefully

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
- Extended notes (up to 5000 characters)
- Recurring countdowns
- No ads

**User Actions**:
- "Start Pro" - Initiates purchase
- "Restore Purchases" - Restores previous purchases
- "Not now" - Closes modal

#### 3. `src/billing/useEntitlements.js`
**Purpose**: Hook for feature gating throughout the app

**Key Responsibilities**:
- Provides `hasFeature(featureName)` to check if feature is available
- Provides `getLimit(featureName)` to get feature limits (free vs pro)
- Defines FREE_FEATURES and PRO_FEATURES lists
- Defines FEATURE_LIMITS for notes and reminders

**Feature Lists**:
- **FREE_FEATURES**: Basic reminders, basic notes (500 chars), unlimited countdowns, etc.
- **PRO_FEATURES**: Custom reminders, long notes (5000 chars), no ads, etc.

**Feature Limits**:
- Notes: 100 chars (free) vs 5000 chars (pro)
- Reminders: 1 per event (free) vs unlimited (pro)

## Data Flow

### 1. App Initialization
```
App.js → PurchasesProvider → Purchases.configure()
  ↓
Set user attributes
  ↓
Refresh entitlements (getCustomerInfo)
  ↓
Load offerings
  ↓
Update state
```

### 2. Purchase Flow
```
User taps "Start Pro"
  ↓
PaywallSheet.handlePurchase()
  ↓
PurchasesProvider.purchase()
  ↓
Purchases.getOfferings() → find package
  ↓
Purchases.purchasePackage()
  ↓
Store shows native purchase dialog
  ↓
RevenueCat validates purchase
  ↓
Refresh entitlements
  ↓
Update state
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
RevenueCat validates restored purchases
  ↓
Refresh entitlements
  ↓
Update state
  ↓
Show success/failure alert
```

### 4. Subscription Status Check
```
App resumes (AppState listener)
  ↓
PurchasesProvider.refreshEntitlements()
  ↓
Purchases.getCustomerInfo()
  ↓
Check entitlements.active['pro']
  ↓
Update state
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

### Simplified Code
- **Before**: ~426 lines (ExpoStoreAdapter) + ~268 lines (PurchasesProvider) = ~694 lines
- **After**: ~200 lines (PurchasesProvider only) = **~70% reduction**

## Error Handling

### Purchase Errors
- **User Cancellation**: `err.userCancelled` flag, not treated as error
- **Purchase Failed**: Shows error alert, tracks analytics
- **Network Errors**: Handled by RevenueCat SDK

### RevenueCat Errors
- **Configuration Errors**: Logged, falls back gracefully
- **API Failures**: Handled by SDK, state remains consistent

## Production Readiness Features

✅ **New Subscriptions**: Fully implemented via RevenueCat
✅ **Restore Purchases**: Single method call
✅ **Cancellations**: Detected via entitlement status
✅ **Expirations**: Automatic validation by RevenueCat
✅ **Error Handling**: Comprehensive error handling
✅ **App State Refresh**: Automatically refreshes on app resume
✅ **Analytics**: Tracks purchase events (started, success, failed, restore)
✅ **Server-Side Validation**: RevenueCat handles receipt validation

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

### Show Paywall
```javascript
import PaywallSheet from './src/billing/PaywallSheet';

<PaywallSheet 
  visible={showPaywall} 
  onClose={() => setShowPaywall(false)}
  feature="recurring_countdowns"
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

### Feature Gating
- Recurring countdowns: Pro-only
- Advanced reminders (Standard/Intense): Pro-only
- Long notes (5000 chars): Pro-only
- No ads: Pro-only

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
- ✅ Simplified: `PurchasesProvider.jsx` (reduced from 268 to ~200 lines)
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
