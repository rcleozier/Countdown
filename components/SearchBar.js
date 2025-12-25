import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocale } from '../context/LocaleContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';

const SearchBar = ({ onSearch, debounceMs = 300 }) => {
  const [searchText, setSearchText] = useState('');
  const { t } = useLocale();
  const { theme, isDark } = useTheme();
  const debounceTimeoutRef = useRef(null);

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (onSearch) {
        onSearch(searchText);
      }
    }, debounceMs);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchText, onSearch, debounceMs]);

  const handleClear = () => {
    setSearchText('');
    if (onSearch) {
      onSearch('');
    }
  };

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: isDark ? '#2A2A2A' : '#F9FAFB',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      }
    ]}>
      <Ionicons
        name="search"
        size={20}
        color={isDark ? '#9CA3AF' : '#6B7280'}
        style={styles.searchIcon}
      />
      <TextInput
        style={[styles.input, { color: isDark ? '#F5F5F5' : '#111111' }]}
        placeholder={t('common.search')}
        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
        value={searchText}
        onChangeText={setSearchText}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {searchText.length > 0 && (
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <Ionicons
            name="close-circle"
            size={20}
            color={isDark ? '#9CA3AF' : '#6B7280'}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: wp('3%'),
    marginHorizontal: wp('4%'),
    marginVertical: wp('2%'),
    height: 44,
  },
  searchIcon: {
    marginRight: wp('2%'),
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  clearButton: {
    marginLeft: wp('2%'),
    padding: wp('1%'),
  },
});

export default SearchBar;

