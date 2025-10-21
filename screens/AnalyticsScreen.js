import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";
import { useFocusEffect } from "@react-navigation/native";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { Analytics } from '../util/analytics';
import { Ionicons } from '@expo/vector-icons';
import OptimizedBannerAd from '../components/Ads';
import { useTheme } from '../context/ThemeContext';
import Svg, { G, Text as SvgText, Path, Circle, Rect } from 'react-native-svg';

const AnalyticsScreen = () => {
  const [stats, setStats] = useState({ total: 0, upcoming: 0, past: 0 });
  const [nextEvent, setNextEvent] = useState(null);
  const [topIcons, setTopIcons] = useState([]);
  const [monthlyLabels, setMonthlyLabels] = useState([]);
  const [monthlyCounts, setMonthlyCounts] = useState([]);
  const { theme } = useTheme();

  const loadAnalytics = async () => {
    try {
      const stored = await AsyncStorage.getItem("countdowns");
      if (stored) {
        const allEvents = JSON.parse(stored);
        const now = moment();
        const upcoming = allEvents.filter((e) => moment(e.date).isAfter(now));
        const past = allEvents.filter((e) => moment(e.date).isBefore(now));
        
        setStats({
          total: allEvents.length,
          upcoming: upcoming.length,
          past: past.length,
        });

        // Next upcoming event
        const sortedUpcoming = upcoming.sort((a, b) => moment(a.date).diff(moment(b.date)));
        if (sortedUpcoming.length > 0) {
          setNextEvent(sortedUpcoming[0]);
        }

        // Top 5 most used icons
        const iconCounts = {};
        allEvents.forEach((e) => {
          iconCounts[e.icon] = (iconCounts[e.icon] || 0) + 1;
        });
        const topIconsArray = Object.entries(iconCounts)
          .map(([icon, count]) => ({ icon, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        setTopIcons(topIconsArray);

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
      }
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  };

  useEffect(() => {
    Analytics.initialize();
    Analytics.trackScreenView('Analytics');
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, [])
  );

  const BarChart = ({ labels, values }) => {
    const maxVal = Math.max(...values, 1);
    const chartH = 70;
    const chartW = 100;
    const leftPadding = 6; // More space for Y-axis labels
    const rightPadding = 2;
    const usableW = chartW - leftPadding - rightPadding;
    const barWidth = usableW / labels.length * 0.7; // 70% of available space per bar
    const gap = usableW / labels.length * 0.3; // 30% gap
    const baseY = chartH - 8;
    const chartTop = 4;
    const chartHeight = baseY - chartTop;
    
    // Generate Y-axis tick marks and labels
    const yTicks = [];
    const numTicks = 5;
    for (let i = 0; i <= numTicks; i++) {
      const value = Math.round((maxVal * i) / numTicks);
      const y = baseY - (chartHeight * i) / numTicks;
      yTicks.push({ value, y });
    }
    
    return (
      <Svg viewBox={`0 0 ${chartW} ${chartH}`} width="100%" height={wp('45%')}>
        {/* Y-axis grid lines and labels */}
        {yTicks.map((tick, i) => (
          <G key={i}>
            <Path 
              d={`M ${leftPadding} ${tick.y} H ${chartW - rightPadding}`} 
              stroke={theme.colors.border} 
              strokeWidth={0.3} 
              opacity={0.5}
            />
            <SvgText 
              x={leftPadding - 1} 
              y={tick.y + 1} 
              fill={theme.colors.textSecondary} 
              fontSize={2.5} 
              textAnchor="end"
            >
              {tick.value}
            </SvgText>
          </G>
        ))}
        
        {/* X-axis */}
        <Path d={`M ${leftPadding} ${baseY} H ${chartW - rightPadding}`} stroke={theme.colors.border} strokeWidth={0.6} />
        
        {/* Bars + labels */}
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
                fill={theme.colors.primary}
                opacity={0.8}
              />
              <SvgText 
                x={x + barWidth / 2} 
                y={chartH - 1} 
                fill={theme.colors.textSecondary} 
                fontSize={3} 
                textAnchor="middle"
              >
                {labels[i]}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    );
  };


  const StatCard = ({ title, value, icon, color }) => (
    <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={wp('6%')} color={color} />
        <Text style={[styles.statTitle, { color: theme.colors.text }]}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color: theme.colors.primary }]}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={[styles.scrollContent, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          
          {/* Overview Stats */}
          <View style={styles.section}>
            <View style={styles.statsGrid}>
              <StatCard 
                title="Total Events" 
                value={stats.total} 
                icon="calendar-outline" 
                color={theme.colors.primary} 
              />
              <StatCard 
                title="Upcoming" 
                value={stats.upcoming} 
                icon="time-outline" 
                color="#4CAF50" 
              />
              <StatCard 
                title="Past Events" 
                value={stats.past} 
                icon="checkmark-circle-outline" 
                color="#FF9800" 
              />
            </View>
          </View>

          {/* Bar chart near the top */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Upcoming by Month</Text>
            <View style={[styles.chartCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <BarChart labels={monthlyLabels} values={monthlyCounts} />
            </View>
          </View>

          {/* Next Event */}
          {nextEvent && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Next Event</Text>
              <View style={[styles.nextEventCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={styles.nextEventHeader}>
                  <Text style={styles.nextEventIcon}>{nextEvent.icon}</Text>
                  <View style={styles.nextEventInfo}>
                    <Text style={[styles.nextEventName, { color: theme.colors.text }]}>{nextEvent.name}</Text>
                    <Text style={[styles.nextEventDate, { color: theme.colors.textSecondary }]}>
                      {moment(nextEvent.date).format("MMM D, YYYY [at] h:mm A")}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Ad */}
          <OptimizedBannerAd />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: wp('4%'),
  },
  section: {
    marginBottom: wp('6%'),
  },
  sectionTitle: {
    fontSize: wp('5%'),
    fontWeight: '700',
    marginBottom: wp('3%'),
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '30%',
    padding: wp('3%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: wp('2%'),
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: wp('1%'),
  },
  statTitle: {
    fontSize: wp('3%'),
    marginLeft: wp('1%'),
    fontWeight: '500',
  },
  statValue: {
    fontSize: wp('6%'),
    fontWeight: '700',
  },
  chartCard: {
    padding: wp('4%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
  },
  nextEventCard: {
    padding: wp('4%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
  },
  nextEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextEventIcon: {
    fontSize: wp('8%'),
    marginRight: wp('3%'),
  },
  nextEventInfo: {
    flex: 1,
  },
  nextEventName: {
    fontSize: wp('4.5%'),
    fontWeight: '600',
    marginBottom: wp('1%'),
  },
  nextEventDate: {
    fontSize: wp('3.5%'),
  },
  iconsCard: {
    padding: wp('4%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: wp('2%'),
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  iconEmoji: {
    fontSize: wp('6%'),
  },
  iconCount: {
    fontSize: wp('4%'),
    fontWeight: '600',
  },
});

export default AnalyticsScreen;