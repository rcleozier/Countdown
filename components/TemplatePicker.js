import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useLocale } from '../context/LocaleContext';
import { useTheme } from '../context/ThemeContext';
import { getAllTemplates } from '../util/eventTemplates';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import * as Haptics from 'expo-haptics';

const TemplatePicker = ({ selectedTemplateId, onSelect, onSkip }) => {
  const { t } = useLocale();
  const { theme, isDark } = useTheme();
  const templates = getAllTemplates();

  const handleSelect = (templateId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(templateId);
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip();
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: isDark ? '#F5F5F5' : '#111111' }]}>
        {t('create.selectTemplate')}
      </Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity
          style={[
            styles.templateCard,
            {
              backgroundColor: !selectedTemplateId 
                ? (isDark ? 'rgba(78,158,255,0.15)' : 'rgba(78,158,255,0.1)')
                : (isDark ? '#2A2A2A' : '#F9FAFB'),
              borderColor: !selectedTemplateId
                ? (isDark ? '#3CC4A2' : '#4E9EFF')
                : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
            }
          ]}
          onPress={handleSkip}
        >
          <Text style={[styles.templateIcon, { fontSize: 32 }]}>✕</Text>
          <Text style={[styles.templateName, { color: isDark ? '#F5F5F5' : '#111111' }]}>
            {t('create.noTemplate')}
          </Text>
        </TouchableOpacity>

        {templates.map((template) => (
          <TouchableOpacity
            key={template.id}
            style={[
              styles.templateCard,
              {
                backgroundColor: selectedTemplateId === template.id
                  ? (isDark ? 'rgba(78,158,255,0.15)' : 'rgba(78,158,255,0.1)')
                  : (isDark ? '#2A2A2A' : '#F9FAFB'),
                borderColor: selectedTemplateId === template.id
                  ? (isDark ? '#3CC4A2' : '#4E9EFF')
                  : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                borderWidth: selectedTemplateId === template.id ? 2 : 1,
              }
            ]}
            onPress={() => handleSelect(template.id)}
          >
            <Text style={styles.templateIcon}>{template.icon}</Text>
            <Text style={[styles.templateName, { color: isDark ? '#F5F5F5' : '#111111' }]}>
              {template.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: wp('2%'),
    paddingVertical: wp('2%'),
  },
  templateCard: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: wp('3%'),
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp('2%'),
  },
  templateIcon: {
    fontSize: 36,
    marginBottom: wp('2%'),
  },
  templateName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default TemplatePicker;

