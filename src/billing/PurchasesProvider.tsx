import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExpoStoreAdapter } from './ExpoStoreAdapter';
import { Analytics } from '../../util/analytics';

const ENTITLEMENTS_CACHE_KEY = '@entitlements_cache';
const ENTITLEMENT_ID = 'pro';

// Product ID - should match what's configured in App Store Connect / Google Play Console
// iOS: com.chronox.app.pro.monthly (configured in App Store Connect)
// Android: (to be configured in Google Play Console)
const PRODUCT_ID = 'com.chronox.app.pro.monthly';

type PurchasesPackage = {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceString: string;
  currencyCode?: string;
};

type Offerings = {
  monthly?: {
    identifier: string;
    product: PurchasesPackage;
  };
};

type PurchasesContextType = {
  isPro: boolean;
  isLoading: boolean;
  activeProductId?: string;
  purchase: (pkgId?: string) => Promise<void>;
  restore: () => Promise<void>;
  refresh: () => Promise<void>;
  offerings?: Offerings;
  error?: string;
};

const PurchasesContext = createContext<PurchasesContextType | undefined>(undefined);

export const PurchasesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeProductId, setActiveProductId] = useState<string | undefined>();
  const [offerings, setOfferings] = useState<Offerings | undefined>();
  const [error, setError] = useState<string | undefined>();
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
        setIsLoading(false);
        return;
      }

      // Then refresh from store
      await refreshEntitlements();
    } catch (err: any) {
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

        // Use cache if less than 1 hour old
        if (cacheAge < 3600000) {
          setIsPro(data.isPro || false);
          setActiveProductId(data.activeProductId);
        } else {
          // Cache expired, clear it
          await AsyncStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
        }
      }
    } catch (err) {
      console.error('[Billing] Error loading cached entitlements:', err);
    }
  };

  const saveCachedEntitlements = async (entitlements: { isPremium?: boolean; activeProductId?: string }) => {
    try {
      await AsyncStorage.setItem(ENTITLEMENTS_CACHE_KEY, JSON.stringify({
        isPro: entitlements.isPremium || false,
        activeProductId: entitlements.activeProductId,
        timestamp: Date.now(),
      }));

      setIsPro(entitlements.isPremium || false);
      setActiveProductId(entitlements.activeProductId);
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
    } catch (err: any) {
      console.error('[Billing] Error refreshing entitlements:', err);
      setError(err.message || 'Failed to refresh entitlements');
    }
  }, [storeAdapter]);

  const purchase = useCallback(async (pkgId?: string) => {
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
    } catch (err: any) {
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
    } catch (err: any) {
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

  const value: PurchasesContextType = {
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

export const usePurchases = (): PurchasesContextType => {
  const context = useContext(PurchasesContext);
  if (!context) {
    throw new Error('usePurchases must be used within PurchasesProvider');
  }
  return context;
};

