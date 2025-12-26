import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";
import { useFocusEffect } from "@react-navigation/native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { Analytics } from '../util/analytics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { G, Text as SvgText, Path, Rect, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

const AnalyticsScreen = () => {
  const [stats, setStats] = useState({ total: 0, upcoming: 0, past: 0 });
  const [nextEvent, setNextEvent] = useState(null);
  const [monthlyLabels, setMonthlyLabels] = useState([]);
  const [monthlyCounts, setMonthlyCounts] = useState([]);
  const [dayOfWeekLabels, setDayOfWeekLabels] = useState([]);
  const [dayOfWeekCounts, setDayOfWeekCounts] = useState([]);
  const { theme, isDark } = useTheme();
  const { t } = useLocale();
  
  // Animation values for count-up effect
  const totalAnim = useRef(new Animated.Value(0)).current;
  const upcomingAnim = useRef(new Animated.Value(0)).current;
  const pastAnim = useRef(new Animated.Value(0)).current;
  const nextEventCardScale = useRef(new Animated.Value(1)).current;

  const loadAnalytics = async () => {
    try {
      const stored = await AsyncStorage.getItem("countdowns");
      const allEvents = stored ? JSON.parse(stored) : [];
      const now = moment();
      // Use nextOccurrenceAt for recurring events
      const upcoming = allEvents.filter((e) => {
        const eventDate = e.nextOccurrenceAt || e.date;
        return moment(eventDate).isAfter(now);
      });
      const past = allEvents.filter((e) => {
        const eventDate = e.nextOccurrenceAt || e.date;
        return moment(eventDate).isBefore(now);
      });
      
      const newStats = {
        total: allEvents.length,
        upcoming: upcoming.length,
        past: past.length,
      };
      setStats(newStats);

      // Animate count-up
      Animated.parallel([
        Animated.timing(totalAnim, {
          toValue: newStats.total,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(upcomingAnim, {
          toValue: newStats.upcoming,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(pastAnim, {
          toValue: newStats.past,
          duration: 500,
          useNativeDriver: false,
        }),
      ]).start();

      // Next upcoming event
      const sortedUpcoming = upcoming.sort((a, b) => {
        const dateA = moment(a.nextOccurrenceAt || a.date);
        const dateB = moment(b.nextOccurrenceAt || b.date);
        return dateA.diff(dateB);
      });
      if (sortedUpcoming.length > 0) {
        setNextEvent(sortedUpcoming[0]);
      } else {
        setNextEvent(null);
      }

      // Monthly buckets (next 6 months including current)
      const start = moment().startOf('month');
      const labels = [];
      const buckets = Array(6).fill(0);
      for (let i = 0; i < 6; i++) labels.push(start.clone().add(i, 'months').format('MMM'));
      allEvents.forEach((e) => {
        const eventDate = e.nextOccurrenceAt || e.date;
        const m = moment(eventDate);
        if (m.isSameOrAfter(start) && m.isBefore(start.clone().add(6, 'months'))) {
          const idx = m.diff(start, 'months');
          if (idx >= 0 && idx < 6) buckets[idx] += 1;
        }
      });
      setMonthlyLabels(labels);
      setMonthlyCounts(buckets);

      // Events by day of week
      const dayLabels = [
        t('analytics.days.sun'),
        t('analytics.days.mon'),
        t('analytics.days.tue'),
        t('analytics.days.wed'),
        t('analytics.days.thu'),
        t('analytics.days.fri'),
        t('analytics.days.sat')
      ];
      const dayCounts = Array(7).fill(0);
      allEvents.forEach((e) => {
        const eventDate = e.nextOccurrenceAt || e.date;
        const dayIndex = moment(eventDate).day();
        dayCounts[dayIndex] += 1;
      });
      setDayOfWeekLabels(dayLabels);
      setDayOfWeekCounts(dayCounts);
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  };

  useEffect(() => {
    Analytics.initialize();
    Analytics.trackScreenView('Analytics');
    loadAnalytics();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, [])
  );

  // Accent colors - slightly brighter in dark mode
  const accentColor = isDark ? '#4E9EFF' : '#4A9EFF';
  const accentLight = isDark ? '#6BB0FF' : '#6DB5FF';
  const successColor = '#4CAF50';
  const warningColor = '#FF9800';

  const AnimatedNumber = ({ animValue, style }) => {
    const [displayValue, setDisplayValue] = useState(0);
    
    useEffect(() => {
      const listener = animValue.addListener(({ value }) => {
        setDisplayValue(Math.round(value));
      });
      return () => animValue.removeListener(listener);
    }, [animValue]);
    
    return <Text style={style}>{displayValue}</Text>;
  };

  // BarChart component - defined inside main component to access theme variables
  const BarChart = ({ labels, values, gradientId }) => {
    const maxVal = Math.max(...values, 1);
    const chartH = 56; // Reduced by 20% from 70
    const chartW = 100;
    const leftPadding = 6;
    const rightPadding = 2;
    const usableW = chartW - leftPadding - rightPadding;
    const barWidth = usableW / labels.length * 0.7;
    const gap = usableW / labels.length * 0.3;
    const baseY = chartH - 8;
    const chartTop = 4;
    const chartHeight = baseY - chartTop;
    
    const yTicks = [];
    const numTicks = 5;
    for (let i = 0; i <= numTicks; i++) {
      const value = Math.round((maxVal * i) / numTicks);
      const y = baseY - (chartHeight * i) / numTicks;
      yTicks.push({ value, y });
    }
    
    return (
      <Svg viewBox={`0 0 ${chartW} ${chartH}`} width="100%" height={wp('40%')}>
        <Defs>
          <SvgLinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={accentColor} stopOpacity="0.85" />
            <Stop offset="100%" stopColor={accentLight} stopOpacity="0.65" />
          </SvgLinearGradient>
        </Defs>
        
        {/* Y-axis grid lines and labels */}
        {yTicks.map((tick, i) => (
          <G key={i}>
            <Path 
              d={`M ${leftPadding} ${tick.y} H ${chartW - rightPadding}`} 
              stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'} 
              strokeWidth={0.2} 
              opacity={0.4}
            />
            <SvgText 
              x={leftPadding - 1} 
              y={tick.y + 1} 
              fill={isDark ? '#A1A1A1' : '#6B7280'} 
              fontSize={2.2} 
              textAnchor="end"
              fontFamily="System"
            >
              {tick.value}
            </SvgText>
          </G>
        ))}
        
        {/* X-axis */}
        <Path 
          d={`M ${leftPadding} ${baseY} H ${chartW - rightPadding}`} 
          stroke={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'} 
          strokeWidth={0.6} 
        />
        
        {/* Bars with gradient and rounded corners */}
        {values.map((v, i) => {
          const barHeight = (v / maxVal) * chartHeight;
          const x = leftPadding + (usableW / labels.length) * i + gap / 2;
          const y = baseY - barHeight;
          
          return (
            <G key={i}>
              <Rect 
                x={x} 
                y={y} 
                width={barWidth} 
                height={barHeight} 
                fill={`url(#${gradientId})`}
                rx={3}
                ry={3}
              />
              <SvgText 
                x={x + barWidth / 2} 
                y={chartH - 1} 
                fill={isDark ? '#A1A1A1' : '#6B7280'} 
                fontSize={2.5} 
                textAnchor="middle"
                fontFamily="System"
              >
                {labels[i]}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    );
  };

  const StatCard = ({ title, subtitle, value, icon, color, animValue, index }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    
    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    };
    
    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    };
    
    return (
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={[
          styles.statCard,
          {
            backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            transform: [{ scale: scaleAnim }],
          }
        ]}>
          {/* Icon - smaller, reduced opacity */}
          <View style={[
            styles.statIconContainer,
            {
              backgroundColor: isDark 
                ? `${color}15` 
                : `${color}08`,
            }
          ]}>
            <Ionicons name={icon} size={wp('4%')} color={color} style={{ opacity: 0.7 }} />
          </View>
          
          {/* Large number - most prominent */}
          {animValue ? (
            <AnimatedNumber 
              animValue={animValue} 
              style={[
                styles.statValue, 
                { 
                  color: isDark ? '#FFFFFF' : '#1A1A1A',
                }
              ]} 
            />
          ) : (
            <Text style={[
              styles.statValue, 
              { 
                color: isDark ? '#FFFFFF' : '#1A1A1A',
              }
            ]}>{value}</Text>
          )}
          
          {/* Title */}
          <Text style={[
            styles.statTitle,
            { 
              color: isDark ? '#F5F5F5' : '#111111',
            }
          ]}>{title}</Text>
          
          {/* Subtitle */}
          {subtitle && (
            <Text style={[
              styles.statSubtitle,
              { 
                color: isDark ? '#6B7280' : '#9CA3AF',
              }
            ]}>{subtitle}</Text>
          )}
        </Animated.View>
      </Pressable>
    );
  };

  // Background gradient
  const backgroundGradient = isDark 
    ? ['#121212', '#1C1C1C']
    : ['#F9FAFB', '#FFFFFF'];

  return (
    <LinearGradient colors={backgroundGradient} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Next Event - Primary Focus at Top */}
          {nextEvent && (
            <View style={styles.nextEventSection}>
              <View style={styles.nextEventSectionHeader}>
                <Text style={[
                  styles.nextEventSectionTitle,
                  { color: accentColor }
                ]}>
                  {t('analytics.nextEvent')}
                </Text>
              </View>
              
              <View style={[
                styles.nextEventCard,
                {
                  backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  shadowColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
                }
              ]}>
                <View style={styles.nextEventHeader}>
                  <View style={[
                    styles.nextEventIconContainer,
                    {
                      backgroundColor: isDark 
                        ? 'rgba(78,158,255,0.15)' 
                        : 'rgba(78,158,255,0.1)',
                    }
                  ]}>
                    <Text style={styles.nextEventIcon}>{nextEvent.icon}</Text>
                  </View>
                  <View style={styles.nextEventInfo}>
                    <Text style={[
                      styles.nextEventName,
                      { color: isDark ? '#F5F5F5' : '#111111' }
                    ]}>{nextEvent.name}</Text>
                    
                    {/* Time Remaining - Larger, Prominent */}
                    <Text style={[
                      styles.nextEventTimeRemaining,
                      { color: accentColor }
                    ]}>
                      {(() => {
                        const now = moment();
                        const eventDate = moment(nextEvent.date);
                        const diff = eventDate.diff(now);
                        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        
                        if (days > 0) {
                          return t('analytics.daysRemaining', { count: days });
                        } else if (hours > 0) {
                          return t('analytics.hoursRemaining', { count: hours });
                        } else {
                          return t('analytics.minutesRemaining', { count: minutes });
                        }
                      })()}
                    </Text>
                    
                    <Text style={[
                      styles.nextEventDate,
                      { color: isDark ? '#A1A1A1' : '#6B7280' }
                    ]}>
                      {moment(nextEvent.date).format("MMM D, YYYY [at] h:mm A")}
                    </Text>
                  </View>
                </View>
                
                {/* Progress Bar */}
                <View style={[
                  styles.progressBarContainer,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  }
                ]}>
                  <View style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: accentColor,
                      width: `${Math.min(100, Math.max(0, (moment(nextEvent.date).diff(moment()) / (1000 * 60 * 60 * 24 * 30)) * 100))}%`,
                    }
                  ]} />
                </View>
              </View>
            </View>
          )}

          {/* Section Divider */}
          <View style={[
            styles.sectionDivider,
            {
              backgroundColor: isDark 
                ? 'rgba(255,255,255,0.05)' 
                : 'rgba(0,0,0,0.05)',
            }
          ]} />

          {/* Summary Cards - Secondary */}
          <View style={styles.summarySection}>
            <View style={styles.statsGrid}>
              <StatCard 
                title={t('analytics.totalEvents')} 
                subtitle={t('analytics.totalEvents')}
                value={stats.total} 
                icon="calendar" 
                color={accentColor}
                animValue={totalAnim}
                index={0}
              />
              <StatCard 
                title={t('analytics.upcoming')} 
                subtitle={t('analytics.comingUp')}
                value={stats.upcoming} 
                icon="time" 
                color={successColor}
                animValue={upcomingAnim}
                index={1}
              />
              <StatCard 
                title={t('analytics.pastEvents')} 
                subtitle={t('analytics.completed')}
                value={stats.past} 
                icon="checkmark-circle" 
                color={warningColor}
                animValue={pastAnim}
                index={2}
              />
            </View>
          </View>

          {/* Section Divider */}
          <View style={[
            styles.sectionDivider,
            {
              backgroundColor: isDark 
                ? 'rgba(255,255,255,0.05)' 
                : 'rgba(0,0,0,0.05)',
            }
          ]} />

          {/* Insights Section */}
          <View style={styles.insightsSection}>
            <Text style={[
              styles.insightsLabel,
              { color: isDark ? '#A1A1A1' : '#6B7280' }
            ]}>{t('analytics.insights')}</Text>
            
            {/* Bar chart - Upcoming by Month */}
            <View style={styles.chartSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>
                  {t('analytics.upcomingByMonth')}
                </Text>
              </View>
              <View style={[
                styles.chartCard,
                {
                  backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                }
              ]}>
                <BarChart 
                  labels={monthlyLabels} 
                  values={monthlyCounts}
                  gradientId="barGradient1"
                />
                <Text style={[
                  styles.chartCaption,
                  { color: isDark ? '#6B7280' : '#9CA3AF' }
                ]}>
                  {t('analytics.chartCaptionUpcoming')}
                </Text>
              </View>
            </View>

            {/* Bar chart - Events by Day of Week */}
            <View style={styles.chartSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>
                  {t('analytics.eventsByDayOfWeek')}
                </Text>
              </View>
              <View style={[
                styles.chartCard,
                {
                  backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                }
              ]}>
                <BarChart 
                  labels={dayOfWeekLabels} 
                  values={dayOfWeekCounts}
                  gradientId="barGradient2"
                />
                <Text style={[
                  styles.chartCaption,
                  { color: isDark ? '#6B7280' : '#9CA3AF' }
                ]}>
                  {t('analytics.chartCaptionDays')}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: wp('5%'), // 20-24px equivalent
    paddingTop: wp('4%'), // Top padding
    paddingBottom: wp('8%'),
  },
  nextEventSection: {
    marginBottom: wp('5%'), // Spacing before divider
  },
  nextEventSectionHeader: {
    marginBottom: wp('3%'),
  },
  nextEventSectionTitle: {
    fontSize: wp('4.5%'), // 18px
    fontWeight: '700', // Bolder
    fontFamily: 'System',
    letterSpacing: 0.3,
  },
  nextEventCard: {
    padding: wp('5%'), // Larger padding for prominence
    borderRadius: wp('4%'), // 16px
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 5,
  },
  nextEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: wp('4%'), // Space before progress bar
  },
  nextEventIconContainer: {
    width: wp('14%'),
    height: wp('14%'),
    borderRadius: wp('7%'),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp('4%'),
  },
  nextEventIcon: {
    fontSize: wp('8%'), // Larger icon
  },
  nextEventInfo: {
    flex: 1,
  },
  nextEventName: {
    fontSize: wp('4.5%'), // 18px
    fontWeight: '600',
    fontFamily: 'System',
    marginBottom: wp('2%'),
    lineHeight: wp('6%'),
  },
  nextEventTimeRemaining: {
    fontSize: wp('5.5%'), // 22px - Large and prominent
    fontWeight: '700',
    fontFamily: 'System',
    marginBottom: wp('1.5%'),
    lineHeight: wp('7%'),
  },
  nextEventDate: {
    fontSize: wp('3.5%'), // 14px
    fontWeight: '500',
    fontFamily: 'System',
    lineHeight: wp('5%'),
  },
  progressBarContainer: {
    height: wp('1.5%'), // 6px
    borderRadius: wp('0.75%'),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: wp('0.75%'),
  },
  sectionDivider: {
    height: 1,
    marginVertical: wp('5%'), // More spacing
    marginHorizontal: wp('1%'),
  },
  summarySection: {
    marginBottom: wp('5%'), // Spacing before next divider
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  statCard: {
    flex: 1,
    minWidth: wp('28%'),
    maxWidth: wp('31%'),
    paddingTop: wp('3%'), // Reduced height
    paddingBottom: wp('3%'),
    paddingHorizontal: wp('2.5%'),
    borderRadius: wp('3.5%'),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
    marginHorizontal: wp('0.5%'),
  },
  statIconContainer: {
    width: wp('9%'), // Slightly smaller
    height: wp('9%'),
    borderRadius: wp('4.5%'),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: wp('1.5%'),
  },
  statValue: {
    fontSize: wp('6%'),
    fontWeight: '700',
    fontFamily: 'System',
    marginBottom: wp('0.5%'),
    textAlign: 'center',
    includeFontPadding: false,
  },
  statTitle: {
    fontSize: wp('3.5%'), // Slightly larger
    fontWeight: '600', // Bolder
    fontFamily: 'System',
    textAlign: 'center',
    includeFontPadding: false,
    marginBottom: wp('0.5%'),
  },
  statSubtitle: {
    fontSize: wp('2.8%'),
    fontWeight: '400',
    fontFamily: 'System',
    textAlign: 'center',
    includeFontPadding: false,
  },
  insightsSection: {
    marginTop: wp('2%'),
  },
  insightsLabel: {
    fontSize: wp('3.5%'),
    fontWeight: '600',
    fontFamily: 'System',
    marginBottom: wp('4%'),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chartSection: {
    marginBottom: wp('5%'), // More spacing between charts
  },
  sectionHeader: {
    marginBottom: wp('3%'),
  },
  sectionTitle: {
    fontSize: wp('4.5%'), // 18px - slightly larger
    fontWeight: '700', // Bolder
    fontFamily: 'System',
  },
  chartCard: {
    padding: wp('4%'),
    borderRadius: wp('3.5%'),
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartCaption: {
    fontSize: wp('3%'), // 12px
    fontWeight: '400',
    fontFamily: 'System',
    marginTop: wp('3%'),
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default AnalyticsScreen;
