import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";
import { useFocusEffect } from "@react-navigation/native";
import { LineChart, PieChart, BarChart } from "react-native-chart-kit";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { Analytics } from '../util/analytics';
import { Ionicons } from '@expo/vector-icons';
import OptimizedBannerAd from '../components/Ads';

const chartColors = [
  "#66FCF1", "#45A29E", "#1F2833", "#C5C6C7", "#F5F5F5", "#FFB347", "#FF6961", "#6A5ACD", "#20B2AA", "#FFD700",
];

const AnalyticsScreen = () => {
  const [stats, setStats] = useState({ total: 0, upcoming: 0, past: 0 });
  const [lineData, setLineData] = useState({ labels: [], data: [] });
  const [pieData, setPieData] = useState([]);
  const [barData, setBarData] = useState({ labels: [], data: [] });
  const [donutData, setDonutData] = useState([]);
  const [topTypes, setTopTypes] = useState([]);
  const [busyDay, setBusyDay] = useState("");
  const [nextEventDate, setNextEventDate] = useState("");
  const [notesStats, setNotesStats] = useState({ total: 0, avgLength: 0, bar: { labels: [], data: [] } });

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

        // Line chart: next 7 days (by event count)
        const days = [];
        const dayLabels = [];
        for (let i = 0; i < 7; i++) {
          const day = moment().add(i, "days").startOf("day");
          days.push(day);
          dayLabels.push(day.format("MM/DD"));
        }
        const dailyCounts = days.map((day) => {
          const events = allEvents.filter((e) => moment(e.date).isSame(day, "day"));
          return events.length;
        });
        setLineData({ labels: dayLabels, data: dailyCounts });

        // Pie chart: event type distribution (next 7 days)
        const sevenDaysFromNow = moment().add(6, "days").endOf("day");
        const nextSevenEvents = allEvents.filter(
          (e) => moment(e.date).isSameOrAfter(now, "day") && moment(e.date).isSameOrBefore(sevenDaysFromNow, "day")
        );
        const typeCounts = {};
        nextSevenEvents.forEach((e) => {
          const key = e.icon || "Other";
          typeCounts[key] = (typeCounts[key] || 0) + 1;
        });
        const pie = Object.keys(typeCounts).map((label, idx) => ({
          name: label,
          count: typeCounts[label],
          color: chartColors[idx % chartColors.length],
          legendFontColor: "#2C3E50",
          legendFontSize: 16,
        }));
        setPieData(pie);

        // Bar chart: events per month (last 6 months)
        const months = [];
        const monthLabels = [];
        for (let i = 5; i >= 0; i--) {
          const m = moment().subtract(i, "months");
          months.push(m);
          monthLabels.push(m.format("MMM YY"));
        }
        const monthlyCounts = months.map((m) => {
          const events = allEvents.filter((e) => moment(e.date).isSame(m, "month"));
          return events.length;
        });
        setBarData({ labels: monthLabels, data: monthlyCounts });

        // Donut chart: upcoming vs past
        setDonutData([
          { name: "Upcoming", population: upcoming.length, color: "#3498DB", legendFontColor: "#2C3E50", legendFontSize: 16 },
          { name: "Past", population: past.length, color: "#E74C3C", legendFontColor: "#2C3E50", legendFontSize: 16 },
        ]);

        // Top event types (all time)
        const allTypeCounts = {};
        allEvents.forEach((e) => {
          const key = e.icon || "Other";
          allTypeCounts[key] = (allTypeCounts[key] || 0) + 1;
        });
        const sortedTypes = Object.entries(allTypeCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([icon, count]) => ({ icon, count }));
        setTopTypes(sortedTypes);

        // Find busiest day (most events in a day, next 7 days)
        const maxCount = Math.max(...dailyCounts);
        const maxIdx = dailyCounts.indexOf(maxCount);
        setBusyDay(maxCount > 0 ? dayLabels[maxIdx] : "N/A");

        // Next event date
        if (upcoming.length > 0) {
          const sortedUpcoming = [...upcoming].sort((a, b) => new Date(a.date) - new Date(b.date));
          setNextEventDate(moment(sortedUpcoming[0].date).format("ddd, D MMM YYYY at hh:mm A"));
        } else {
          setNextEventDate("N/A");
        }

        // --- Notes stats ---
        const notesRaw = await AsyncStorage.getItem('notes');
        let notes = [];
        if (notesRaw) notes = JSON.parse(notesRaw);
        const totalNotes = notes.length;
        const avgLength = totalNotes > 0 ? Math.round(notes.reduce((sum, n) => sum + n.text.length, 0) / totalNotes) : 0;
        // Notes per month (last 6 months)
        const notesMonths = [];
        const notesMonthLabels = [];
        for (let i = 5; i >= 0; i--) {
          const m = moment().subtract(i, "months");
          notesMonths.push(m);
          notesMonthLabels.push(m.format("MMM YY"));
        }
        const notesMonthlyCounts = notesMonths.map((m) => notes.filter((n) => moment(n.date).isSame(m, "month")).length);
        setNotesStats({ total: totalNotes, avgLength, bar: { labels: notesMonthLabels, data: notesMonthlyCounts } });
      } else {
        setStats({ total: 0, upcoming: 0, past: 0 });
        setLineData({ labels: [], data: [] });
        setPieData([]);
        setBarData({ labels: [], data: [] });
        setDonutData([]);
        setTopTypes([]);
        setBusyDay("N/A");
        setNextEventDate("N/A");
        setNotesStats({ total: 0, avgLength: 0, bar: { labels: [], data: [] } });
      }
    } catch (error) {
      console.error("Error loading analytics", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, [])
  );

  useEffect(() => {
    Analytics.initialize();
    Analytics.trackScreenView('Analytics');
  }, []);

  const CARD_HORIZONTAL_PADDING = wp('8%');
  const chartWidth = Dimensions.get('window').width - 2 * CARD_HORIZONTAL_PADDING;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.chartTitle}>Upcoming Events (Next 7 Days)</Text>
            {lineData.labels.length > 0 && (
              <LineChart
                data={{
                  labels: lineData.labels,
                  datasets: [{ data: lineData.data }],
                }}
                width={chartWidth}
                height={180}
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: "#F8F9FA",
                  backgroundGradientFrom: "#F8F9FA",
                  backgroundGradientTo: "#F8F9FA",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: {
                    r: "5",
                    strokeWidth: "2",
                    stroke: "#3498DB",
                  },
                  propsForBackgroundLines: {
                    stroke: "#E0E0E0",
                  },
                }}
                bezier
                style={{ marginVertical: 12, borderRadius: 16, width: '100%' }}
              />
            )}
          </View>
          <View style={styles.card}>
            <Text style={styles.chartTitle}>Event Type Distribution (Next 7 Days)</Text>
            {pieData.length > 0 && (
              <PieChart
                data={pieData.map((d) => ({
                  name: d.name,
                  population: d.count,
                  color: d.color,
                  legendFontColor: d.legendFontColor,
                  legendFontSize: d.legendFontSize,
                }))}
                width={chartWidth}
                height={180}
                chartConfig={{
                  color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            )}
          </View>
          <View style={styles.card}>
            <Text style={styles.chartTitle}>Events Per Month (Last 6 Months)</Text>
            {barData.labels.length > 0 && (
              <BarChart
                data={{
                  labels: barData.labels,
                  datasets: [{ data: barData.data }],
                }}
                width={chartWidth}
                height={180}
                yAxisLabel=""
                chartConfig={{
                  backgroundColor: "#F8F9FA",
                  backgroundGradientFrom: "#F8F9FA",
                  backgroundGradientTo: "#F8F9FA",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForBackgroundLines: {
                    stroke: "#E0E0E0",
                  },
                }}
                style={{ marginVertical: 12, borderRadius: 16, width: '100%' }}
              />
            )}
          </View>
          <View style={styles.card}>
            <Text style={styles.chartTitle}>Upcoming vs Past Events</Text>
            {donutData.length > 0 && (
              <PieChart
                data={donutData}
                width={chartWidth}
                height={180}
                chartConfig={{
                  color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
                hasLegend={true}
              />
            )}
          </View>
          <View style={styles.card}>
            <Text style={styles.chartTitle}>Top Event Types</Text>
            {topTypes.length > 0 ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 }}>
                {topTypes.map((t, idx) => (
                  <View key={t.icon} style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 32 }}>{t.icon}</Text>
                    <Text style={{ color: '#2C3E50', fontFamily: 'monospace', fontSize: 16 }}>{t.count}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ color: '#7F8C8D', textAlign: 'center' }}>No data</Text>
            )}
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.sectionLabel}>Summary</Text>
            <View style={styles.statRow}><Text style={styles.statLabel}>Total Events</Text><Text style={styles.statValue}>{stats.total}</Text></View>
            <View style={styles.statRow}><Text style={styles.statLabel}>Upcoming</Text><Text style={styles.statValue}>{stats.upcoming}</Text></View>
            <View style={styles.statRow}><Text style={styles.statLabel}>Past</Text><Text style={styles.statValue}>{stats.past}</Text></View>
            <View style={styles.statRow}><Text style={styles.statLabel}>Busiest Day (Next 7)</Text><Text style={styles.statValue}>{busyDay}</Text></View>
            <View style={styles.statRow}><Text style={styles.statLabel}>Next Event</Text><Text style={styles.statValue}>{nextEventDate}</Text></View>
          </View>
          <View style={styles.card}>
            <Text style={styles.chartTitle}>Notes Overview</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: wp('2%') }}>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Ionicons name="document-text-outline" size={32} color="#3498DB" />
                <Text style={{ color: '#2C3E50', fontFamily: 'monospace', fontSize: 16, marginTop: 4 }}>Total Notes</Text>
                <Text style={{ color: '#3498DB', fontWeight: 'bold', fontSize: 20 }}>{notesStats.total}</Text>
              </View>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Ionicons name="stats-chart-outline" size={32} color="#45A29E" />
                <Text style={{ color: '#2C3E50', fontFamily: 'monospace', fontSize: 16, marginTop: 4 }}>Avg. Length</Text>
                <Text style={{ color: '#3498DB', fontWeight: 'bold', fontSize: 20 }}>{notesStats.avgLength}</Text>
              </View>
            </View>
            <Text style={[styles.chartTitle, { marginTop: wp('2%') }]}>Notes Per Month (Last 6 Months)</Text>
            {notesStats.bar.labels.length > 0 && (
              <BarChart
                data={{ labels: notesStats.bar.labels, datasets: [{ data: notesStats.bar.data }] }}
                width={chartWidth}
                height={180}
                yAxisLabel=""
                chartConfig={{
                  backgroundColor: "#F8F9FA",
                  backgroundGradientFrom: "#F8F9FA",
                  backgroundGradientTo: "#F8F9FA",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForBackgroundLines: { stroke: "#E0E0E0" },
                }}
                style={{ marginVertical: 12, borderRadius: 16, width: '100%' }}
              />
            )}
          </View>
          <OptimizedBannerAd />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F9FA" },
  scrollContent: { paddingBottom: 36, paddingTop: wp('8%') },

  container: { flex: 1, padding: wp('4%') },
  card: {
    backgroundColor: '#FFF',
    borderRadius: wp('3%'),
    padding: wp('4%'),
    marginBottom: wp('3%'),
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: wp('2%'),
    elevation: 2,
    overflow: 'hidden',
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: wp('3%'),
    padding: wp('4%'),
    marginBottom: wp('3%'),
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: wp('2%'),
    elevation: 2,
  },
  chartTitle: {
    fontSize: wp('4%'),
    color: '#2C3E50',
    fontWeight: 'bold',
    marginBottom: wp('2%'),
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
  sectionLabel: {
    fontSize: wp('4%'),
    color: '#3498DB',
    fontWeight: 'bold',
    marginTop: wp('2%'),
    marginBottom: wp('2%'),
    textAlign: 'center',
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
  statRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: wp('2%'),
    padding: wp('2%'),
    marginBottom: wp('2%'),
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: wp('3%'),
    color: '#2C3E50',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  statValue: {
    fontSize: wp('3%'),
    color: '#3498DB',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});

export default AnalyticsScreen;
