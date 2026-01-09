import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import * as Haptics from 'expo-haptics';
// Conditionally import RevenueCat (may not be available in Expo Go)
let Purchases = null;
try {
  Purchases = require('react-native-purchases').default;
} catch (error) {
  console.warn('[PaywallSheet] react-native-purchases not available:', error.message);
}
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { usePurchases, ENTITLEMENT_ID } from './PurchasesProvider';
import { Analytics } from '../../util/analytics';
import BottomSheet from '../../components/BottomSheet';

const PaywallSheet = ({ visible, onClose, feature }) => {
  const { theme, isDark } = useTheme();
  const { t } = useLocale();
  const { offerings, isLoading, isFinishingSetup, error, purchase, restore, isPro } = usePurchases();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    if (visible && feature) {
      Analytics.trackEvent('paywall_shown', { feature });
      setForceShow(true); // ensure sheet renders even if offerings missing
    }
  }, [visible, feature]);

  const handlePurchase = async () => {
    if (!Purchases) {
      Alert.alert(
        t('subscription.purchaseFailed'),
        'RevenueCat not available. Please use a development build.',
        [{ text: t('common.ok') }]
      );
      return;
    }

    try {
      setIsPurchasing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Use offerings.current.availablePackages
      if (!offerings?.current) {
        throw new Error('No offerings available');
      }

      // Choose monthly package (or first package as fallback)
      const selectedPackage = offerings.current.availablePackages.find(
        pkg => pkg.identifier === 'monthly' || pkg.packageType === 'MONTHLY'
      ) || offerings.current.availablePackages[0];

      if (!selectedPackage) {
        throw new Error('Package not found');
      }

      // Use the purchase function from PurchasesProvider (handles retry logic)
      // The purchase function will handle entitlement activation with retry logic
      // and update isPro state when complete
      await purchase(selectedPackage.identifier || 'monthly');
      
      // Wait a moment for state to update after purchase completes
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if Pro is now active (purchase function handles retry internally)
      // We use a small delay to allow state updates to propagate
      if (isPro) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        t('subscription.upsell.unlockPro'),
          t('subscription.proUnlocked'),
          [{ text: t('common.ok'), onPress: onClose }]
      );
      }
      // If there's an error, it will be displayed in the error message area
      // If isFinishingSetup is true, the UI will show the "Finishing setup..." message
    } catch (err) {
      // Check if this is an authentication error (sandbox account issue)
      const isAuthError = err.message?.includes('Authentication failed');
      
      // Handle userCancelled errors gracefully - don't show error
      // But don't treat auth errors as cancellations
      if (!isAuthError && (err.userCancelled || err.message?.includes('cancelled') || err.message?.includes('canceled'))) {
        // User cancelled - silently return
        return;
      }
      
      // Show error alert (authentication errors and other errors)
      if (err.message && !err.message.includes('entitlement not active')) {
        Alert.alert(
          t('subscription.purchaseFailed'),
          err.message || t('subscription.purchaseFailedMessage'),
          [{ text: t('common.ok') }]
        );
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsRestoring(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const result = await restore();
      
      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (result?.hasActiveSubscription) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
          t('subscription.restoreComplete'),
          t('subscription.restoreCompleteMessage'),
          [{ text: t('common.ok'), onPress: onClose }]
      );
      } else {
        Alert.alert(
          t('subscription.restoreComplete'),
          t('subscription.noActivePurchases') || 'No active purchases found.',
          [{ text: t('common.ok') }]
        );
      }
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t('subscription.restoreFailed'),
        err.message || t('subscription.restoreFailedMessage'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setIsRestoring(false);
    }
  };

  // Get monthly package from offerings
  const monthlyPackage = offerings?.monthly?.package || 
    offerings?.current?.availablePackages?.find(
      pkg => pkg.identifier === 'monthly' || pkg.packageType === 'MONTHLY'
    ) || 
    offerings?.current?.availablePackages?.[0];

  // Display price from the package product
  const priceString = monthlyPackage?.storeProduct?.priceString || 
    offerings?.monthly?.product?.priceString;

  return (
    <BottomSheet visible={visible} onClose={onClose} showHandle={true}>
      <View style={[
        styles.container,
        { backgroundColor: theme.colors.modalBackground, minHeight: wp('10%') }
      ]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('subscription.upgradeTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {t('subscription.upgradeSubtitle')}
          </Text>
        </View>

        {/* Features List */}
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={wp('5%')} color={theme.colors.success || '#4CAF50'} />
            <Text style={[styles.featureText, { color: theme.colors.text }]}>
              {t('subscription.featureStandardReminders')}
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={wp('5%')} color={theme.colors.success || '#4CAF50'} />
            <Text style={[styles.featureText, { color: theme.colors.text }]}>
              {t('subscription.featureExtendedNotes')}
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={wp('5%')} color={theme.colors.success || '#4CAF50'} />
            <Text style={[styles.featureText, { color: theme.colors.text }]}>
              {t('subscription.featureRecurringCountdowns')}
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={wp('5%')} color={theme.colors.success || '#4CAF50'} />
            <Text style={[styles.featureText, { color: theme.colors.text }]}>
              {t('subscription.featureNoAds')}
            </Text>
          </View>
        </View>

        {/* Purchase Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: isDark ? '#3CC4A2' : '#4E9EFF',
              }
            ]}
          onPress={handlePurchase}
          disabled={isPurchasing || isRestoring || isLoading || isFinishingSetup || !monthlyPackage}
          >
          {isPurchasing || isFinishingSetup ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>
                {isFinishingSetup ? t('subscription.finishingSetup') || 'Finishing setup...' : t('subscription.processing') || 'Processing...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>{t('subscription.startPro')}</Text>
            )}
          </TouchableOpacity>

        {/* Pricing Transparency */}
        {priceString && (
          <Text style={[styles.pricingText, { color: theme.colors.textSecondary }]}>
            {t('subscription.pricingTransparency', { price: priceString })}
          </Text>
        )}

        {/* Error Message - Hide configuration errors that users can't fix */}
        {error && !isFinishingSetup && 
         !error.includes('configuration') && 
         !error.includes('could not be fetched') && 
         !error.includes('StoreKit Configuration') && 
         !error.includes('App Store Connect') && 
         !error.includes('None of the products registered') && (
          <Text style={[styles.errorText, { color: theme.colors.error || '#E74C3C' }]}>
            {error}
          </Text>
        )}
        
        {/* Finishing Setup Message */}
        {isFinishingSetup && (
          <Text style={[styles.finishingText, { color: theme.colors.textSecondary }]}>
            {t('subscription.finishingSetup') || 'Finishing setup... This may take a moment.'}
          </Text>
        )}

        {/* Secondary Actions */}
        <View style={styles.secondaryActions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleRestore}
            disabled={isPurchasing || isRestoring || isLoading}
          >
            {isRestoring ? (
              <ActivityIndicator color={theme.colors.textSecondary} size="small" />
            ) : (
              <Text style={[styles.secondaryButtonText, { color: theme.colors.textSecondary }]}>
                {t('subscription.restorePurchases')}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onClose}
            disabled={isPurchasing || isRestoring}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.colors.textSecondary }]}>
              {t('subscription.upsell.notNow')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Legal Text */}
        <Text style={[styles.legalText, { color: theme.colors.textSecondary }]}>
          {t('subscription.legal') || 'Subscriptions auto-renew unless cancelled. Manage in Settings.'}
        </Text>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: wp('6%'),
    borderTopLeftRadius: wp('5%'),
    borderTopRightRadius: wp('5%'),
  },
  header: {
    marginBottom: wp('6%'),
    alignItems: 'center',
  },
  title: {
    fontSize: wp('6%'),
    fontWeight: '700',
    marginBottom: wp('2%'),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: wp('4%'),
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: wp('2%'),
  },
  featuresList: {
    marginBottom: wp('6%'),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: wp('3%'),
  },
  featureText: {
    fontSize: wp('4.2%'),
    fontWeight: '500',
    marginLeft: wp('3%'),
    flex: 1,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: wp('4%'),
    borderRadius: wp('3%'),
    alignItems: 'center',
    marginBottom: wp('2%'),
  },
  pricingText: {
    fontSize: wp('3%'),
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: wp('3%'),
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: wp('4.5%'),
    fontWeight: '600',
  },
  errorText: {
    fontSize: wp('3.5%'),
    textAlign: 'center',
    marginBottom: wp('3%'),
  },
  finishingText: {
    fontSize: wp('3.5%'),
    textAlign: 'center',
    marginBottom: wp('3%'),
    fontStyle: 'italic',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: wp('3%'),
  },
  secondaryButton: {
    paddingVertical: wp('3%'),
    paddingHorizontal: wp('4%'),
  },
  secondaryButtonText: {
    fontSize: wp('4%'),
    fontWeight: '500',
  },
  legalText: {
    fontSize: wp('2.8%'),
    textAlign: 'center',
    lineHeight: wp('4%'),
    marginTop: wp('2%'),
  },
});

export default PaywallSheet;
