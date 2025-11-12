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
      const upcoming = allEvents.filter((e) => moment(e.date).isAfter(now));
      const past = allEvents.filter((e) => moment(e.date).isBefore(now));
      
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
      const sortedUpcoming = upcoming.sort((a, b) => moment(a.date).diff(moment(b.date)));
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
        const m = moment(e.date);
        if (m.isSameOrAfter(start) && m.isBefore(start.clone().add(6, 'months'))) {
          const idx = m.diff(start, 'months');
          if (idx >= 0 && idx < 6) buckets[idx] += 1;
        }
      });
      setMonthlyLabels(labels);
      setMonthlyCounts(buckets);

      // Events by day of week
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayCounts = Array(7).fill(0);
      allEvents.forEach((e) => {
        const dayIndex = moment(e.date).day();
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
    const chartH = 70;
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
            <Stop offset="0%" stopColor={accentColor} stopOpacity="1" />
            <Stop offset="100%" stopColor={accentLight} stopOpacity="0.8" />
          </SvgLinearGradient>
        </Defs>
        
        {/* Y-axis grid lines and labels */}
        {yTicks.map((tick, i) => (
          <G key={i}>
            <Path 
              d={`M ${leftPadding} ${tick.y} H ${chartW - rightPadding}`} 
              stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'} 
              strokeWidth={0.3} 
              opacity={0.5}
            />
            <SvgText 
              x={leftPadding - 1} 
              y={tick.y + 1} 
              fill={isDark ? '#A1A1A1' : '#6B7280'} 
              fontSize={2.5} 
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
                fontSize={2.8} 
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

  const StatCard = ({ title, value, icon, color, animValue, index }) => {
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
          {/* Icon at top */}
          <View style={[
            styles.statIconContainer,
            {
              backgroundColor: isDark 
                ? `${color}25` 
                : `${color}12`,
            }
          ]}>
            <Ionicons name={icon} size={wp('5%')} color={color} />
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
          
          {/* Title below number */}
          <Text style={[
            styles.statTitle,
            { 
              color: isDark ? '#A1A1A1' : '#6B7280',
            }
          ]}>{title}</Text>
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
          {/* Summary Cards - Compact, starts immediately */}
          <View style={styles.summarySection}>
            <View style={styles.statsGrid}>
              <StatCard 
                title="Total Events" 
                value={stats.total} 
                icon="calendar" 
                color={accentColor}
                animValue={totalAnim}
                index={0}
              />
              <StatCard 
                title="Upcoming" 
                value={stats.upcoming} 
                icon="time" 
                color={successColor}
                animValue={upcomingAnim}
                index={1}
              />
              <StatCard 
                title="Past Events" 
                value={stats.past} 
                icon="checkmark-circle" 
                color={warningColor}
                animValue={pastAnim}
                index={2}
              />
            </View>
          </View>

          {/* Bar chart - Upcoming by Month */}
          <View style={styles.chartSection}>
            <View style={styles.sectionHeader}>
              <Ionicons 
                name="calendar-outline" 
                size={wp('4.5%')} 
                color={accentColor} 
                style={styles.sectionIcon}
              />
              <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>
                Upcoming by Month
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
            </View>
          </View>

          {/* Bar chart - Events by Day of Week */}
          <View style={styles.chartSection}>
            <View style={styles.sectionHeader}>
              <Ionicons 
                name="time-outline" 
                size={wp('4.5%')} 
                color={accentColor} 
                style={styles.sectionIcon}
              />
              <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>
                Events by Day of Week
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
            </View>
          </View>

          {/* Next Event */}
          {nextEvent && (
            <View style={styles.nextEventSection}>
              {/* Divider/Gradient fade */}
              <View style={[
                styles.sectionDivider,
                {
                  backgroundColor: isDark 
                    ? 'rgba(255,255,255,0.05)' 
                    : 'rgba(0,0,0,0.05)',
                }
              ]} />
              
              <View style={styles.nextEventSectionHeader}>
                <Ionicons 
                  name="star" 
                  size={wp('4.5%')} 
                  color={accentColor} 
                  style={styles.nextEventSectionIcon}
                />
                <Text style={[
                  styles.nextEventSectionTitle,
                  { color: accentColor }
                ]}>
                  Next Event
                </Text>
              </View>
              
              <Pressable
                onPressIn={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Animated.spring(nextEventCardScale, {
                    toValue: 0.98,
                    useNativeDriver: true,
                    tension: 300,
                    friction: 10,
                  }).start();
                }}
                onPressOut={() => {
                  Animated.spring(nextEventCardScale, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 300,
                    friction: 10,
                  }).start();
                }}
              >
                <Animated.View style={[
                  styles.nextEventCard,
                  {
                    backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    transform: [{ scale: nextEventCardScale }],
                  }
                ]}>
                  <View style={styles.nextEventHeader}>
                    <View style={[
                      styles.nextEventIconContainer,
                      {
                        backgroundColor: isDark 
                          ? 'rgba(255,255,255,0.05)' 
                          : 'rgba(0,0,0,0.03)',
                      }
                    ]}>
                      <Text style={styles.nextEventIcon}>{nextEvent.icon}</Text>
                    </View>
                    <View style={styles.nextEventInfo}>
                      <Text style={[
                        styles.nextEventName,
                        { color: isDark ? '#F5F5F5' : '#111111' }
                      ]}>{nextEvent.name}</Text>
                      <Text style={[
                        styles.nextEventDate,
                        { color: isDark ? '#A1A1A1' : '#6B7280' }
                      ]}>
                        {moment(nextEvent.date).format("MMM D, YYYY [at] h:mm A")}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              </Pressable>
            </View>
          )}
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
    paddingTop: wp('3%'), // Minimal top padding
    paddingBottom: wp('8%'),
  },
  summarySection: {
    marginBottom: wp('6%'), // 24px between summary and first chart
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
    paddingTop: wp('3.5%'),
    paddingBottom: wp('3.5%'),
    paddingHorizontal: wp('2.5%'),
    borderRadius: wp('3.5%'),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    marginHorizontal: wp('0.5%'),
  },
  statIconContainer: {
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('5%'),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: wp('2%'),
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
    fontSize: wp('3.3%'),
    fontWeight: '500',
    fontFamily: 'System',
    textAlign: 'center',
    includeFontPadding: false,
  },
  chartSection: {
    marginBottom: wp('4%'), // 16px between charts
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: wp('3%'),
  },
  sectionIcon: {
    marginRight: wp('2%'),
  },
  sectionTitle: {
    fontSize: wp('4.25%'), // 17px semibold
    fontWeight: '600',
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
  nextEventSection: {
    marginTop: wp('2%'),
    marginBottom: wp('6%'), // 24px breathing room before bottom nav
  },
  sectionDivider: {
    height: 1,
    marginBottom: wp('4%'),
    marginHorizontal: wp('1%'),
  },
  nextEventSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: wp('3%'),
    paddingHorizontal: wp('0.5%'),
  },
  nextEventSectionIcon: {
    marginRight: wp('2.5%'), // 8-10px gap
  },
  nextEventSectionTitle: {
    fontSize: wp('4.25%'), // 16-17px
    fontWeight: '600',
    fontFamily: 'System',
    letterSpacing: 0.3,
  },
  nextEventCard: {
    padding: wp('4.5%'), // 16-18px
    borderRadius: wp('3.5%'), // 12-14px
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
    marginTop: wp('3%'), // ~12px vertical margin
  },
  nextEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextEventIconContainer: {
    width: wp('13%'),
    height: wp('13%'),
    borderRadius: wp('6.5%'), // Circular
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp('4%'),
  },
  nextEventIcon: {
    fontSize: wp('7%'),
  },
  nextEventInfo: {
    flex: 1,
  },
  nextEventName: {
    fontSize: wp('4.25%'), // 17px
    fontWeight: '600',
    fontFamily: 'System',
    marginBottom: wp('1.5%'), // 4-6px spacing
    lineHeight: wp('5.5%'),
  },
  nextEventDate: {
    fontSize: wp('3.5%'), // 14px
    fontWeight: '500',
    fontFamily: 'System',
    lineHeight: wp('5%'),
  },
});

export default AnalyticsScreen;
