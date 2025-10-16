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

const AnalyticsScreen = () => {
  const [stats, setStats] = useState({ total: 0, upcoming: 0, past: 0 });
  const [nextEvent, setNextEvent] = useState(null);
  const [topIcons, setTopIcons] = useState([]);
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
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Overview</Text>
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

          {/* Top Icons */}
          {topIcons.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Most Used Icons</Text>
              <View style={[styles.iconsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                {topIcons.map((item, index) => (
                  <View key={index} style={styles.iconRow}>
                    <Text style={styles.iconEmoji}>{item.icon}</Text>
                    <Text style={[styles.iconCount, { color: theme.colors.text }]}>{item.count}</Text>
                  </View>
                ))}
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