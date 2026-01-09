import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import moment from 'moment';
import { Analytics } from '../../util/analytics';

// Android users get Pro features for free (but still see ads)
const IS_ANDROID = Platform.OS === 'android';

// Conditionally import Sentry (may not be available in all environments)
let Sentry = null;
try {
  Sentry = require('@sentry/react-native');
} catch (error) {
  // Sentry not available, will skip Sentry logging
}

// Conditionally import RevenueCat (may not be available in Expo Go)
let Purchases = null;
let PurchasesAvailable = false;

try {
  Purchases = require('react-native-purchases').default;
  if (Purchases && typeof Purchases.configure === 'function') {
    PurchasesAvailable = true;
  }
} catch (error) {
  console.warn('[Billing] react-native-purchases not available:', error.message);
}

// RevenueCat API Key
const REVENUECAT_API_KEY = Platform.OS === 'ios' 
  ? 'appl_lbJizGKaENVDSBTckaxkybVnxTo'
  : 'goog_YOUR_ANDROID_KEY'; // Update when adding Android

// Export entitlement ID for use in other files
export const ENTITLEMENT_ID = 'pro';

// Throttle AppState refresh (max once per 60 seconds)
const REFRESH_THROTTLE_MS = 60000;

// Optional debug mode: set to true to use a fixed user ID for testing
const DEBUG_MODE = __DEV__ && false; // Set to true to enable debug user ID
const DEBUG_USER_ID = 'debug-user-1';

// Retry configuration for entitlement propagation
// Using exponential backoff: 0.5s, 1.5s, 3s
const ENTITLEMENT_RETRY_DELAYS = [500, 1500, 3000]; // 3 retries with increasing delays
const ENTITLEMENT_RETRY_ATTEMPTS = ENTITLEMENT_RETRY_DELAYS.length;

const PurchasesContext = createContext(undefined);

