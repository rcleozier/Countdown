import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import * as Haptics from 'expo-haptics';

const Pill = ({ 
  label, 
  isActive, 
  onPress, 
  style,
  showChevron = false,
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
        styles.pill,
        {
          backgroundColor: isActive
            ? (isDark ? '#3CC4A2' : '#4E9EFF')
            : (isDark ? '#2A2A2A' : '#F3F4F6'),
          borderColor: isActive
            ? (isDark ? '#3CC4A2' : '#4E9EFF')
            : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
        },
        style,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.pillText,
          {
            color: isActive
              ? '#FFFFFF'
              : (isDark ? '#F5F5F5' : '#111111'),
          }
        ]}
      >
        {label}
      </Text>
      {showChevron && (
        <Text
          style={[
            styles.chevron,
            {
              color: isActive
                ? '#FFFFFF'
                : (isDark ? '#F5F5F5' : '#111111'),
            }
          ]}
        >
          ›
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: wp('4%'),
    paddingVertical: wp('2.5%'),
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
  },
  chevron: {
    fontSize: 16,
    marginLeft: wp('1%'),
    fontWeight: '600',
  },
});

export default Pill;

