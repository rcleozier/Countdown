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

const PaywallSheet = ({ visible, onClose, feature }) => {
  const { theme, isDark } = useTheme();
  const { t } = useLocale();
  const { purchase, restore, offerings, isLoading, error } = usePurchases();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    if (visible && feature) {
      Analytics.trackEvent('paywall_shown', { feature });
      setForceShow(true); // ensure sheet renders even if offerings missing
    }
  }, [visible, feature]);

  const handlePurchase = async (pkgId) => {
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
    } catch (err) {
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
    } catch (err) {
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

  return (
    <BottomSheet visible={visible} onClose={onClose} showHandle={true}>
      <View style={[
        styles.container,
        { backgroundColor: theme.colors.modalBackground, minHeight: wp('10%') }
      ]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {feature === 'Standard & Intense Reminders' 
              ? 'Upgrade for stronger reminders'
              : 'Upgrade to Pro'
            }
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {feature === 'Standard & Intense Reminders'
              ? 'Standard and Intense reminders are included with Pro.'
              : 'More control, less noise.'
            }
          </Text>
        </View>

        {/* Features List */}
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={wp('5%')} color={theme.colors.success || '#4CAF50'} />
            <Text style={[styles.featureText, { color: theme.colors.text }]}>
              Standard & Intense reminders
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={wp('5%')} color={theme.colors.success || '#4CAF50'} />
            <Text style={[styles.featureText, { color: theme.colors.text }]}>
              Extended notes (up to 5000 characters)
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={wp('5%')} color={theme.colors.success || '#4CAF50'} />
            <Text style={[styles.featureText, { color: theme.colors.text }]}>
              No ads
            </Text>
          </View>
        </View>

        {/* Purchase Button */}
        {monthlyPkg ? (
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: isDark ? '#3CC4A2' : '#4E9EFF',
              }
            ]}
            onPress={() => handlePurchase(monthlyPkg.identifier)}
            disabled={isPurchasing || isRestoring || isLoading}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Subscribe for {monthlyPkg.product.priceString}/month</Text>
            )}
          </TouchableOpacity>
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
