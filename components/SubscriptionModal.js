import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
} from 'react-native';
import { useSubscription } from '../context/SubscriptionContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { SUBSCRIPTION_PLAN } from '../util/subscriptionPlans';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import * as Haptics from 'expo-haptics';

const SubscriptionModal = ({ visible, onClose, onSubscribe }) => {
  const { isPurchasing, purchaseSubscription, hasActiveSubscription, restorePurchases } = useSubscription();
  const { theme, isDark } = useTheme();
  const { t } = useLocale();
  const plan = SUBSCRIPTION_PLAN;
  const modalScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(modalScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      modalScale.setValue(0.95);
    }
  }, [visible]);

  const handleSubscribe = async () => {
    if (isPurchasing) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await purchaseSubscription(plan.productId);
    
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (onSubscribe) {
        onSubscribe(result.status);
      }
      onClose();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // In real implementation, show error message
      console.error('Purchase failed:', result.error);
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await restorePurchases();
    if (result.success && result.restored) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } else if (result.success && !result.restored) {
      // No purchases to restore
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  if (hasActiveSubscription) {
    return null; // Don't show modal if already subscribed
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              transform: [{ scale: modalScale }],
            },
          ]}
        >
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="close"
              size={24}
              color={isDark ? '#A1A1A1' : '#6B7280'}
            />
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={[
                styles.iconContainer,
                {
                  backgroundColor: isDark ? 'rgba(78,158,255,0.15)' : 'rgba(78,158,255,0.1)',
                }
              ]}>
                <Ionicons
                  name="star"
                  size={wp('8%')}
                  color={isDark ? '#4E9EFF' : '#4A9EFF'}
                />
              </View>
              <Text style={[
                styles.title,
                { color: isDark ? '#F5F5F5' : '#111111' }
              ]}>
                {t('subscription.title')}
              </Text>
              <Text style={[
                styles.subtitle,
                { color: isDark ? '#A1A1A1' : '#6B7280' }
              ]}>
                {t('subscription.subtitle')}
              </Text>
            </View>

            {/* Features List */}
            <View style={styles.featuresContainer}>
              {[
                'unlimited_countdowns',
                'unlimited_notes',
                'advanced_reminders',
                'export_data',
                'no_ads',
                'priority_support',
              ].map((feature, index) => (
                <View key={feature} style={styles.featureItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={isDark ? '#3CC4A2' : '#4E9EFF'}
                    style={styles.featureIcon}
                  />
                  <Text style={[
                    styles.featureText,
                    { color: isDark ? '#F5F5F5' : '#111111' }
                  ]}>
                    {t(`subscription.features.${feature}`)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Plan Pricing */}
            <View style={styles.plansContainer}>
              <View style={[
                styles.planCard,
                {
                  backgroundColor: isDark ? 'rgba(78,158,255,0.15)' : 'rgba(78,158,255,0.1)',
                  borderColor: isDark ? '#3CC4A2' : '#4E9EFF',
                  borderWidth: 2,
                }
              ]}>
                <View style={styles.planHeader}>
                  <Text style={[
                    styles.planName,
                    { color: isDark ? '#F5F5F5' : '#111111' }
                  ]}>
                    {t('subscription.plans.monthly.name') || 'Monthly'}
                  </Text>
                </View>
                
                <View style={styles.planPricing}>
                  <Text style={[
                    styles.planPrice,
                    { color: isDark ? '#F5F5F5' : '#111111' }
                  ]}>
                    {plan.price}
                  </Text>
                  <Text style={[
                    styles.planPricePerMonth,
                    { color: isDark ? '#A1A1A1' : '#6B7280' }
                  ]}>
                    {t('subscription.perMonth') || 'per month'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Subscribe Button */}
            <TouchableOpacity
              style={[
                styles.subscribeButton,
                {
                  backgroundColor: isDark ? '#3CC4A2' : '#4E9EFF',
                  opacity: isPurchasing ? 0.7 : 1,
                }
              ]}
              onPress={handleSubscribe}
              disabled={isPurchasing}
            >
              <LinearGradient
                colors={isDark ? ['#3CC4A2', '#2AA882'] : ['#4E9EFF', '#3B7FE6']}
                style={styles.subscribeButtonGradient}
              >
                <Text style={styles.subscribeButtonText}>
                  {isPurchasing ? t('subscription.processing') : t('subscription.subscribe')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Restore Purchases */}
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
            >
              <Text style={[
                styles.restoreButtonText,
                { color: isDark ? '#A1A1A1' : '#6B7280' }
              ]}>
                {t('subscription.restorePurchases')}
              </Text>
            </TouchableOpacity>

            {/* Legal Text */}
            <Text style={[
              styles.legalText,
              { color: isDark ? '#6B7280' : '#9CA3AF' }
            ]}>
              {t('subscription.legal')}
            </Text>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp('4%'),
  },
  modalContainer: {
    width: '100%',
    maxWidth: wp('90%'),
    maxHeight: hp('85%'),
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: wp('4%'),
    right: wp('4%'),
    zIndex: 10,
    padding: wp('2%'),
  },
  scrollContent: {
    padding: wp('6%'),
    paddingTop: wp('10%'),
  },
  header: {
    alignItems: 'center',
    marginBottom: wp('6%'),
  },
  iconContainer: {
    width: wp('16%'),
    height: wp('16%'),
    borderRadius: wp('8%'),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: wp('4%'),
  },
  title: {
    fontSize: wp('6%'),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: wp('2%'),
  },
  subtitle: {
    fontSize: wp('4%'),
    textAlign: 'center',
    lineHeight: wp('6%'),
  },
  featuresContainer: {
    marginBottom: wp('6%'),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: wp('3%'),
  },
  featureIcon: {
    marginRight: wp('3%'),
  },
  featureText: {
    fontSize: wp('4%'),
    flex: 1,
  },
  plansContainer: {
    marginBottom: wp('6%'),
    gap: wp('3%'),
  },
  planCard: {
    borderRadius: 16,
    padding: wp('5%'),
    borderWidth: 1,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -wp('2%'),
    right: wp('4%'),
    paddingHorizontal: wp('3%'),
    paddingVertical: wp('1%'),
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: wp('3%'),
    fontWeight: '600',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: wp('2%'),
  },
  planName: {
    fontSize: wp('4.5%'),
    fontWeight: '600',
  },
  planSavings: {
    fontSize: wp('3.5%'),
    fontWeight: '600',
  },
  planPricing: {
    marginTop: wp('2%'),
  },
  planPrice: {
    fontSize: wp('6%'),
    fontWeight: '700',
  },
  planPricePerMonth: {
    fontSize: wp('3.5%'),
    marginTop: wp('1%'),
  },
  selectedIndicator: {
    position: 'absolute',
    top: wp('4%'),
    right: wp('4%'),
  },
  subscribeButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: wp('4%'),
    shadowColor: '#4E9EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  subscribeButtonGradient: {
    paddingVertical: wp('4.5%'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: wp('4.5%'),
    fontWeight: '700',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: wp('3%'),
    marginBottom: wp('4%'),
  },
  restoreButtonText: {
    fontSize: wp('3.5%'),
    textDecorationLine: 'underline',
  },
  legalText: {
    fontSize: wp('3%'),
    textAlign: 'center',
    lineHeight: wp('4.5%'),
    marginTop: wp('2%'),
  },
});

export default SubscriptionModal;

