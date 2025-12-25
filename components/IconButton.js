import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import * as Haptics from 'expo-haptics';

const IconButton = ({
  icon,
  onPress,
  size = 20,
  color,
  backgroundColor,
  style,
  hitSlop = 10,
}) => {
  const { theme, isDark } = useTheme();

  const defaultColor = color || (isDark ? '#A1A1A1' : '#6B7280');
  const defaultBg = backgroundColor || (isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6');

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: defaultBg,
          width: wp('10%'),
          height: wp('10%'),
          borderRadius: wp('5%'),
        },
        style,
      ]}
      onPress={handlePress}
      hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon}
        size={size}
        color={defaultColor}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default IconButton;

