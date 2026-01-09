import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocale } from '../context/LocaleContext';
import { useTheme } from '../context/ThemeContext';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import * as Haptics from 'expo-haptics';

const NotesEditor = ({ eventId, initialNotes = '', onSave, autoSaveDelay = 500 }) => {
  const [notes, setNotes] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);
  const { t } = useLocale();
  const { theme, isDark } = useTheme();
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes, eventId]);

  // Debounced autosave
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (notes !== initialNotes) {
      setIsSaving(true);
      saveTimeoutRef.current = setTimeout(() => {
        if (onSave) {
          onSave(notes);
          setIsSaving(false);
        }
      }, autoSaveDelay);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [notes, initialNotes, onSave, autoSaveDelay]);

  const handleSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (onSave) {
      onSave(notes);
      setIsSaving(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[
        styles.editorContainer,
        {
          backgroundColor: isDark ? '#2A2A2A' : '#F9FAFB',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        }
      ]}>
        <TextInput
          style={[
            styles.textInput,
            {
              color: isDark ? '#F5F5F5' : '#111111',
            }
          ]}
          placeholder={t('notes.placeholder')}
          placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
          value={notes}
          onChangeText={setNotes}
          multiline
          textAlignVertical="top"
        />
        {isSaving && (
          <Text style={[styles.savingText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {t('notes.autosave')}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: wp('4%'),
  },
  editorContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: wp('4%'),
    minHeight: 120,
  },
  textInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 100,
  },
  savingText: {
    fontSize: 12,
    marginTop: wp('2%'),
    fontStyle: 'italic',
  },
});

export default NotesEditor;


