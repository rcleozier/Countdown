import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, SafeAreaView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CountdownItem from "../components/CountdownItem";
import moment from "moment";
import { useFocusEffect } from "@react-navigation/native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { Analytics } from '../util/analytics';
import OptimizedBannerAd from '../components/Ads';

const PastScreen = () => {
  const [pastEvents, setPastEvents] = useState([]);

  // Load past events from AsyncStorage
  const loadPastEvents = async () => {
    try {
      const stored = await AsyncStorage.getItem("countdowns");
      if (stored) {
        const allEvents = JSON.parse(stored);
        const now = moment();
        // Filter for events that have already ended
        const past = allEvents.filter((e) => moment(e.date).isBefore(now));
        // Sort descending by date (most recent first)
        past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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

  // UseFocusEffect to reload past events whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadPastEvents();
    }, [])
  );

  useEffect(() => {
    Analytics.initialize();
    Analytics.trackScreenView('Past');
  }, []);

  // Delete function (duplicates HomeScreen's logic)
  const deleteCountdown = async (id) => {
    try {
      // Load the full "countdowns" array from AsyncStorage
      const stored = await AsyncStorage.getItem("countdowns");
      if (stored) {
        let allEvents = JSON.parse(stored);
        // Remove the item by id
        allEvents = allEvents.filter((item) => item.id !== id);
        // Save the updated array back to AsyncStorage
        await AsyncStorage.setItem("countdowns", JSON.stringify(allEvents));
        // Reload pastEvents so UI stays in sync
        loadPastEvents();
        Analytics.trackEvent && Analytics.trackEvent('delete_countdown', { id });
      }
    } catch (error) {
      console.error("Error deleting countdown from past events", error);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <OptimizedBannerAd />
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
              // Pass the delete function to CountdownItem
              <CountdownItem event={item} index={index} onDelete={deleteCountdown} />
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
    backgroundColor: "#F8F9FA",
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
    fontSize: wp("4.5%"),
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: wp("2%"),
    fontFamily: "monospace",
  },
  emptySubText: {
    fontSize: wp("2.5%"),
    color: "#7F8C8D",
    textAlign: "center",
    marginHorizontal: wp("4%"),
    fontFamily: "monospace",
  },
  listContainer: {
    paddingBottom: wp("4%"),
    paddingHorizontal: wp("4%"),
  },
});

export default PastScreen;
