import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, SafeAreaView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CountdownItem from "../components/CountdownItem";
import moment from "moment";
import { useFocusEffect } from "@react-navigation/native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { Analytics } from '../util/analytics';
import OptimizedBannerAd from '../components/Ads';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../context/ThemeContext';

const PastScreen = () => {
  const [pastEvents, setPastEvents] = useState([]);
  const { theme } = useTheme();

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

  // Edit function
  const editCountdown = async (updatedEvent) => {
    try {
      // Load the full "countdowns" array from AsyncStorage
      const stored = await AsyncStorage.getItem("countdowns");
      if (stored) {
        let allEvents = JSON.parse(stored);
        
        // Cancel old notification if it exists
        const existingEvent = allEvents.find(item => item.id === updatedEvent.id);
        if (existingEvent && existingEvent.notificationId) {
          await Notifications.cancelScheduledNotificationAsync(existingEvent.notificationId).catch(() => {});
        }

        // Schedule new notification if the event is now in the future
        let notificationId = null;
        if (new Date(updatedEvent.date) > new Date()) {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status === 'granted') {
            notificationId = await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Countdown Reminder',
                body: `"${updatedEvent.name}" is happening now!`,
                sound: true,
              },
              trigger: { date: new Date(updatedEvent.date) },
            });
          }
        }

        // Update the event
        const finalUpdatedEvent = {
          ...updatedEvent,
          notificationId,
        };

        allEvents = allEvents.map(item => 
          item.id === updatedEvent.id ? finalUpdatedEvent : item
        );
        
        // Save the updated array back to AsyncStorage
        await AsyncStorage.setItem("countdowns", JSON.stringify(allEvents));
        // Reload pastEvents so UI stays in sync
        loadPastEvents();
        Analytics.trackEvent && Analytics.trackEvent('edit_countdown', {
          id: updatedEvent.id,
          name: updatedEvent.name,
          date: updatedEvent.date,
          icon: updatedEvent.icon,
        });
      }
    } catch (error) {
      console.error("Error editing countdown from past events", error);
    }
  };

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

  // Prepare data with ad every 5 items
  let listData = [];
  if (pastEvents.length > 0) {
    pastEvents.forEach((event, idx) => {
      listData.push({ ...event, type: 'event', key: event.id });
      if ((idx + 1) % 5 === 0) {
        listData.push({ type: 'ad', key: `ad-${idx}` });
      }
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        {pastEvents.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.emptyText, { color: theme.colors.text }]}>No Past Events</Text>
            <Text style={[styles.emptySubText, { color: theme.colors.textSecondary }]}>
              Events that have already ended will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(item) => item.key}
            renderItem={({ item, index }) => {
              if (item.type === 'ad') {
                return <OptimizedBannerAd />;
              }
              // Pass the delete and edit functions to CountdownItem
              return <CountdownItem event={item} index={index} onDelete={deleteCountdown} onEdit={editCountdown} />;
            }}
            contentContainerStyle={[styles.listContainer, { backgroundColor: theme.colors.background }]}
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
    paddingTop: wp("8%"),
  },

});

export default PastScreen;
