import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useLocale } from '../context/LocaleContext';
import { useTheme } from '../context/ThemeContext';
import { getAllPresets } from '../util/reminderPresets';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import * as Haptics from 'expo-haptics';

const ReminderPresetSelector = ({ selectedPresetId, onSelect }) => {
  const { t } = useLocale();
  const { theme, isDark } = useTheme();
  const presets = getAllPresets();

  const handleSelect = (presetId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(presetId);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: isDark ? '#F5F5F5' : '#111111' }]}>
        {t('create.selectReminderPreset')}
      </Text>
      
      <View style={styles.presetContainer}>
        {presets.map((preset) => (
          <TouchableOpacity
            key={preset.id}
            style={[
              styles.presetChip,
              {
                backgroundColor: selectedPresetId === preset.id
                  ? (isDark ? '#3CC4A2' : '#4E9EFF')
                  : (isDark ? '#2A2A2A' : '#F3F4F6'),
                borderColor: selectedPresetId === preset.id
                  ? (isDark ? '#3CC4A2' : '#4E9EFF')
                  : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
              }
            ]}
            onPress={() => handleSelect(preset.id)}
          >
            <Text
              style={[
                styles.presetText,
                {
                  color: selectedPresetId === preset.id
                    ? '#FFFFFF'
                    : (isDark ? '#F5F5F5' : '#111111'),
                }
              ]}
            >
              {preset.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: wp('4%'),
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: wp('3%'),
    paddingHorizontal: wp('2%'),
  },
  presetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: wp('2%'),
    gap: wp('2%'),
  },
  presetChip: {
    paddingHorizontal: wp('4%'),
    paddingVertical: wp('2.5%'),
    borderRadius: 20,
    borderWidth: 1,
    marginRight: wp('2%'),
    marginBottom: wp('2%'),
  },
  presetText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ReminderPresetSelector;

