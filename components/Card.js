import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';

const Card = ({ 
  children, 
  onPress, 
  style,
  pressable = false,
}) => {
  const { theme, isDark } = useTheme();

  const cardStyle = [
    styles.card,
    {
      backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
      shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    style,
  ];

  if (pressable && onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          cardStyle,
          pressed && { opacity: 0.8 },
        ]}
        onPress={onPress}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: wp('4%'),
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
});

export default Card;


