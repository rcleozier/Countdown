import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExpoStoreAdapter } from './ExpoStoreAdapter';
import { Analytics } from '../../util/analytics';

const ENTITLEMENTS_CACHE_KEY = '@entitlements_cache';
const ENTITLEMENT_ID = 'pro';

// Product ID - should match what's configured in App Store Connect / Google Play Console
// iOS: com.chronox.app.pro.monthly (configured in App Store Connect)
// Android: (to be configured in Google Play Console)
const PRODUCT_ID = 'com.chronox.app.pro.monthly';

const PurchasesContext = createContext(undefined);

export const PurchasesProvider = ({ children }) => {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeProductId, setActiveProductId] = useState(undefined);
  const [offerings, setOfferings] = useState(undefined);
  const [error, setError] = useState(undefined);
  const [storeAdapter] = useState(() => new ExpoStoreAdapter());

  // Initialize store
  useEffect(() => {
    initializePurchases();
    
    return () => {
      // Cleanup: disconnect from store
      storeAdapter.disconnect().catch(() => {});
    };
  }, []);

  const initializePurchases = async () => {
    try {
      // Load cached entitlements first for fast boot
      await loadCachedEntitlements();

      // Initialize store adapter
      const connected = await storeAdapter.init();
      
      if (!connected) {
        console.warn('[Billing] Store not available. Using cached entitlements.');
        setIsLoading(false);
        return;
      }

      // Then refresh from store
      await refreshEntitlements();
    } catch (err) {
      console.error('[Billing] Error initializing purchases:', err);
      setError(err.message || 'Failed to initialize purchases');
      // Fallback to cached value
      await loadCachedEntitlements();
    } finally {
      setIsLoading(false);
    }
  };

  const loadCachedEntitlements = async () => {
    try {
      const cached = await AsyncStorage.getItem(ENTITLEMENTS_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        const now = Date.now();
        const cacheAge = now - (data.timestamp || 0);
        
        // Check if cached subscription has expired
        let isPro = data.isPro || false;
        if (data.expirationDate) {
          const expirationDate = new Date(data.expirationDate);
          if (expirationDate <= new Date()) {
            isPro = false;
            // Clear expired cache
            await AsyncStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
            setIsPro(false);
            setActiveProductId(null);
            return;
          }
        }
        
        // Use cache if less than 1 hour old
        if (cacheAge < 3600000) {
          setIsPro(isPro);
          setActiveProductId(isPro ? data.activeProductId : null);
        } else {
          // Cache expired, clear it
          await AsyncStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
        }
      }
    } catch (err) {
      console.error('[Billing] Error loading cached entitlements:', err);
    }
  };

  const saveCachedEntitlements = async (entitlements) => {
    try {
      // Check if subscription has expired
      let isPremium = entitlements.isPremium || false;
      if (entitlements.expirationDate) {
        const expirationDate = new Date(entitlements.expirationDate);
        const now = new Date();
        if (expirationDate <= now) {
          isPremium = false;
          console.log('[Billing] Subscription expired:', expirationDate);
        }
      }

      await AsyncStorage.setItem(ENTITLEMENTS_CACHE_KEY, JSON.stringify({
        isPro: isPremium,
        activeProductId: isPremium ? entitlements.activeProductId : null,
        expirationDate: entitlements.expirationDate,
        timestamp: Date.now(),
      }));

      setIsPro(isPremium);
      setActiveProductId(isPremium ? entitlements.activeProductId : null);
    } catch (err) {
      console.error('[Billing] Error saving cached entitlements:', err);
    }
  };

  const refreshEntitlements = useCallback(async () => {
    try {
      const entitlements = await storeAdapter.getEntitlements();
      await saveCachedEntitlements(entitlements);

      // Load product/offering
      const products = await storeAdapter.getProducts([PRODUCT_ID]);
      const monthly = products.find(p => p.productId === PRODUCT_ID);

      setOfferings({
        monthly: monthly ? {
          identifier: 'monthly',
          product: {
            identifier: monthly.productId,
            title: monthly.title,
            description: monthly.description,
            price: monthly.price,
            priceString: monthly.price,
            currencyCode: monthly.currencyCode,
          },
        } : undefined,
      });

      setError(undefined);
    } catch (err) {
      console.error('[Billing] Error refreshing entitlements:', err);
      setError(err.message || 'Failed to refresh entitlements');
    }
  }, [storeAdapter]);

  const purchase = useCallback(async (pkgId) => {
    try {
      setIsLoading(true);
      setError(undefined);

      // Use the single product ID
      const productId = PRODUCT_ID;

      Analytics.trackEvent('purchase_started', {
        product: productId,
      });

      const result = await storeAdapter.purchase(productId);
      
      if (result.success) {
        Analytics.trackEvent('purchase_success', {
          product: productId,
        });
        
        // Refresh entitlements after successful purchase
        await refreshEntitlements();
      }
    } catch (err) {
      console.error('[Billing] Error purchasing:', err);
      
      // User cancelled is not an error
      if (err.message && err.message.includes('canceled')) {
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
  }, [storeAdapter, refreshEntitlements]);

  const restore = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(undefined);

      Analytics.trackEvent('restore_started', {});

      const result = await storeAdapter.restore();
      
      if (result.restored) {
        // Refresh entitlements to get active subscription
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
  }, [storeAdapter, refreshEntitlements]);

  // Refresh entitlements when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App has come to the foreground, refresh subscription status
        refreshEntitlements().catch(err => {
          console.error('[Billing] Error refreshing on app resume:', err);
        });
      }
    });
    
    return () => {
      subscription.remove();
    };
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
