import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import BottomSheet from './BottomSheet';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Analytics } from '../util/analytics';

const ProUpsellSheet = ({
  visible,
  onClose,
  feature,
  onUpgrade,
}) => {
  const { theme, isDark } = useTheme();
  const { t } = useLocale();

  // Feature descriptions
  const featureDescriptions = {
    custom_reminders: {
      title: t('subscription.upsell.customReminders.title'),
      bullets: [
        t('subscription.upsell.customReminders.bullet1'),
        t('subscription.upsell.customReminders.bullet2'),
        t('subscription.upsell.customReminders.bullet3'),
      ],
    },
    notes: {
      title: t('subscription.upsell.notes.title'),
      bullets: [
        t('subscription.upsell.notes.bullet1'),
        t('subscription.upsell.notes.bullet2'),
        t('subscription.upsell.notes.bullet3'),
      ],
    },
    advanced_templates: {
      title: t('subscription.upsell.advancedTemplates.title'),
      bullets: [
        t('subscription.upsell.advancedTemplates.bullet1'),
        t('subscription.upsell.advancedTemplates.bullet2'),
        t('subscription.upsell.advancedTemplates.bullet3'),
      ],
    },
    unit_controls: {
      title: t('subscription.upsell.unitControls.title'),
      bullets: [
        t('subscription.upsell.unitControls.bullet1'),
        t('subscription.upsell.unitControls.bullet2'),
        t('subscription.upsell.unitControls.bullet3'),
      ],
    },
    smart_suggestions: {
      title: t('subscription.upsell.smartSuggestions.title'),
      bullets: [
        t('subscription.upsell.smartSuggestions.bullet1'),
        t('subscription.upsell.smartSuggestions.bullet2'),
        t('subscription.upsell.smartSuggestions.bullet3'),
      ],
    },
  };

  const featureInfo = featureDescriptions[feature] || {
    title: t('subscription.title'),
    bullets: [
      t('subscription.features.unlimited_countdowns'),
      t('subscription.features.unlimited_notes'),
      t('subscription.features.no_ads'),
    ],
  };

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Analytics.trackEvent && Analytics.trackEvent('pro_upsell_tapped', { feature });
    if (onUpgrade) {
      onUpgrade();
    }
    onClose();
  };

  const handleNotNow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Analytics.trackEvent && Analytics.trackEvent('pro_upsell_dismissed', { feature });
    onClose();
  };

  useEffect(() => {
    if (visible) {
      Analytics.trackEvent && Analytics.trackEvent('pro_upsell_shown', { feature });
    }
  }, [visible, feature]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={featureInfo.title}
      height="50%"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={[
          styles.iconContainer,
          {
            backgroundColor: isDark ? 'rgba(78,158,255,0.15)' : 'rgba(78,158,255,0.1)',
          }
        ]}>
          <Ionicons
            name="star"
            size={wp('12%')}
            color={isDark ? '#4E9EFF' : '#4A9EFF'}
          />
        </View>

        <View style={styles.bulletsContainer}>
          {featureInfo.bullets.map((bullet, index) => (
            <View key={index} style={styles.bulletRow}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={isDark ? '#3CC4A2' : '#4E9EFF'}
                style={styles.bulletIcon}
              />
              <Text style={[
                styles.bulletText,
                { color: isDark ? '#F5F5F5' : '#111111' }
              ]}>
                {bullet}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={handleUpgrade}
        >
          <LinearGradient
            colors={isDark ? ['#3CC4A2', '#2AA882'] : ['#4E9EFF', '#3B7FE6']}
            style={styles.upgradeButtonGradient}
          >
            <Text style={styles.upgradeButtonText}>
              {t('subscription.upsell.unlockPro')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.notNowButton}
          onPress={handleNotNow}
        >
          <Text style={[
            styles.notNowText,
            { color: isDark ? '#A1A1A1' : '#6B7280' }
          ]}>
            {t('subscription.upsell.notNow')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingBottom: wp('4%'),
  },
  iconContainer: {
    width: wp('20%'),
    height: wp('20%'),
    borderRadius: wp('10%'),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: wp('5%'),
  },
  bulletsContainer: {
    width: '100%',
    marginBottom: wp('6%'),
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: wp('3%'),
    paddingHorizontal: wp('2%'),
  },
  bulletIcon: {
    marginRight: wp('3%'),
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: wp('4%'),
    lineHeight: wp('6%'),
    fontFamily: 'System',
  },
  upgradeButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: wp('3%'),
    shadowColor: '#4E9EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeButtonGradient: {
    paddingVertical: wp('4.5%'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: wp('4.5%'),
    fontWeight: '700',
    fontFamily: 'System',
  },
  notNowButton: {
    paddingVertical: wp('3%'),
  },
  notNowText: {
    fontSize: wp('3.5%'),
    fontFamily: 'System',
  },
});

export default ProUpsellSheet;

