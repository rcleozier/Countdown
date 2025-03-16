import React, { useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, SafeAreaView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CountdownItem from "../components/CountdownItem";
import moment from "moment";
import { useFocusEffect } from "@react-navigation/native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";

const AnalyticsScreen = () => {
  const [totalEvents, setTotalEvents] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [pastCount, setPastCount] = useState(0);
  const [upcomingPercentage, setUpcomingPercentage] = useState("0%");
  const [monthWithMost, setMonthWithMost] = useState("");
  const [nextEventDate, setNextEventDate] = useState("");
  const [eventsNext7Days, setEventsNext7Days] = useState(0);
  const [eventsThisMonth, setEventsThisMonth] = useState(0);
  const [upcomingDistribution, setUpcomingDistribution] = useState(new Array(12).fill(0));

  const loadEvents = async () => {
    try {
      const stored = await AsyncStorage.getItem("countdowns");
      if (stored) {
        const allEvents = JSON.parse(stored);
        const now = moment();
        const upcoming = allEvents.filter(e => moment(e.date).isAfter(now));
        const past = allEvents.filter(e => moment(e.date).isBefore(now));

        setTotalEvents(allEvents.length);
        setUpcomingCount(upcoming.length);
        setPastCount(past.length);
        const percent =
          allEvents.length > 0
            ? ((upcoming.length / allEvents.length) * 100).toFixed(0) + "%"
            : "0%";
        setUpcomingPercentage(percent);

        // Create rotated month labels starting from current month.
        const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const currentMonth = now.month(); // 0 to 11
        const rotatedLabels = [];
        for (let i = 0; i < 12; i++) {
          rotatedLabels.push(monthLabels[(currentMonth + i) % 12]);
        }

        // Calculate distribution over next 12 months relative to now.
        const distribution = new Array(12).fill(0);
        // Only count events that occur within the next 12 months.
        upcoming.forEach(evt => {
          const eventMoment = moment(evt.date);
          if (eventMoment.isBefore(now.clone().add(12, "months"))) {
            const index = (eventMoment.month() - currentMonth + 12) % 12;
            distribution[index] += 1;
          }
        });
        setUpcomingDistribution(distribution);
        const maxVal = Math.max(...distribution);
        if (maxVal === 0) {
          setMonthWithMost("N/A");
        } else {
          const maxIndex = distribution.indexOf(maxVal);
          setMonthWithMost(rotatedLabels[maxIndex]);
        }

        // Next Event Date (if any)
        if (upcoming.length > 0) {
          const sortedUpcoming = [...upcoming].sort((a, b) => new Date(a.date) - new Date(b.date));
          setNextEventDate(moment(sortedUpcoming[0].date).format("ddd, D MMM YYYY"));
        } else {
          setNextEventDate("");
        }

        // Count upcoming events in next 7 days
        const countNext7Days = upcoming.filter(e => moment(e.date).diff(now, "days", true) <= 7).length;
        setEventsNext7Days(countNext7Days);

        // Count events in current month (based on today's month/year)
        const countThisMonth = upcoming.filter(e => {
          const m = moment(e.date);
          return m.month() === now.month() && m.year() === now.year();
        }).length;
        setEventsThisMonth(countThisMonth);
      } else {
        setTotalEvents(0);
        setUpcomingCount(0);
        setPastCount(0);
        setUpcomingPercentage("0%");
        setMonthWithMost("");
        setNextEventDate("");
        setEventsNext7Days(0);
        setEventsThisMonth(0);
        setUpcomingDistribution(new Array(12).fill(0));
      }
    } catch (error) {
      console.error("Error loading events for analytics", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.header}>Analytics</Text>
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Text style={styles.statTitle}>Total Events</Text>
            <Text style={styles.statValue}>{totalEvents}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.statTitle}>Upcoming</Text>
            <Text style={styles.statValue}>{upcomingCount}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.statTitle}>Past</Text>
            <Text style={styles.statValue}>{pastCount}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.statTitle}>Upcoming %</Text>
            <Text style={styles.statValue}>{upcomingPercentage}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.statTitle}>Busy Month</Text>
            <Text style={styles.statValue}>{monthWithMost || "N/A"}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.statTitle}>Events This Month</Text>
            <Text style={styles.statValue}>{eventsThisMonth}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.statTitle}>Next Event Date</Text>
            <Text style={styles.statValue}>{nextEventDate || "N/A"}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.statTitle}>Events Next 7 Days</Text>
            <Text style={styles.statValue}>{eventsNext7Days}</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0D1B2A",
  },
  container: {
    flex: 1,
    padding: wp("4%"),
  },
  header: {
    fontSize: wp("4.5%"),
    fontWeight: "bold",
    color: "#66FCF1",
    fontFamily: "monospace",
    textAlign: "center",
    marginBottom: wp("4%"),
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItem: {
    width: "48%",
    backgroundColor: "#1B263B",
    borderWidth: 2,
    borderColor: "#66FCF1",
    borderRadius: wp("2%"),
    padding: wp("3%"),
    marginBottom: wp("4%"),
    alignItems: "center",
  },
  statTitle: {
    fontSize: wp("2%"),
    color: "#FFF",
    fontFamily: "monospace",
    marginBottom: wp("1%"),
  },
  statValue: {
    fontSize: wp("2%"),
    fontWeight: "bold",
    color: "#FFF",
    fontFamily: "monospace",
  },
});

export default AnalyticsScreen;
