import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocale } from '../context/LocaleContext';
import { useTheme } from '../context/ThemeContext';
import { getAllPresets, getPresetReminders } from '../util/reminderPresets';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import * as Haptics from 'expo-haptics';

const ReminderPresetSelector = ({ selectedPresetId, onSelect, showHelperText = false }) => {
  const { t } = useLocale();
  const { theme, isDark } = useTheme();
  const presets = getAllPresets();

  const handleSelect = (presetId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(presetId);
  };

  const getHelperText = (presetId) => {
    const reminders = getPresetReminders(presetId);
    if (reminders.length === 0) return '';
    
    const reminderTexts = reminders.map(r => {
      if (r.unit === 'days') {
        return r.offset === 1 ? '1 day before' : `${r.offset} days before`;
      } else if (r.unit === 'weeks') {
        return r.offset === 1 ? '1 week before' : `${r.offset} weeks before`;
      } else if (r.unit === 'months') {
        return r.offset === 1 ? '1 month before' : `${r.offset} months before`;
      }
      return '';
    });
    
    if (reminderTexts.length === 1) {
      return reminderTexts[0];
    } else {
      return `${reminderTexts.length} reminders: ${reminderTexts.join(', ')}`;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.presetContainer}>
        {presets.map((preset) => (
          <View key={preset.id} style={styles.presetWrapper}>
            <TouchableOpacity
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
            {showHelperText && selectedPresetId === preset.id && (
              <Text style={[
                styles.helperText,
                { color: isDark ? '#A1A1A1' : '#6B7280' }
              ]}>
                {getHelperText(preset.id)}
              </Text>
            )}
          </View>
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
  presetWrapper: {
    marginRight: wp('2%'),
    marginBottom: wp('2%'),
  },
  presetChip: {
    paddingHorizontal: wp('4%'),
    paddingVertical: wp('2.5%'),
    borderRadius: 20,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 14,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    marginTop: wp('1.5%'),
    paddingHorizontal: wp('4%'),
    fontStyle: 'italic',
  },
});

export default ReminderPresetSelector;

