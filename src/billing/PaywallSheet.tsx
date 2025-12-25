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
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { usePurchases } from './PurchasesProvider';
import { Analytics } from '../../util/analytics';
import BottomSheet from '../../components/BottomSheet';

interface PaywallSheetProps {
  visible: boolean;
  onClose: () => void;
  feature?: string;
}

const PaywallSheet: React.FC<PaywallSheetProps> = ({ visible, onClose, feature }) => {
  const { theme, isDark } = useTheme();
  const { t } = useLocale();
  const { purchase, restore, offerings, isLoading, error } = usePurchases();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (visible && feature) {
      Analytics.trackEvent('paywall_shown', { feature });
    }
  }, [visible, feature]);

  const handlePurchase = async (pkgId?: string) => {
    try {
      setIsPurchasing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      await purchase(pkgId);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        t('subscription.upsell.unlockPro'),
        'Pro unlocked! Enjoy all premium features.',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (err: any) {
      if (!err.userCancelled) {
        Alert.alert(
          'Purchase Failed',
          err.message || 'Something went wrong. Please try again.',
          [{ text: 'OK' }]
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
      
      await restore();
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Restore Complete',
        'Your purchases have been restored.',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (err: any) {
      Alert.alert(
        'Restore Failed',
        err.message || 'Could not restore purchases. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const monthlyPkg = offerings?.monthly;
  const annualPkg = offerings?.annual;

  return (
    <BottomSheet visible={visible} onClose={onClose} showHandle={true}>
      <View style={[styles.container, { backgroundColor: theme.colors.modalBackground }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Upgrade to Pro
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            More control, less noise.
          </Text>
        </View>

        {/* Features List */}
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={wp('5%')} color={theme.colors.success || '#4CAF50'} />
            <Text style={[styles.featureText, { color: theme.colors.text }]}>
              Unlimited custom reminders
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={wp('5%')} color={theme.colors.success || '#4CAF50'} />
            <Text style={[styles.featureText, { color: theme.colors.text }]}>
              Notes on every event
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={wp('5%')} color={theme.colors.success || '#4CAF50'} />
            <Text style={[styles.featureText, { color: theme.colors.text }]}>
              No ads
            </Text>
          </View>
        </View>

        {/* Pricing Options */}
        {monthlyPkg || annualPkg ? (
          <View style={styles.pricingContainer}>
            {annualPkg && (
              <TouchableOpacity
                style={[
                  styles.pricingOption,
                  {
                    backgroundColor: isDark ? '#2A2A2A' : '#F3F4F6',
                    borderColor: isDark ? '#3CC4A2' : '#4E9EFF',
                    borderWidth: 2,
                  }
                ]}
                onPress={() => handlePurchase(annualPkg.identifier)}
                disabled={isPurchasing || isRestoring}
              >
                <View style={styles.pricingHeader}>
                  <Text style={[styles.pricingTitle, { color: theme.colors.text }]}>
                    Annual
                  </Text>
                  {annualPkg.product.priceString && (
                    <Text style={[styles.pricingPrice, { color: theme.colors.text }]}>
                      {annualPkg.product.priceString}
                    </Text>
                  )}
                </View>
                {annualPkg.product.description && (
                  <Text style={[styles.pricingDescription, { color: theme.colors.textSecondary }]}>
                    {annualPkg.product.description}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {monthlyPkg && (
              <TouchableOpacity
                style={[
                  styles.pricingOption,
                  {
                    backgroundColor: isDark ? '#2A2A2A' : '#F3F4F6',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    borderWidth: 1,
                  }
                ]}
                onPress={() => handlePurchase(monthlyPkg.identifier)}
                disabled={isPurchasing || isRestoring}
              >
                <View style={styles.pricingHeader}>
                  <Text style={[styles.pricingTitle, { color: theme.colors.text }]}>
                    Monthly
                  </Text>
                  {monthlyPkg.product.priceString && (
                    <Text style={[styles.pricingPrice, { color: theme.colors.text }]}>
                      {monthlyPkg.product.priceString}
                    </Text>
                  )}
                </View>
                {monthlyPkg.product.description && (
                  <Text style={[styles.pricingDescription, { color: theme.colors.textSecondary }]}>
                    {monthlyPkg.product.description}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: isDark ? '#3CC4A2' : '#4E9EFF',
              }
            ]}
            onPress={() => handlePurchase()}
            disabled={isPurchasing || isRestoring || isLoading}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Start Pro</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Error Message */}
        {error && (
          <Text style={[styles.errorText, { color: theme.colors.error || '#E74C3C' }]}>
            {error}
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
                Restore purchases
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onClose}
            disabled={isPurchasing || isRestoring}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.colors.textSecondary }]}>
              Not now
            </Text>
          </TouchableOpacity>
        </View>

        {/* Legal Text */}
        <Text style={[styles.legalText, { color: theme.colors.textSecondary }]}>
          {t('subscription.legal')}
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
  pricingContainer: {
    marginBottom: wp('4%'),
    gap: wp('3%'),
  },
  pricingOption: {
    padding: wp('4%'),
    borderRadius: wp('3%'),
    marginBottom: wp('2%'),
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: wp('1%'),
  },
  pricingTitle: {
    fontSize: wp('4.5%'),
    fontWeight: '600',
  },
  pricingPrice: {
    fontSize: wp('4.5%'),
    fontWeight: '700',
  },
  pricingDescription: {
    fontSize: wp('3.5%'),
    marginTop: wp('1%'),
  },
  primaryButton: {
    width: '100%',
    paddingVertical: wp('4%'),
    borderRadius: wp('3%'),
    alignItems: 'center',
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

