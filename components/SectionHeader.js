import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';

const SectionHeader = ({ title, subtitle, icon, style }) => {
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {icon && (
        <View style={[
          styles.iconContainer,
          {
            backgroundColor: isDark ? 'rgba(78,158,255,0.15)' : 'rgba(78,158,255,0.1)',
          }
        ]}>
          {icon}
        </View>
      )}
      <View style={styles.textContainer}>
        <Text style={[
          styles.title,
          { color: isDark ? '#F5F5F5' : '#111111' }
        ]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[
            styles.subtitle,
            { color: isDark ? '#A1A1A1' : '#6B7280' }
          ]}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: wp('4%'),
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
  title: {
    fontSize: wp('4.5%'),
    fontWeight: '600',
    fontFamily: 'System',
    marginBottom: wp('0.5%'),
  },
  subtitle: {
    fontSize: wp('3.5%'),
    fontWeight: '400',
    fontFamily: 'System',
  },
});

export default SectionHeader;


