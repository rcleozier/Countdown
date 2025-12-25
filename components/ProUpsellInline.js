import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import ProBadge from './ProBadge';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import * as Haptics from 'expo-haptics';

const ProUpsellInline = ({ onPress, message = 'Upgrade to Pro for longer notes' }) => {
  const { theme, isDark } = useTheme();

  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      style={styles.container}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Ionicons
          name="lock-closed"
          size={wp('3.5%')}
          color={isDark ? '#6B7280' : '#9CA3AF'}
          style={styles.icon}
        />
        <Text style={[
          styles.text,
          { color: isDark ? '#6B7280' : '#9CA3AF' }
        ]}>
          {message}
        </Text>
        <ProBadge size="small" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: wp('2%'),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: wp('2%'),
    paddingHorizontal: wp('3%'),
    borderRadius: wp('2%'),
    backgroundColor: 'rgba(78,158,255,0.05)',
  },
  icon: {
    marginRight: wp('2%'),
  },
  text: {
    fontSize: wp('3%'),
    flex: 1,
    fontFamily: 'System',
  },
});

export default ProUpsellInline;

