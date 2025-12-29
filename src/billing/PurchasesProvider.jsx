import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import { Analytics } from '../../util/analytics';

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
const ENTITLEMENT_RETRY_ATTEMPTS = 3;
const ENTITLEMENT_RETRY_DELAY_MS = 2000; // 2 seconds between retries

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
    } catch (err) {
      console.error('[Billing] Error initializing purchases:', err);
      setError(err.message || 'Failed to initialize purchases');
      setIsPro(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logCustomerInfo = (customerInfo, context = '') => {
    if (!__DEV__) return;
    
    try {
      const activeEntitlementKeys = Object.keys(customerInfo.entitlements?.active || {});
      const allEntitlementKeys = Object.keys(customerInfo.entitlements?.all || {});
      const activeSubscriptions = customerInfo.activeSubscriptions || {};
      const appUserID = customerInfo.originalAppUserId || 'unknown';
      
      console.log(`[Billing] Customer Info ${context}:`, {
        appUserID,
        activeEntitlementKeys,
        allEntitlementKeys,
        activeSubscriptions: Object.keys(activeSubscriptions),
        hasProEntitlement: customerInfo.entitlements?.active?.[ENTITLEMENT_ID] !== undefined,
        proEntitlement: customerInfo.entitlements?.active?.[ENTITLEMENT_ID] || null,
      });
    } catch (err) {
      console.warn('[Billing] Error logging customer info:', err);
    }
  };

  const updateProStatus = (customerInfo) => {
    // Log customer info for debugging (dev only)
    logCustomerInfo(customerInfo, 'updateProStatus');
    
    // Derive isPro ONLY from entitlements.active['pro'] presence
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
    if (!PurchasesAvailable || !Purchases) {
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
      const offeringsData = await Purchases.getOfferings();
      
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
      setError(err.message || 'Failed to refresh entitlements');
    }
  }, []);

  // Helper function to check entitlement with retry logic
  const checkEntitlementWithRetry = async (attempt = 1) => {
    if (!PurchasesAvailable || !Purchases) {
      return false;
    }

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      logCustomerInfo(customerInfo, `checkEntitlementWithRetry (attempt ${attempt})`);
      
      const isPremium = customerInfo.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
      
      if (isPremium) {
        updateProStatus(customerInfo);
        setCustomerInfoTimestamp(new Date().toISOString());
        return true;
      }
      
      // If not active and we have retries left, wait and retry
      if (attempt < ENTITLEMENT_RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, ENTITLEMENT_RETRY_DELAY_MS));
        return checkEntitlementWithRetry(attempt + 1);
      }
      
      return false;
    } catch (err) {
      console.error(`[Billing] Error checking entitlement (attempt ${attempt}):`, err);
      return false;
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
      const offeringsData = await Purchases.getOfferings();
      
      if (!offeringsData.current) {
        throw new Error('No offerings available');
      }

      // Find the package (use identifier or default to monthly)
      const packageToPurchase = offeringsData.current.availablePackages.find(
        pkg => pkg.identifier === pkgId || (pkgId === 'monthly' && pkg.packageType === 'MONTHLY')
      ) || offeringsData.current.availablePackages[0];

      if (!packageToPurchase) {
        throw new Error('Package not found');
      }

      Analytics.trackEvent('purchase_started', {
        product: packageToPurchase.identifier,
      });

      // Make purchase using purchasePackage
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      
      // Log customer info immediately after purchase
      logCustomerInfo(customerInfo, 'after purchase');
      
      // Update status from customerInfo immediately
      updateProStatus(customerInfo);
      setCustomerInfoTimestamp(new Date().toISOString());
      
      // Check if purchase was successful (with retry logic for race conditions)
      const isPremium = customerInfo.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
      
      if (isPremium) {
        // Entitlement is active immediately
        Analytics.trackEvent('purchase_success', {
          product: packageToPurchase.identifier,
        });
        
        // Refresh offerings
        await refreshEntitlements();
      } else {
        // Entitlement not active yet - show "Finishing setup..." and retry
        setIsFinishingSetup(true);
        
        const entitlementActivated = await checkEntitlementWithRetry();
        
        if (entitlementActivated) {
          Analytics.trackEvent('purchase_success', {
            product: packageToPurchase.identifier,
            delayed: true,
          });
          
          // Refresh offerings
          await refreshEntitlements();
        } else {
          // Still not active after retries - this might be a real issue
          console.warn('[Billing] Purchase completed but entitlement not active after retries');
          setError('Purchase completed but entitlement not active. Please try restoring purchases or contact support.');
          Analytics.trackEvent('purchase_entitlement_delayed', {
            product: packageToPurchase.identifier,
          });
          // Don't throw - let the UI show the error message
        }
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
      
      // Check for user cancellation - this is not an error
      // Only treat as cancellation if it's NOT an auth error
      const isUserCancelled = 
        (err.userCancelled && !isAuthError) || 
        (errorMessage.includes('cancelled') && !isAuthError) ||
        (errorMessage.includes('canceled') && !isAuthError);
      
      if (isUserCancelled) {
        // User cancelled - log at info level, not error
        if (__DEV__) {
          console.log('[Billing] Purchase cancelled by user');
        }
        return;
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
      
      // Log actual errors
      console.error('[Billing] Error purchasing:', err);

      const errorMsg = errorMessage || 'Purchase failed';
      setError(errorMsg);
      
      Analytics.trackEvent('purchase_failed', {
        error: errorMsg,
        product: pkgId,
      });
      
      throw err;
    } finally {
      setIsLoading(false);
      setIsFinishingSetup(false);
    }
  }, [refreshEntitlements]);

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
      logCustomerInfo(customerInfo, 'restore');
      
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
