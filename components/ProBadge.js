import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';

const ProBadge = ({ size = 'small', style }) => {
  const { theme, isDark } = useTheme();

  const fontSize = size === 'small' ? wp('2.5%') : wp('3%');
  const paddingH = size === 'small' ? wp('2%') : wp('2.5%');
  const paddingV = size === 'small' ? wp('0.8%') : wp('1%');

  return (
    <View style={[
      styles.badge,
      {
        backgroundColor: isDark ? 'rgba(60,196,162,0.2)' : 'rgba(78,158,255,0.15)',
        paddingHorizontal: paddingH,
        paddingVertical: paddingV,
      },
      style,
    ]}>
      <Text style={[
        styles.badgeText,
        {
          color: isDark ? '#3CC4A2' : '#4E9EFF',
          fontSize: fontSize,
        }
      ]}>
        PRO
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontWeight: '700',
    fontFamily: 'System',
    letterSpacing: 0.5,
  },
});

export default ProBadge;


