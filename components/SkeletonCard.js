import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';

const SkeletonCard = ({ style }) => {
  const { theme, isDark } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      },
      style,
    ]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            opacity,
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          }
        ]}
      />
      <View style={styles.content}>
        <View style={[
          styles.line,
          { width: '60%', height: wp('4%'), marginBottom: wp('2%') }
        ]} />
        <View style={[
          styles.line,
          { width: '40%', height: wp('3%') }
        ]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: wp('4%'),
    borderWidth: 1,
    marginBottom: wp('3%'),
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    zIndex: 1,
  },
  line: {
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
});

export default SkeletonCard;

