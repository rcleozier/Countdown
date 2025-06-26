import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REVIEW_REQUEST_KEY = 'last_review_request';
const MIN_DRINKS_FOR_REVIEW = 5;
const MIN_DAYS_BETWEEN_REVIEWS = 30;

export const ReviewManager = {
  async shouldRequestReview() {
    try {
      // Check if the app is available for review
      const isAvailable = await StoreReview.isAvailableAsync();
      if (!isAvailable) return false;

      // Get the last review request date
      const lastRequestStr = await AsyncStorage.getItem(REVIEW_REQUEST_KEY);
      if (lastRequestStr) {
        const lastRequest = new Date(lastRequestStr);
        const daysSinceLastRequest = (new Date() - lastRequest) / (1000 * 60 * 60 * 24);
        if (daysSinceLastRequest < MIN_DAYS_BETWEEN_REVIEWS) return false;
      }

      // Get total drinks count
      const drinksStr = await AsyncStorage.getItem('drinks');
      if (!drinksStr) return false;
      
      const drinks = JSON.parse(drinksStr);
      return drinks.length >= MIN_DRINKS_FOR_REVIEW;
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      return false;
    }
  },

  async requestReview() {
    try {
      const shouldRequest = await this.shouldRequestReview();
      if (shouldRequest) {
        await StoreReview.requestReview();
        await AsyncStorage.setItem(REVIEW_REQUEST_KEY, new Date().toISOString());
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error requesting review:', error);
      return false;
    }
  }
}; 