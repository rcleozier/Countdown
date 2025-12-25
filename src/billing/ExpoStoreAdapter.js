/**
 * Expo In-App Purchases Store Adapter
 * 
 * Implements the store adapter interface using expo-in-app-purchases.
 * This can be swapped for react-native-iap or RevenueCat later.
 */

import { Platform } from 'react-native';

// Conditionally import expo-in-app-purchases
let InAppPurchases = null;
let InAppPurchasesAvailable = false;

try {
  const purchasesModule = require('expo-in-app-purchases');
  if (purchasesModule && typeof purchasesModule.isAvailableAsync === 'function') {
    InAppPurchases = purchasesModule;
    InAppPurchasesAvailable = true;
  }
} catch (error) {
  console.warn('[Billing] expo-in-app-purchases not available:', error.message);
}

/**
 * Expo Store Adapter
 * Implements store operations using expo-in-app-purchases
 */
export class ExpoStoreAdapter {
  constructor() {
    this.isConnected = false;
    this.purchaseListeners = [];
  }

  /**
   * Check if module is available
   */
  isModuleAvailable() {
    return InAppPurchases && InAppPurchasesAvailable;
  }

  /**
   * Initialize store connection
   */
  async init() {
    if (!this.isModuleAvailable()) {
      console.log('[Billing] Store module not available (Expo Go or simulator)');
      return false;
    }

    try {
      const isAvailable = await InAppPurchases.isAvailableAsync();
      if (!isAvailable) {
        console.log('[Billing] Store not available on this device');
        return false;
      }

      if (!this.isConnected) {
        await InAppPurchases.connectAsync();
        this.isConnected = true;
        console.log('[Billing] Connected to store');

        // Set up purchase listener
        if (typeof InAppPurchases.setPurchaseListener === 'function') {
          InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }) => {
            if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
              results.forEach((purchase) => {
                this.purchaseListeners.forEach(listener => {
                  try {
                    listener({ success: true, purchase });
                  } catch (error) {
                    console.error('[Billing] Purchase listener error:', error);
                  }
                });
              });
            } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
              this.purchaseListeners.forEach(listener => {
                try {
                  listener({ success: false, canceled: true });
                } catch (error) {
                  console.error('[Billing] Purchase listener error:', error);
                }
              });
            } else {
              this.purchaseListeners.forEach(listener => {
                try {
                  listener({ success: false, error: errorCode });
                } catch (error) {
                  console.error('[Billing] Purchase listener error:', error);
                }
              });
            }
          });
        }
      }

      return true;
    } catch (error) {
      console.error('[Billing] Failed to initialize store:', error);
      return false;
    }
  }

  /**
   * Get available products
   */
  async getProducts(productIds) {
    if (!this.isModuleAvailable() || !this.isConnected) {
      return [];
    }

    try {
      const { results, responseCode } = await InAppPurchases.getProductsAsync(productIds);

      if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
        return results.map(product => ({
          productId: product.productId,
          title: product.title,
          description: product.description,
          price: product.price,
          currencyCode: product.currencyCode || 'USD',
          priceAmountMicros: product.priceAmountMicros || 0,
          introductoryPrice: product.introductoryPrice || null,
          introductoryPricePeriod: product.introductoryPricePeriod || null,
        }));
      }

      return [];
    } catch (error) {
      console.error('[Billing] Failed to get products:', error);
      return [];
    }
  }

  /**
   * Purchase a subscription
   */
  async purchase(productId) {
    if (!this.isModuleAvailable() || !this.isConnected) {
      throw new Error('Store not available');
    }

    try {
      // Purchase will be handled by the purchase listener
      await InAppPurchases.purchaseItemAsync(productId);
      
      // Return a promise that resolves when purchase completes
      return new Promise((resolve, reject) => {
        const listener = ({ success, purchase, canceled, error }) => {
          this.removePurchaseListener(listener);
          
          if (canceled) {
            reject(new Error('Purchase canceled'));
          } else if (success && purchase) {
            // Acknowledge purchase
            if (!purchase.acknowledged) {
              InAppPurchases.finishTransactionAsync(purchase, true).catch(() => {});
            }
            resolve({
              success: true,
              transactionId: purchase.transactionId,
            });
          } else {
            reject(new Error(error || 'Purchase failed'));
          }
        };

        this.addPurchaseListener(listener);
        
        // Timeout after 60 seconds
        setTimeout(() => {
          this.removePurchaseListener(listener);
          reject(new Error('Purchase timeout'));
        }, 60000);
      });
    } catch (error) {
      console.error('[Billing] Purchase error:', error);
      throw error;
    }
  }

  /**
   * Restore purchases
   */
  async restore() {
    if (!this.isModuleAvailable() || !this.isConnected) {
      throw new Error('Store not available');
    }

    try {
      // Get purchase history
      const { results, responseCode } = await InAppPurchases.getPurchaseHistoryAsync();
      
      if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
        // Also check available purchases (active subscriptions)
        const { results: availablePurchases } = await InAppPurchases.getAvailablePurchasesAsync();
        
        const hasActivePurchase = results.length > 0 || (availablePurchases && availablePurchases.length > 0);
        
        return {
          success: true,
          restored: hasActivePurchase,
        };
      }

      return {
        success: true,
        restored: false,
      };
    } catch (error) {
      console.error('[Billing] Restore error:', error);
      throw error;
    }
  }

  /**
   * Get current entitlements from store
   */
  async getEntitlements() {
    if (!this.isModuleAvailable() || !this.isConnected) {
      return {
        isPremium: false,
        activeProductId: null,
        expirationDate: null,
        lastCheckedAt: new Date().toISOString(),
        source: 'unknown',
      };
    }

    try {
      // Get purchase history
      const { results: history } = await InAppPurchases.getPurchaseHistoryAsync();
      // Get available purchases (active subscriptions)
      const { results: available } = await InAppPurchases.getAvailablePurchasesAsync();

      const allPurchases = [
        ...(history || []),
        ...(available || []),
      ];

      // Find subscription purchases (monthly only)
      const subscriptionPurchases = allPurchases.filter(p => 
        p.productId && p.productId.includes('monthly')
      );

      if (subscriptionPurchases.length > 0) {
        // Get most recent purchase
        const latestPurchase = subscriptionPurchases.sort(
          (a, b) => new Date(b.purchaseTime) - new Date(a.purchaseTime)
        )[0];

        // Acknowledge if needed
        if (!latestPurchase.acknowledged) {
          await InAppPurchases.finishTransactionAsync(latestPurchase, true);
        }

        // Calculate expiration: 1 month from purchase
        const purchaseDate = new Date(latestPurchase.purchaseTime);
        const expirationDate = new Date(purchaseDate);
        expirationDate.setMonth(expirationDate.getMonth() + 1);

        return {
          isPremium: true,
          activeProductId: latestPurchase.productId,
          expirationDate: expirationDate.toISOString(),
          lastCheckedAt: new Date().toISOString(),
          source: 'store',
        };
      }

      return {
        isPremium: false,
        activeProductId: null,
        expirationDate: null,
        lastCheckedAt: new Date().toISOString(),
        source: 'store',
      };
    } catch (error) {
      console.error('[Billing] Failed to get entitlements:', error);
      return {
        isPremium: false,
        activeProductId: null,
        expirationDate: null,
        lastCheckedAt: new Date().toISOString(),
        source: 'unknown',
      };
    }
  }

  /**
   * Check if store is available
   */
  async isAvailable() {
    if (!this.isModuleAvailable()) {
      return false;
    }

    try {
      return await InAppPurchases.isAvailableAsync();
    } catch (error) {
      return false;
    }
  }

  /**
   * Add purchase listener
   */
  addPurchaseListener(listener) {
    this.purchaseListeners.push(listener);
  }

  /**
   * Remove purchase listener
   */
  removePurchaseListener(listener) {
    this.purchaseListeners = this.purchaseListeners.filter(l => l !== listener);
  }

  /**
   * Disconnect from store
   */
  async disconnect() {
    if (this.isConnected && InAppPurchases && typeof InAppPurchases.disconnectAsync === 'function') {
      try {
        await InAppPurchases.disconnectAsync();
        this.isConnected = false;
      } catch (error) {
        console.error('[Billing] Failed to disconnect:', error);
      }
    }
  }
}

