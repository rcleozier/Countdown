import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import Purchases from 'react-native-purchases';
import { Analytics } from '../../util/analytics';

// RevenueCat API Key
const REVENUECAT_API_KEY = Platform.OS === 'ios' 
  ? 'appl_lbJizGKaENVDSBTckaxkybVnxTo'
  : 'goog_YOUR_ANDROID_KEY'; // Update when adding Android

const ENTITLEMENT_ID = 'pro';

const PurchasesContext = createContext(undefined);

export const PurchasesProvider = ({ children }) => {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeProductId, setActiveProductId] = useState(undefined);
  const [offerings, setOfferings] = useState(undefined);
  const [error, setError] = useState(undefined);

  // Initialize RevenueCat
  useEffect(() => {
    initializePurchases();
    
    // Refresh entitlements when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        refreshEntitlements().catch(err => {
          console.error('[Billing] Error refreshing on app resume:', err);
        });
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

  const initializePurchases = async () => {
    try {
      setIsLoading(true);
      
      // Configure RevenueCat
      await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
      
      // Set user attributes (optional, for analytics)
      await Purchases.setAttributes({
        platform: Platform.OS,
      });

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

  const refreshEntitlements = useCallback(async () => {
    try {
      // Get customer info (includes entitlements)
      const customerInfo = await Purchases.getCustomerInfo();
      
      // Check if user has pro entitlement
      const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      
      setIsPro(isPremium);
      
      // Get active product ID if premium
      if (isPremium) {
        const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
        setActiveProductId(entitlement.productIdentifier);
      } else {
        setActiveProductId(undefined);
      }

      // Load offerings for display
      const offeringsData = await Purchases.getOfferings();
      
      if (offeringsData.current) {
        const monthlyPackage = offeringsData.current.availablePackages.find(
          pkg => pkg.identifier === 'monthly' || pkg.packageType === 'MONTHLY'
        ) || offeringsData.current.availablePackages[0];

        if (monthlyPackage) {
          const product = monthlyPackage.storeProduct;
          setOfferings({
            monthly: {
              identifier: monthlyPackage.identifier,
              product: {
                identifier: product.identifier,
                title: product.title,
                description: product.description,
                price: product.priceString,
                priceString: product.priceString,
                currencyCode: product.currencyCode,
              },
            },
          });
        }
      }

      setError(undefined);
    } catch (err) {
      console.error('[Billing] Error refreshing entitlements:', err);
      setError(err.message || 'Failed to refresh entitlements');
    }
  }, []);

  const purchase = useCallback(async (pkgId) => {
    try {
      setIsLoading(true);
      setError(undefined);

      Analytics.trackEvent('purchase_started', {
        product: pkgId,
      });

      // Get offerings to find the package
      const offeringsData = await Purchases.getOfferings();
      
      if (!offeringsData.current) {
        throw new Error('No offerings available');
      }

      // Find the package (use identifier or default to first monthly)
      const packageToPurchase = offeringsData.current.availablePackages.find(
        pkg => pkg.identifier === pkgId || (pkgId === 'monthly' && pkg.packageType === 'MONTHLY')
      ) || offeringsData.current.availablePackages[0];

      if (!packageToPurchase) {
        throw new Error('Package not found');
      }

      // Make purchase
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      
      // Check if purchase was successful
      const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      
      if (isPremium) {
        Analytics.trackEvent('purchase_success', {
          product: packageToPurchase.identifier,
        });
        
        // Refresh entitlements to update state
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
    try {
      setIsLoading(true);
      setError(undefined);

      Analytics.trackEvent('restore_started', {});

      // Restore purchases
      const customerInfo = await Purchases.restorePurchases();
      
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
