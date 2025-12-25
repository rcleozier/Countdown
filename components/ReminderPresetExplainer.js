import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { REMINDER_PRESETS, formatRemindersForDisplay } from '../util/reminderPresets';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import * as Haptics from 'expo-haptics';

const ReminderPresetExplainer = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={[
        styles.overlay,
        { backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)' }
      ]}>
        <View style={[
          styles.content,
          {
            backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          }
        ]}>
          <View style={styles.header}>
            <Text style={[
              styles.title,
              { color: isDark ? '#FFFFFF' : '#1A1A1A' }
            ]}>
              Reminder Presets
            </Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              style={styles.closeButton}
            >
              <Ionicons
                name="close"
                size={wp('5%')}
                color={isDark ? '#A1A1A1' : '#6B7280'}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.presetsList}>
            {Object.values(REMINDER_PRESETS).map((preset) => (
              <View
                key={preset.id}
                style={[
                  styles.presetItem,
                  {
                    backgroundColor: isDark ? '#2A2A2A' : '#F9FAFB',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                  }
                ]}
              >
                <View style={styles.presetHeader}>
                  <Text style={[
                    styles.presetName,
                    { color: isDark ? '#FFFFFF' : '#1A1A1A' }
                  ]}>
                    {preset.name}
                  </Text>
                  {preset.isPro && (
                    <View style={[
                      styles.proTag,
                      {
                        backgroundColor: isDark ? 'rgba(60,196,162,0.2)' : 'rgba(78,158,255,0.15)',
                      }
                    ]}>
                      <Text style={[
                        styles.proTagText,
                        { color: isDark ? '#3CC4A2' : '#4E9EFF' }
                      ]}>
                        PRO
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[
                  styles.presetDescription,
                  { color: isDark ? '#A1A1A1' : '#6B7280' }
                ]}>
                  {preset.description}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            style={[
              styles.closeButtonBottom,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              }
            ]}
          >
            <Text style={[
              styles.closeButtonText,
              { color: isDark ? '#FFFFFF' : '#1A1A1A' }
            ]}>
              Got it
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '85%',
    maxWidth: wp('85%'),
    borderRadius: wp('4%'),
    padding: wp('5%'),
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: wp('4%'),
  },
  title: {
    fontSize: wp('5%'),
    fontWeight: '700',
    fontFamily: 'System',
  },
  closeButton: {
    padding: wp('1%'),
  },
  presetsList: {
    marginBottom: wp('4%'),
  },
  presetItem: {
    padding: wp('4%'),
    borderRadius: wp('2.5%'),
    borderWidth: 1,
    marginBottom: wp('3%'),
  },
  presetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: wp('1.5%'),
  },
  presetName: {
    fontSize: wp('4%'),
    fontWeight: '600',
    fontFamily: 'System',
    marginRight: wp('2%'),
  },
  proTag: {
    paddingHorizontal: wp('2%'),
    paddingVertical: wp('0.8%'),
    borderRadius: wp('1%'),
  },
  proTagText: {
    fontSize: wp('2.5%'),
    fontWeight: '700',
    fontFamily: 'System',
    letterSpacing: 0.5,
  },
  presetDescription: {
    fontSize: wp('3.5%'),
    fontWeight: '400',
    fontFamily: 'System',
    lineHeight: wp('5%'),
  },
  closeButtonBottom: {
    paddingVertical: wp('3.5%'),
    borderRadius: wp('2.5%'),
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: wp('4%'),
    fontWeight: '600',
    fontFamily: 'System',
  },
});

export default ReminderPresetExplainer;

