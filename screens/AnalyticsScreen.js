import React, { useState, useCallback } from "react";
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
import { LineChart, PieChart } from "react-native-chart-kit";

const chartColors = [
  "#66FCF1",
  "#45A29E",
  "#1F2833",
  "#C5C6C7",
  "#F5F5F5",
  "#FFB347",
  "#FF6961",
  "#6A5ACD",
  "#20B2AA",
  "#FFD700",
];

const AnalyticsScreen = () => {
  const [stats, setStats] = useState({ total: 0, upcoming: 0, past: 0 });
  const [lineData, setLineData] = useState({ labels: [], data: [] });
  const [pieData, setPieData] = useState([]);
  const [busyDay, setBusyDay] = useState("");
  const [nextEventDate, setNextEventDate] = useState("");

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
          const events = allEvents.filter((e) =>
            moment(e.date).isSame(day, "day")
          );
          return events.length;
        });
        setLineData({ labels: dayLabels, data: dailyCounts });

        // Pie chart: event type distribution (next 7 days)
        const sevenDaysFromNow = moment().add(6, "days").endOf("day");
        const nextSevenEvents = allEvents.filter(
          (e) =>
            moment(e.date).isSameOrAfter(now, "day") &&
            moment(e.date).isSameOrBefore(sevenDaysFromNow, "day")
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

        // Find busiest day (most events in a day, next 7 days)
        const maxCount = Math.max(...dailyCounts);
        const maxIdx = dailyCounts.indexOf(maxCount);
        setBusyDay(maxCount > 0 ? dayLabels[maxIdx] : "N/A");

        // Next event date
        if (upcoming.length > 0) {
          const sortedUpcoming = [...upcoming].sort(
            (a, b) => new Date(a.date) - new Date(b.date)
          );
          setNextEventDate(
            moment(sortedUpcoming[0].date).format("ddd, D MMM YYYY")
          );
        } else {
          setNextEventDate("N/A");
        }
      } else {
        setStats({ total: 0, upcoming: 0, past: 0 });
        setLineData({ labels: [], data: [] });
        setPieData([]);
        setBusyDay("N/A");
        setNextEventDate("N/A");
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

  const chartWidth = Dimensions.get("window").width - 32;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <Text style={styles.header}>Analytics</Text>
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>Upcoming Events (Next 7 Days)</Text>
            {lineData.labels.length > 0 && (
              <LineChart
                data={{
                  labels: lineData.labels,
                  datasets: [{ data: lineData.data }],
                }}
                width={chartWidth}
                height={220}
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
                style={{ marginVertical: 12, borderRadius: 16 }}
              />
            )}
          </View>
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>
              Event Type Distribution (Next 7 Days)
            </Text>
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
                height={200}
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
          <Text style={styles.sectionLabel}>Summary</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Events</Text>
            <Text style={styles.statValue}>{stats.total}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Upcoming</Text>
            <Text style={styles.statValue}>{stats.upcoming}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Past</Text>
            <Text style={styles.statValue}>{stats.past}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Busiest Day (Next 7)</Text>
            <Text style={styles.statValue}>{busyDay}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Next Event</Text>
            <Text style={styles.statValue}>{nextEventDate}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    paddingBottom: 36,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#3498DB",
    textAlign: "center",
    marginBottom: 24,
    letterSpacing: 1,
  },
  statRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 18,
    color: "#2C3E50",
    fontWeight: "bold",
  },
  statValue: {
    fontSize: 18,
    color: "#3498DB",
    fontWeight: "700",
  },
  chartSection: {
    marginTop: 18,
    marginBottom: 12,
    alignItems: "center",
  },
  chartTitle: {
    fontSize: 18,
    color: "#2C3E50",
    fontWeight: "bold",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: 20,
    color: "#3498DB",
    fontWeight: "bold",
    marginTop: 18,
    marginBottom: 10,
    textAlign: "center",
    letterSpacing: 0.5,
  },
});

export default AnalyticsScreen;
