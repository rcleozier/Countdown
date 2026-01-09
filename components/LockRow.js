import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import ProBadge from './ProBadge';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import * as Haptics from 'expo-haptics';

const LockRow = ({ 
  onPress, 
  message = 'Upgrade to Pro to unlock this feature',
  icon = 'lock-closed',
  showProBadge = true,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        }
      ]}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon}
        size={wp('4%')}
        color={isDark ? '#6B7280' : '#9CA3AF'}
        style={styles.icon}
      />
      <Text style={[
        styles.text,
        { color: isDark ? '#A1A1A1' : '#6B7280' }
      ]}>
        {message}
      </Text>
      {showProBadge && <ProBadge size="small" />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: wp('3%'),
    paddingHorizontal: wp('4%'),
    borderRadius: wp('2.5%'),
    borderWidth: 1,
    marginTop: wp('2%'),
  },
  icon: {
    marginRight: wp('2%'),
  },
  text: {
    fontSize: wp('3.5%'),
    flex: 1,
    fontFamily: 'System',
  },
});

export default LockRow;


