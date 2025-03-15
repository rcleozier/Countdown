import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, SafeAreaView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CountdownItem from "../components/CountdownItem";
import moment from "moment";
import { useFocusEffect } from "@react-navigation/native";

const PastScreen = () => {
  const [pastEvents, setPastEvents] = useState([]);

  const loadPastEvents = async () => {
    try {
      const stored = await AsyncStorage.getItem("countdowns");
      if (stored) {
        const allEvents = JSON.parse(stored);
        const now = moment();
        const past = allEvents.filter((e) => moment(e.date).isBefore(now));
        past.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
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
    backgroundColor: "#0D1B2A", // Dark blue background for a futuristic look
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  header: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#66FCF1", // Neon accent color
    textAlign: "center",
    marginVertical: 20,
    fontFamily: "monospace",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 10,
    fontFamily: "monospace",
  },
  emptySubText: {
    fontSize: 18,
    color: "#AAA",
    textAlign: "center",
    marginHorizontal: 20,
    fontFamily: "monospace",
  },
  listContainer: {
    paddingBottom: 30,
  },
});

export default PastScreen;
