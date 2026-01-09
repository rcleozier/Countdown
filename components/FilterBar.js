import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useLocale } from '../context/LocaleContext';
import { useTheme } from '../context/ThemeContext';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import * as Haptics from 'expo-haptics';

const FilterBar = ({ 
  filterType, 
  onFilterChange, 
  sortType, 
  onSortChange 
}) => {
  const { t } = useLocale();
  const { theme, isDark } = useTheme();

  const filters = [
    { id: 'all', label: t('filters.all') },
    { id: 'upcoming', label: t('filters.upcoming') },
    { id: 'past', label: t('filters.past') },
  ];

  const sorts = [
    { id: 'soonest', label: t('filters.sortSoonest') },
    { id: 'recent', label: t('filters.sortRecent') },
    { id: 'name', label: t('filters.sortName') },
  ];

  const handleFilterPress = (filterId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onFilterChange(filterId);
  };

  const handleSortPress = (sortId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSortChange(sortId);
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterChip,
              {
                backgroundColor: filterType === filter.id
                  ? (isDark ? '#3CC4A2' : '#4E9EFF')
                  : (isDark ? '#2A2A2A' : '#F3F4F6'),
                borderColor: filterType === filter.id
                  ? (isDark ? '#3CC4A2' : '#4E9EFF')
                  : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
              }
            ]}
            onPress={() => handleFilterPress(filter.id)}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: filterType === filter.id
                    ? '#FFFFFF'
                    : (isDark ? '#F5F5F5' : '#111111'),
                }
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}

        <View style={[styles.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />

        {sorts.map((sort) => (
          <TouchableOpacity
            key={sort.id}
            style={[
              styles.filterChip,
              {
                backgroundColor: sortType === sort.id
                  ? (isDark ? '#3CC4A2' : '#4E9EFF')
                  : (isDark ? '#2A2A2A' : '#F3F4F6'),
                borderColor: sortType === sort.id
                  ? (isDark ? '#3CC4A2' : '#4E9EFF')
                  : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
              }
            ]}
            onPress={() => handleSortPress(sort.id)}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: sortType === sort.id
                    ? '#FFFFFF'
                    : (isDark ? '#F5F5F5' : '#111111'),
                }
              ]}
            >
              {sort.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: wp('2%'),
  },
  scrollContent: {
    paddingHorizontal: wp('4%'),
    paddingVertical: wp('2%'),
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: wp('4%'),
    paddingVertical: wp('2.5%'),
    borderRadius: 20,
    borderWidth: 1,
    marginRight: wp('2%'),
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  separator: {
    width: 1,
    height: 24,
    marginHorizontal: wp('2%'),
  },
});

export default FilterBar;


