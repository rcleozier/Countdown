import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import * as Haptics from 'expo-haptics';

const FabButton = ({ onPress, icon = 'add', style }) => {
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <LinearGradient
          colors={isDark ? ['#3CC4A2', '#2AA882'] : ['#4E9EFF', '#3B7FE6']}
          style={styles.button}
        >
          <Ionicons
            name={icon}
            size={24}
            color="#FFFFFF"
          />
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: wp('8%'),
    right: wp('5%'),
    zIndex: 1000,
  },
  button: {
    width: wp('14%'),
    height: wp('14%'),
    borderRadius: wp('7%'),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4E9EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});

export default FabButton;