export const PurchasesProvider = ({ children }) => {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeProductId, setActiveProductId] = useState(undefined);
  const [offerings, setOfferings] = useState(undefined);
  const [error, setError] = useState(undefined);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [customerInfoTimestamp, setCustomerInfoTimestamp] = useState(null);
  const [isFinishingSetup, setIsFinishingSetup] = useState(false);

  const lastRefreshRef = useRef(0);
  const isConfiguredRef = useRef(false);
  const entitlementMismatchWarnedRef = useRef(false); // Track if we've already warned about mismatch

  // Initialize RevenueCat once on app boot
  useEffect(() => {
    if (!PurchasesAvailable || !Purchases) {
      console.warn('[Billing] RevenueCat not available (Expo Go or simulator)');
      setIsLoading(false);
      return;
    }

    initializePurchases();
    
      // Set up customer info update listener for reactive updates
      let customerInfoUpdateListener = null;
      try {
        if (Purchases && typeof Purchases.addCustomerInfoUpdateListener === 'function') {
          customerInfoUpdateListener = Purchases.addCustomerInfoUpdateListener((customerInfo) => {
            logCustomerInfo(customerInfo, 'customerInfoUpdateListener');
            updateProStatus(customerInfo);
            setCustomerInfoTimestamp(new Date().toISOString());
          });
        }
      } catch (err) {
        console.warn('[Billing] Could not set up customer info listener:', err);
      }

    // Throttled AppState refresh as backup
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshRef.current;
        
        // Only refresh if it's been more than throttle period
        if (timeSinceLastRefresh >= REFRESH_THROTTLE_MS) {
          refreshEntitlements().catch(err => {
            console.error('[Billing] Error refreshing on app resume:', err);
          });
        }
      }
    });
    
    return () => {
      if (customerInfoUpdateListener) {
        try {
          customerInfoUpdateListener.remove();
        } catch (err) {
          console.warn('[Billing] Error removing customer info listener:', err);
        }
      }
      subscription.remove();
    };
  }, []);

  const initializePurchases = async () => {
    // Only configure once
    if (isConfiguredRef.current) {
      return;
    }

    // Android users get Pro for free - skip RevenueCat setup
    if (IS_ANDROID) {
      console.log('[Billing] Android detected - granting Pro features for free');
      setIsPro(true);
      setActiveProductId('android_free_pro');
      setIsLoading(false);
      return;
    }

    if (!PurchasesAvailable || !Purchases) {
      console.warn('[Billing] RevenueCat not available');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Configure RevenueCat (only once)
      await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
      isConfiguredRef.current = true;

      // Optional debug mode: log in with fixed user ID for testing
      if (DEBUG_MODE && Purchases.logIn) {
        try {
          const { customerInfo } = await Purchases.logIn(DEBUG_USER_ID);
          console.log(`[Billing] Debug mode: Logged in as ${DEBUG_USER_ID}`);
          logCustomerInfo(customerInfo, 'debug login');
        } catch (err) {
          console.warn('[Billing] Debug login failed:', err);
        }
      }
      
      // Set user attributes (optional, for analytics)
      if (Purchases.setAttributes) {
        await Purchases.setAttributes({
          platform: Platform.OS,
        });
      }

      // Load offerings and check entitlements
      await refreshEntitlements();
      
      // Log initial customer info after initialization
      try {
        const initialCustomerInfo = await Purchases.getCustomerInfo();
        logCustomerInfo(initialCustomerInfo, 'after initializePurchases()');
      } catch (err) {
        console.warn('[Billing] Error getting customer info after initialization (non-fatal):', err);
      }
    } catch (err) {
      console.error('[Billing] Error initializing purchases:', err);
      setError(err.message || 'Failed to initialize purchases');
      setIsPro(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Deep debug logging for CustomerInfo
   * Logs to console (dev) and Sentry (production) for debugging
   */
  const logCustomerInfo = (customerInfo, context = '') => {
    try {
      const activeEntitlementKeys = Object.keys(customerInfo.entitlements?.active || {});
      const allEntitlementKeys = Object.keys(customerInfo.entitlements?.all || {});
      const activeSubscriptions = customerInfo.activeSubscriptions || {};
      const appUserID = customerInfo.originalAppUserId || 'unknown';
      const proEntitlement = customerInfo.entitlements?.active?.[ENTITLEMENT_ID];
      
      // Get all purchased product identifiers
      const allPurchasedProductIdentifiers = customerInfo.allPurchasedProductIdentifiers || [];
      
      // Get latest expiration date if available
      const latestExpirationDate = customerInfo.latestExpirationDate || null;
      
      // Check for entitlement mapping mismatch
      const hasActiveSubscriptions = Object.keys(activeSubscriptions).length > 0;
      const hasActiveEntitlements = activeEntitlementKeys.length > 0;
      const hasProEntitlement = proEntitlement !== undefined;
      
      // Prepare structured data for Sentry
      const billingData = {
        context: context,
        appUserID: appUserID,
        expectedEntitlementId: ENTITLEMENT_ID,
        activeEntitlementKeys: activeEntitlementKeys,
        allEntitlementKeys: allEntitlementKeys,
        activeSubscriptions: Object.keys(activeSubscriptions),
        allPurchasedProductIdentifiers: allPurchasedProductIdentifiers,
        latestExpirationDate: latestExpirationDate,
        hasProEntitlement: hasProEntitlement,
        proEntitlement: proEntitlement ? {
          identifier: proEntitlement.identifier,
          productIdentifier: proEntitlement.productIdentifier,
          willRenew: proEntitlement.willRenew,
          periodType: proEntitlement.periodType,
          latestPurchaseDate: proEntitlement.latestPurchaseDate,
          expirationDate: proEntitlement.expirationDate,
        } : null,
        hasActiveSubscriptions: hasActiveSubscriptions,
        hasActiveEntitlements: hasActiveEntitlements,
        potentialMisconfig: hasActiveSubscriptions && !hasProEntitlement,
      };
      
      // Console logging (dev only)
      if (__DEV__) {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`[Billing] Customer Info ${context}:`);
        console.log(`  App User ID: ${appUserID}`);
        console.log(`  Active Entitlement Keys: [${activeEntitlementKeys.join(', ')}]`);
        console.log(`  All Entitlement Keys: [${allEntitlementKeys.join(', ')}]`);
        console.log(`  Active Subscriptions: [${Object.keys(activeSubscriptions).join(', ')}]`);
        console.log(`  All Purchased Product IDs: [${allPurchasedProductIdentifiers.join(', ')}]`);
        console.log(`  Latest Expiration Date: ${latestExpirationDate || 'N/A'}`);
        console.log(`  Expected Entitlement ID: "${ENTITLEMENT_ID}"`);
        console.log(`  Has Pro Entitlement: ${hasProEntitlement}`);
        
        if (proEntitlement) {
          console.log(`  Pro Entitlement Details:`, billingData.proEntitlement);
        } else {
          console.log(`  Pro Entitlement: null`);
        }
        
      // Warn about potential misconfigurations
      // Skip warnings during purchase/restore flows as delays are expected in sandbox
      const isDuringPurchaseFlow = context.includes('purchase') || context.includes('restore') || context.includes('retry') || context.includes('checkEntitlement');
      
      if (hasActiveSubscriptions && !hasActiveEntitlements && !isDuringPurchaseFlow) {
        console.warn(`  ⚠️  WARNING: Active subscriptions found but no active entitlements!`);
        console.warn(`     This suggests entitlement mapping may be misconfigured in RevenueCat dashboard.`);
        console.warn(`     Active subscriptions: ${Object.keys(activeSubscriptions).join(', ')}`);
      }
      
      // Only warn about entitlement mismatch if:
      // 1. Not during purchase flow (delays are expected in sandbox)
      // 2. Haven't warned already this session (to avoid spam)
      if (hasActiveSubscriptions && !hasProEntitlement && !isDuringPurchaseFlow && !entitlementMismatchWarnedRef.current) {
        entitlementMismatchWarnedRef.current = true; // Only warn once per session
        console.warn(`  ⚠️  WARNING: Active subscriptions exist but "${ENTITLEMENT_ID}" entitlement not found!`);
        console.warn(`     Active subscriptions: ${Object.keys(activeSubscriptions).join(', ')}`);
        console.warn(`     Active entitlements: [${activeEntitlementKeys.join(', ')}]`);
        console.warn(`     Check RevenueCat dashboard: Entitlement "${ENTITLEMENT_ID}" should be attached to product.`);
        
        // Send to Sentry only for persistent mismatches (not during purchase flows)
        if (Sentry) {
          Sentry.captureMessage(`Billing: Persistent entitlement mismatch detected`, {
            level: 'warning',
            tags: {
              context: context,
              expectedEntitlement: ENTITLEMENT_ID,
            },
            extra: billingData,
          });
        }
      }
      
      // Reset warning flag if entitlement is found (so we can warn again if it disappears)
      if (hasProEntitlement && entitlementMismatchWarnedRef.current) {
        entitlementMismatchWarnedRef.current = false;
      }
        
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      }
      
      // Send to Sentry (production and dev)
      if (Sentry) {
        // Add breadcrumb for tracking
        Sentry.addBreadcrumb({
          category: 'billing',
          message: `Customer Info: ${context}`,
          level: 'info',
          data: billingData,
        });
        
        // Note: Entitlement mismatch warnings are now handled above with session-based deduplication
        // to avoid spam during purchase flows where delays are expected
      }
    } catch (err) {
      console.warn('[Billing] Error logging customer info:', err);
      if (Sentry) {
        Sentry.captureException(err, {
          tags: { context: 'logCustomerInfo' },
        });
      }
    }
  };

  const updateProStatus = (customerInfo) => {
    // Log customer info for debugging (dev only)
    logCustomerInfo(customerInfo, 'updateProStatus');
    
    // Android users always have Pro features (but still see ads)
    if (IS_ANDROID) {
      setIsPro(true);
      setActiveProductId('android_free_pro');
      return;
    }
    
    // iOS: Derive isPro ONLY from entitlements.active['pro'] presence
    const isPremium = customerInfo.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
    
    setIsPro(isPremium);
    
    // Get active product ID if premium
    if (isPremium) {
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      setActiveProductId(entitlement?.productIdentifier);
    } else {
      setActiveProductId(undefined);
    }
  };

  const refreshEntitlements = useCallback(async () => {
    // Android users get Pro for free - skip RevenueCat
    if (IS_ANDROID) {
      setIsPro(true);
      setActiveProductId('android_free_pro');
      setError(undefined);
      return;
    }

    if (!PurchasesAvailable || !Purchases) {
      setError(undefined);
      return;
    }

    try {
      // Get customer info (includes entitlements)
      const customerInfo = await Purchases.getCustomerInfo();
      
      // Log customer info for debugging (dev only)
      logCustomerInfo(customerInfo, 'refreshEntitlements');
      
      // Update Pro status
      updateProStatus(customerInfo);
      setCustomerInfoTimestamp(new Date().toISOString());

      // Load offerings and store offerings.current
      let offeringsData;
      try {
        offeringsData = await Purchases.getOfferings();
      } catch (offeringsErr) {
        // Catch RevenueCat configuration errors and handle gracefully
        const errorMsg = offeringsErr?.message || '';
        const isConfigError = 
          errorMsg.includes('configuration') ||
          errorMsg.includes('could not be fetched') ||
          errorMsg.includes('StoreKit Configuration') ||
          errorMsg.includes('App Store Connect');
        
        if (isConfigError) {
          // Configuration errors are developer issues, not user issues
          // Log to Sentry but don't show to users
          console.warn('[Billing] ⚠️  Configuration error (hidden from user):', errorMsg);
          if (Sentry) {
            Sentry.captureMessage('Billing: RevenueCat configuration error', {
              level: 'warning',
              tags: { context: 'refreshEntitlements', type: 'configuration' },
              extra: { error: errorMsg, hasOfferings: false },
            });
          }
          setOfferings(undefined);
          setError(undefined); // Don't show config errors to users
          return;
        }
        // Re-throw non-config errors
        throw offeringsErr;
      }
      
      // Sanity check: Warn if offerings is null/empty
      if (!offeringsData || !offeringsData.current) {
        console.warn('[Billing] ⚠️  WARNING: No current offering available!');
        console.warn('     This may indicate a RevenueCat configuration issue.');
        if (Sentry) {
          Sentry.captureMessage('Billing: No current offering available', {
            level: 'warning',
            tags: { context: 'refreshEntitlements' },
            extra: { hasOfferings: !!offeringsData, hasCurrent: !!offeringsData?.current },
          });
        }
        setOfferings(undefined);
        setError(undefined); // Don't show config issues to users
        return;
      }
      
      if (offeringsData.current.availablePackages && offeringsData.current.availablePackages.length === 0) {
        console.warn('[Billing] ⚠️  WARNING: Current offering has no available packages!');
        if (Sentry) {
          Sentry.captureMessage('Billing: Current offering has no packages', {
            level: 'warning',
            tags: { context: 'refreshEntitlements' },
          });
        }
      }
      
      if (offeringsData.current) {
        // Store the full current offering
        const currentOffering = offeringsData.current;
        
        // Find monthly package (or first package as fallback)
        const monthlyPackage = currentOffering.availablePackages?.find(
          pkg => pkg && (pkg.identifier === 'monthly' || pkg.packageType === 'MONTHLY')
        ) || currentOffering.availablePackages?.[0];

        if (monthlyPackage && monthlyPackage.storeProduct) {
          const product = monthlyPackage.storeProduct;
      setOfferings({
            current: currentOffering,
            monthly: {
              identifier: monthlyPackage.identifier,
              package: monthlyPackage, // Store full package for purchase
          product: {
                identifier: product.identifier || '',
                title: product.title || '',
                description: product.description || '',
                price: product.priceString || '',
                priceString: product.priceString || '',
                currencyCode: product.currencyCode || 'USD',
          },
            },
          });
        } else {
          // Store offering even if no packages found
          setOfferings({
            current: currentOffering,
            monthly: undefined,
          });
        }
      } else {
        setOfferings(undefined);
      }

      setLastRefreshTime(new Date().toISOString());
      lastRefreshRef.current = Date.now();
      setError(undefined);
    } catch (err) {
      console.error('[Billing] Error refreshing entitlements:', err);
      
      // Filter out configuration errors that users can't fix
      const errorMsg = err?.message || '';
      const isConfigError = 
        errorMsg.includes('configuration') ||
        errorMsg.includes('could not be fetched') ||
        errorMsg.includes('StoreKit Configuration') ||
        errorMsg.includes('App Store Connect') ||
        errorMsg.includes('None of the products registered');
      
      if (isConfigError) {
        // Configuration errors are developer issues - log but don't show to users
        console.warn('[Billing] Configuration error (hidden from user):', errorMsg);
        if (Sentry) {
          Sentry.captureMessage('Billing: RevenueCat configuration error in refreshEntitlements', {
            level: 'warning',
            tags: { context: 'refreshEntitlements', type: 'configuration' },
            extra: { error: errorMsg },
          });
        }
        setError(undefined); // Don't show config errors to users
      } else {
        // Show other errors (network issues, etc.)
        setError(err.message || 'Failed to refresh entitlements');
      }
    }
  }, []);

  /**
   * Check entitlement with exponential backoff retry logic
   * Returns { success: boolean, customerInfo: CustomerInfo | null, activeEntitlementKeys: string[] }
   */
  const checkEntitlementWithRetry = async (attempt = 0) => {
    if (!PurchasesAvailable || !Purchases) {
      return { success: false, customerInfo: null, activeEntitlementKeys: [] };
    }

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      logCustomerInfo(customerInfo, `checkEntitlementWithRetry (attempt ${attempt + 1}/${ENTITLEMENT_RETRY_ATTEMPTS})`);
      
      const activeEntitlementKeys = Object.keys(customerInfo.entitlements?.active || {});
      const isPremium = customerInfo.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
      
      if (isPremium) {
        updateProStatus(customerInfo);
        setCustomerInfoTimestamp(new Date().toISOString());
        return { success: true, customerInfo, activeEntitlementKeys };
      }
      
      // If not active and we have retries left, wait and retry with exponential backoff
      if (attempt < ENTITLEMENT_RETRY_ATTEMPTS - 1) {
        const delay = ENTITLEMENT_RETRY_DELAYS[attempt];
        console.log(`[Billing] Entitlement not active yet, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return checkEntitlementWithRetry(attempt + 1);
      }
      
      // Final attempt failed
      return { success: false, customerInfo, activeEntitlementKeys };
    } catch (err) {
      console.error(`[Billing] Error checking entitlement (attempt ${attempt + 1}):`, err);
      return { success: false, customerInfo: null, activeEntitlementKeys: [] };
    }
  };

  const purchase = useCallback(async (pkgId) => {
    if (!PurchasesAvailable || !Purchases) {
      throw new Error('RevenueCat not available');
    }

    try {
      setIsLoading(true);
      setError(undefined);
      setIsFinishingSetup(false);

      // Get offerings to find the package
      let offeringsData;
      try {
        offeringsData = await Purchases.getOfferings();
      } catch (offeringsErr) {
        // Catch RevenueCat configuration errors
        const errorMsg = offeringsErr?.message || '';
        const isConfigError = 
          errorMsg.includes('configuration') ||
          errorMsg.includes('could not be fetched') ||
          errorMsg.includes('StoreKit Configuration') ||
          errorMsg.includes('App Store Connect');
        
        if (isConfigError) {
          // Configuration errors - log but show user-friendly message
          console.warn('[Billing] Configuration error during purchase:', errorMsg);
          if (Sentry) {
            Sentry.captureMessage('Billing: RevenueCat configuration error during purchase', {
              level: 'warning',
              tags: { context: 'purchase', type: 'configuration' },
              extra: { error: errorMsg },
            });
          }
          throw new Error('Subscription service is temporarily unavailable. Please try again later or contact support.');
        }
        throw offeringsErr;
      }
      
      // Sanity check: Warn if offerings is null/empty
      if (!offeringsData || !offeringsData.current) {
        console.error('[Billing] No offerings available!');
        throw new Error('No subscription options available. Please check your internet connection and try again.');
      }
      
      if (!offeringsData.current.availablePackages || offeringsData.current.availablePackages.length === 0) {
        console.error('[Billing] No packages available in current offering!');
        throw new Error('No subscription packages available.');
      }

      // Find the package (use identifier or default to monthly)
      const packageToPurchase = offeringsData.current.availablePackages.find(
        pkg => pkg.identifier === pkgId || (pkgId === 'monthly' && pkg.packageType === 'MONTHLY')
      ) || offeringsData.current.availablePackages[0];

      if (!packageToPurchase) {
        throw new Error('Package not found');
      }
      
      // Log package details before purchase
      const productIdentifier = packageToPurchase.storeProduct?.identifier || 'unknown';
      console.log('[Billing] Purchase Details:', {
        packageIdentifier: packageToPurchase.identifier,
        packageType: packageToPurchase.packageType,
        productIdentifier: productIdentifier,
        productPrice: packageToPurchase.storeProduct?.priceString || 'N/A',
        expectedEntitlementId: ENTITLEMENT_ID,
      });

      Analytics.trackEvent('purchase_started', {
        product: packageToPurchase.identifier,
        productId: productIdentifier,
      });

      // Make purchase using purchasePackage
      const { customerInfo: purchaseCustomerInfo } = await Purchases.purchasePackage(packageToPurchase);
      
      // Log customer info immediately after purchase
      logCustomerInfo(purchaseCustomerInfo, 'after purchasePackage()');
      
      // Immediately get fresh customer info (RevenueCat may have updated it)
      let customerInfo = purchaseCustomerInfo;
      try {
        customerInfo = await Purchases.getCustomerInfo();
        logCustomerInfo(customerInfo, 'after purchasePackage() + getCustomerInfo()');
      } catch (err) {
        console.warn('[Billing] Error getting fresh customer info after purchase (non-fatal):', err);
        // Use purchaseCustomerInfo if fresh fetch fails
      }
      
      // Check if entitlement is active immediately
      const isPremiumImmediate = customerInfo.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
      
      if (isPremiumImmediate) {
        // Entitlement is active immediately - success!
        updateProStatus(customerInfo);
        setCustomerInfoTimestamp(new Date().toISOString());
        await refreshEntitlements();
        
        Analytics.trackEvent('purchase_success', {
          product: packageToPurchase.identifier,
          immediate: true,
        });
        return; // Success, exit early
      }
      
      // Entitlement not active yet - show "Finishing setup..." and retry with exponential backoff
      setIsFinishingSetup(true);
      console.log('[Billing] Entitlement not active immediately, starting retry sequence...');
      
      const retryResult = await checkEntitlementWithRetry();
      
      if (retryResult.success && retryResult.customerInfo) {
        // Retry succeeded!
        setIsFinishingSetup(false);
        updateProStatus(retryResult.customerInfo);
        setCustomerInfoTimestamp(new Date().toISOString());
        await refreshEntitlements();
        
        Analytics.trackEvent('purchase_success', {
          product: packageToPurchase.identifier,
          delayed: true,
          retries: true,
        });
        return; // Success after retries
      }
      
      // Still not active after retries - try restoring purchases automatically
      console.warn('[Billing] Purchase completed but entitlement not active after retries. Attempting restore...');
      if (Sentry) {
        Sentry.captureMessage('Billing: Entitlement not active after purchase retries', {
          level: 'warning',
          tags: {
            context: 'purchase',
            product: packageToPurchase.identifier,
            expectedEntitlement: ENTITLEMENT_ID,
          },
          extra: {
            retryResult: retryResult,
            packageIdentifier: packageToPurchase.identifier,
            productIdentifier: packageToPurchase.storeProduct?.identifier,
          },
        });
      }
      
      try {
        const restoredCustomerInfo = await Purchases.restorePurchases();
        logCustomerInfo(restoredCustomerInfo, 'restore after purchase delay');
        
        const isPremiumAfterRestore = restoredCustomerInfo.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
        
        if (isPremiumAfterRestore) {
          // Restore fixed it!
          setIsFinishingSetup(false);
          updateProStatus(restoredCustomerInfo);
          setCustomerInfoTimestamp(new Date().toISOString());
          await refreshEntitlements();
          
          Analytics.trackEvent('purchase_success', {
            product: packageToPurchase.identifier,
            delayed: true,
            restored: true,
          });
          return; // Success after restore
        }
        
        // Still not active even after restore - build helpful error message
        setIsFinishingSetup(false);
        const activeEntitlementKeys = Object.keys(restoredCustomerInfo.entitlements?.active || {});
        const activeSubscriptions = Object.keys(restoredCustomerInfo.activeSubscriptions || {});
        
        let errorMessage = 'Purchase completed, but subscription activation is delayed.';
        if (activeEntitlementKeys.length > 0) {
          errorMessage += ` Found entitlements: ${activeEntitlementKeys.join(', ')}.`;
        }
        if (activeSubscriptions.length > 0) {
          errorMessage += ` Active subscriptions: ${activeSubscriptions.join(', ')}.`;
        }
        errorMessage += ` Please tap "Restore Purchases" to sync your subscription.`;
        
        console.warn('[Billing] Purchase completed but entitlement not active even after restore:', {
          expectedEntitlementId: ENTITLEMENT_ID,
          activeEntitlementKeys,
          activeSubscriptions,
        });
        
        if (Sentry) {
          Sentry.captureMessage('Billing: Entitlement not active after purchase and restore', {
            level: 'error',
            tags: {
              context: 'purchase',
              product: packageToPurchase.identifier,
              expectedEntitlement: ENTITLEMENT_ID,
            },
            extra: {
              expectedEntitlementId: ENTITLEMENT_ID,
              activeEntitlementKeys,
              activeSubscriptions,
              packageIdentifier: packageToPurchase.identifier,
              productIdentifier: packageToPurchase.storeProduct?.identifier,
              errorMessage,
            },
          });
        }
        
        setError(errorMessage);
        Analytics.trackEvent('purchase_entitlement_delayed', {
          product: packageToPurchase.identifier,
          restored: true,
          activeEntitlements: activeEntitlementKeys,
          activeSubscriptions,
        });
      } catch (restoreErr) {
        // Restore failed - show error with context
        setIsFinishingSetup(false);
        console.error('[Billing] Error restoring after purchase:', restoreErr);
        
        const activeEntitlementKeys = retryResult.activeEntitlementKeys || [];
        let errorMessage = 'Purchase completed, but subscription activation is delayed.';
        if (activeEntitlementKeys.length > 0) {
          errorMessage += ` Found entitlements: ${activeEntitlementKeys.join(', ')}.`;
        }
        errorMessage += ` Please try "Restore Purchases" or contact support if the issue persists.`;
        
        setError(errorMessage);
        Analytics.trackEvent('purchase_entitlement_delayed', {
          product: packageToPurchase.identifier,
          restore_failed: true,
          restore_error: restoreErr.message,
        });
      }
    } catch (err) {
      // Extract error details for better detection
      const errorMessage = err.message || '';
      const errorString = JSON.stringify(err).toLowerCase();
      const errorCode = err.code;
      
      // Check for authentication failures (sandbox account issues)
      // These often come wrapped as "cancelled" by RevenueCat but are actually auth failures
      const isAuthError = 
        errorMessage.includes('Authentication Failed') ||
        errorMessage.includes('authentication failed') ||
        errorMessage.includes('Password reuse not available') ||
        errorMessage.includes('AMSErrorDomain') ||
        errorString.includes('amserrordomain') ||
        errorString.includes('authentication failed') ||
        errorString.includes('password reuse') ||
        errorCode === 530 ||
        (errorCode === 100 && errorString.includes('authentication'));
      
      // Check for user cancellation - this is NOT an error, handle silently
      // Only treat as cancellation if it's NOT an auth error
      const isUserCancelled = 
        (err.userCancelled && !isAuthError) || 
        (errorMessage.includes('cancelled') && !isAuthError && !errorMessage.includes('entitlement')) ||
        (errorMessage.includes('canceled') && !isAuthError && !errorMessage.includes('entitlement'));
      
      if (isUserCancelled) {
        // User cancelled - log at info level, don't show error, don't throw
        if (__DEV__) {
          console.log('[Billing] Purchase cancelled by user (silent)');
        }
        setIsLoading(false);
        setIsFinishingSetup(false);
        return; // Silent return, no error shown
      }

      // Handle authentication failures with helpful message
      if (isAuthError) {
        const authErrorMsg = 'Authentication failed. Please check your sandbox account settings or try signing out and back in.';
        console.warn('[Billing] Purchase authentication failure:', {
          message: errorMessage,
          code: errorCode,
          error: err
        });
        setError(authErrorMsg);
        
        Analytics.trackEvent('purchase_failed', {
          error: 'authentication_failed',
          product: pkgId,
        });
        
        throw new Error(authErrorMsg);
      }
      
      // This is an actual purchase error (purchasePackage threw)
      // Log the error with full context
      console.error('[Billing] Purchase error (purchasePackage failed):', {
        message: errorMessage,
        code: errorCode,
        userCancelled: err.userCancelled,
        error: err
      });
      
      if (Sentry) {
        Sentry.captureException(err, {
          tags: {
            context: 'purchase',
            product: pkgId,
            isAuthError: isAuthError,
            isUserCancelled: isUserCancelled,
          },
          extra: {
            errorMessage,
            errorCode,
            userCancelled: err.userCancelled,
            errorString: errorString,
          },
        });
      }
      
      setIsFinishingSetup(false);
      const errorMsg = errorMessage || 'Purchase failed. Please try again.';
      setError(errorMsg);
      
      Analytics.trackEvent('purchase_failed', {
        error: errorMsg,
        product: pkgId,
        errorCode: errorCode,
      });
      
      throw err; // Re-throw so UI can handle it
    } finally {
      setIsLoading(false);
      // Note: setIsFinishingSetup is handled in each branch above
    }
  }, [refreshEntitlements, checkEntitlementWithRetry]);

  const restore = useCallback(async () => {
    if (!PurchasesAvailable || !Purchases) {
      throw new Error('RevenueCat not available');
    }

    try {
      setIsLoading(true);
      setError(undefined);

      Analytics.trackEvent('restore_started', {});

      // Restore purchases - this syncs with the store
      const customerInfo = await Purchases.restorePurchases();
      
      // Log customer info for debugging (dev only)
      logCustomerInfo(customerInfo, 'restorePurchases()');
      
      // Check entitlement status immediately from restored customerInfo
      const isPremium = customerInfo.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
      
      // Update status from customerInfo immediately
      updateProStatus(customerInfo);
      setCustomerInfoTimestamp(new Date().toISOString());
      
      // Refresh entitlements to get latest state (this also loads offerings)
      try {
        await refreshEntitlements();
      } catch (refreshErr) {
        // If refresh fails, we still have the restored customerInfo, so log but don't fail
        console.warn('[Billing] Error refreshing after restore (non-fatal):', refreshErr);
      }
      
      // Get fresh customer info to check final status (double-check)
      let finalCustomerInfo = customerInfo;
      try {
        finalCustomerInfo = await Purchases.getCustomerInfo();
        logCustomerInfo(finalCustomerInfo, 'restore after refresh');
        
        // Use the freshest entitlement status
        const finalIsPremium = finalCustomerInfo.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
        if (finalIsPremium !== isPremium) {
          // Status changed, update again
          updateProStatus(finalCustomerInfo);
        }
      } catch (getInfoErr) {
        // If getCustomerInfo fails, use the restored customerInfo
        console.warn('[Billing] Error getting fresh customer info (non-fatal):', getInfoErr);
      }
      
      const finalIsPremium = finalCustomerInfo.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
      
      if (finalIsPremium) {
        Analytics.trackEvent('restore_success', {});
        return { success: true, hasActiveSubscription: true };
      } else {
        Analytics.trackEvent('restore_no_purchases', {});
        return { success: true, hasActiveSubscription: false };
      }
    } catch (err) {
      console.error('[Billing] Error restoring purchases:', err);
      const errorMsg = err.message || 'Failed to restore purchases';
      setError(errorMsg);
      
      Analytics.trackEvent('restore_failed', {
        error: errorMsg,
      });
      
      // Throw error so UI can handle it
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshEntitlements]);

  const value = {
    isPro,
    isLoading,
    isFinishingSetup,
    activeProductId,
    purchase,
    restore,
    refresh: refreshEntitlements,
    offerings,
    error,
    // Debug info (dev only)
    __debug: __DEV__ ? {
      isPro,
      activeEntitlement: isPro ? ENTITLEMENT_ID : null,
      entitlementId: ENTITLEMENT_ID,
      lastCustomerInfoFetch: customerInfoTimestamp,
      lastRefresh: lastRefreshTime,
      currentOfferingId: offerings?.current?.identifier,
      monthlyPackageId: offerings?.monthly?.identifier,
      debugMode: DEBUG_MODE,
      debugUserId: DEBUG_MODE ? DEBUG_USER_ID : null,
    } : undefined,
  };

  return (
    <PurchasesContext.Provider value={value}>
      {children}
    </PurchasesContext.Provider>
  );
};

export const usePurchases = () => {
  const context = useContext(PurchasesContext);
  if (!context) {
    throw new Error('usePurchases must be used within PurchasesProvider');
  }
  return context;
};
