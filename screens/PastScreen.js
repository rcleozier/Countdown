import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, SafeAreaView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CountdownItem from "../components/CountdownItem";
import moment from "moment";
import { useFocusEffect } from "@react-navigation/native";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

const PastScreen = () => {
  const [pastEvents, setPastEvents] = useState([]);

  const loadPastEvents = async () => {
    try {
      const stored = await AsyncStorage.getItem("countdowns");
      if (stored) {
        const allEvents = JSON.parse(stored);
        const now = moment();
        // Filter for past events
        const past = allEvents.filter((e) => moment(e.date).isBefore(now));
        // Sort descending (most recent first)
        past.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        // Take the first 50
        const lastFifty = past.slice(0, 50);
        setPastEvents(lastFifty);
      } else {
        setPastEvents([]);
      }
    } catch (error) {
      console.error("Error loading past events", error);
    }
  };

  // Reload past events every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadPastEvents();
    }, [])
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {pastEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No Past Events</Text>
            <Text style={styles.emptySubText}>
              Events that have already ended will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={pastEvents}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <CountdownItem event={item} index={index} />
            )}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D1B2A",
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: wp("4%"),
    paddingBottom: wp("4%"),
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: wp("4.5%"), // ~50% smaller than before
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: wp("2%"),
    fontFamily: "monospace",
  },
  emptySubText: {
    fontSize: wp("2.5%"), // ~50% smaller than before
    color: "#AAA",
    textAlign: "center",
    marginHorizontal: wp("4%"),
    fontFamily: "monospace",
  },
  listContainer: {
    paddingBottom: wp("4%"),
  },
});

export default PastScreen;
