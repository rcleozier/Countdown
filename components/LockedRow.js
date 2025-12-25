import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import ProBadge from './ProBadge';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import * as Haptics from 'expo-haptics';

const LockedRow = ({
  label,
  description,
  onPress,
  icon,
  style,
}) => {
  const { theme, isDark } = useTheme();

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          backgroundColor: isDark ? '#2A2A2A' : '#F9FAFB',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        },
        style,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.leftContent}>
        {icon && (
          <View style={[
            styles.iconContainer,
            {
              backgroundColor: isDark ? 'rgba(78,158,255,0.15)' : 'rgba(78,158,255,0.1)',
            }
          ]}>
            <Ionicons
              name={icon}
              size={20}
              color={isDark ? '#4E9EFF' : '#4A9EFF'}
            />
          </View>
        )}
        <View style={styles.textContainer}>
          <View style={styles.labelRow}>
            <Text style={[
              styles.label,
              { color: isDark ? '#F5F5F5' : '#111111' }
            ]}>
              {label}
            </Text>
            <ProBadge size="small" />
          </View>
          {description && (
            <Text style={[
              styles.description,
              { color: isDark ? '#A1A1A1' : '#6B7280' }
            ]}>
              {description}
            </Text>
          )}
        </View>
      </View>
      <Ionicons
        name="lock-closed"
        size={18}
        color={isDark ? '#6B7280' : '#9CA3AF'}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: wp('4%'),
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: wp('2%'),
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('5%'),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp('3%'),
  },
  textContainer: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: wp('1%'),
    gap: wp('2%'),
  },
  label: {
    fontSize: wp('4%'),
    fontWeight: '500',
    fontFamily: 'System',
  },
  description: {
    fontSize: wp('3.5%'),
    fontFamily: 'System',
  },
});

export default LockedRow;

