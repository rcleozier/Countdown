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

const ENTITLEMENT_ID = 'pro';

// Throttle AppState refresh (max once per 60 seconds)
const REFRESH_THROTTLE_MS = 60000;

const PurchasesContext = createContext(undefined);

export const PurchasesProvider = ({ children }) => {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeProductId, setActiveProductId] = useState(undefined);
  const [offerings, setOfferings] = useState(undefined);
  const [error, setError] = useState(undefined);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [customerInfoTimestamp, setCustomerInfoTimestamp] = useState(null);
  
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

  const updateProStatus = (customerInfo) => {
    // Derive isPro ONLY from entitlements.active['pro'] presence
    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    
    setIsPro(isPremium);
    
    // Get active product ID if premium
    if (isPremium) {
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      setActiveProductId(entitlement.productIdentifier);
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

  const purchase = useCallback(async (pkgId) => {
    if (!PurchasesAvailable || !Purchases) {
      throw new Error('RevenueCat not available');
    }

    try {
      setIsLoading(true);
      setError(undefined);

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
      
      // Update status from customerInfo
      updateProStatus(customerInfo);
      setCustomerInfoTimestamp(new Date().toISOString());
      
      // Check if purchase was successful
      const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      
      if (isPremium) {
        Analytics.trackEvent('purchase_success', {
          product: packageToPurchase.identifier,
        });
        
        // Refresh offerings
        await refreshEntitlements();
      } else {
        throw new Error('Purchase completed but entitlement not active');
      }
    } catch (err) {
      console.error('[Billing] Error purchasing:', err);
      
      // User cancelled is not an error
      if (err.userCancelled) {
        return;
      }

      const errorMsg = err.message || 'Purchase failed';
      setError(errorMsg);
      
      Analytics.trackEvent('purchase_failed', {
        error: errorMsg,
        product: pkgId,
      });
      
      throw err;
    } finally {
      setIsLoading(false);
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

      // Restore purchases
      const customerInfo = await Purchases.restorePurchases();
      
      // Update status from customerInfo
      updateProStatus(customerInfo);
      setCustomerInfoTimestamp(new Date().toISOString());
      
      // Check if user has active entitlement
      const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      
      if (isPremium) {
        await refreshEntitlements();
        Analytics.trackEvent('restore_success', {});
      } else {
        Analytics.trackEvent('restore_no_purchases', {});
      }
    } catch (err) {
      console.error('[Billing] Error restoring purchases:', err);
      const errorMsg = err.message || 'Failed to restore purchases';
      setError(errorMsg);
      
      Analytics.trackEvent('restore_failed', {
        error: errorMsg,
      });
    } finally {
      setIsLoading(false);
    }
  }, [refreshEntitlements]);

  const value = {
    isPro,
    isLoading,
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
      lastCustomerInfoFetch: customerInfoTimestamp,
      lastRefresh: lastRefreshTime,
      currentOfferingId: offerings?.current?.identifier,
      monthlyPackageId: offerings?.monthly?.identifier,
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
