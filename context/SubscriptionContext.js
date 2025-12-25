import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SubscriptionContext = createContext();

const SUBSCRIPTION_STORAGE_KEY = '@subscription_status';
const SUBSCRIPTION_PRODUCT_IDS = {
  monthly: 'com.chronox.app.pro.monthly',
  yearly: 'com.chronox.app.pro.yearly',
};

// Mock subscription status - will be replaced with real implementation
const MOCK_SUBSCRIPTION_STATUS = {
  isActive: false,
  productId: null,
  expiresAt: null,
  platform: null, // 'ios' | 'android' | null
};

export const SubscriptionProvider = ({ children }) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState(MOCK_SUBSCRIPTION_STATUS);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Load subscription status on mount
  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  const loadSubscriptionStatus = async () => {
    try {
      const stored = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      if (stored) {
        const status = JSON.parse(stored);
        // Check if subscription is still valid (for mock, we'll just check if it exists)
        setSubscriptionStatus(status);
      }
    } catch (error) {
      console.error('Error loading subscription status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mock purchase function - will be replaced with real store implementation
  const purchaseSubscription = async (productId) => {
    try {
      setIsPurchasing(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful purchase
      const newStatus = {
        isActive: true,
        productId: productId,
        expiresAt: productId.includes('yearly') 
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        platform: 'mock', // Will be 'ios' or 'android' in real implementation
      };
      
      await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(newStatus));
      setSubscriptionStatus(newStatus);
      
      return { success: true, status: newStatus };
    } catch (error) {
      console.error('Error purchasing subscription:', error);
      return { success: false, error: error.message };
    } finally {
      setIsPurchasing(false);
    }
  };

  // Mock restore purchases - will be replaced with real store implementation
  const restorePurchases = async () => {
    try {
      setIsLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real implementation, this would query the store
      const stored = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      if (stored) {
        const status = JSON.parse(stored);
        setSubscriptionStatus(status);
        return { success: true, restored: status.isActive };
      }
      
      return { success: true, restored: false };
    } catch (error) {
      console.error('Error restoring purchases:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user has active subscription
  const hasActiveSubscription = () => {
    if (!subscriptionStatus.isActive) return false;
    
    // Check expiration (for mock, we'll trust the stored status)
    if (subscriptionStatus.expiresAt) {
      const expiresAt = new Date(subscriptionStatus.expiresAt);
      if (expiresAt < new Date()) {
        // Subscription expired
        setSubscriptionStatus(MOCK_SUBSCRIPTION_STATUS);
        AsyncStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);
        return false;
      }
    }
    
    return true;
  };

  // Get subscription info
  const getSubscriptionInfo = () => {
    if (!hasActiveSubscription()) {
      return null;
    }
    
    return {
      productId: subscriptionStatus.productId,
      expiresAt: subscriptionStatus.expiresAt,
      platform: subscriptionStatus.platform,
      isYearly: subscriptionStatus.productId?.includes('yearly') || false,
    };
  };

  const value = {
    subscriptionStatus,
    isLoading,
    isPurchasing,
    hasActiveSubscription: hasActiveSubscription(),
    subscriptionInfo: getSubscriptionInfo(),
    purchaseSubscription,
    restorePurchases,
    productIds: SUBSCRIPTION_PRODUCT_IDS,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

