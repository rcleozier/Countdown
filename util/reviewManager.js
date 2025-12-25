import AsyncStorage from '@react-native-async-storage/async-storage';

const REVIEW_REQUEST_KEY = 'last_review_request';
const MIN_EVENTS_FOR_REVIEW = 3;
const MIN_DAYS_BETWEEN_REVIEWS = 15;

// Safely get StoreReview module (may not be available in dev/Expo Go)
const getStoreReview = () => {
  try {
    // Dynamically require to avoid issues in environments where it's not available
    // eslint-disable-next-line global-require
    return require('expo-store-review');
  } catch (error) {
    console.warn('expo-store-review not available:', error);
    return null;
  }
};

export const ReviewManager = {
  async shouldRequestReview() {
    try {
      const StoreReview = getStoreReview();
      if (!StoreReview) return false;

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

      // Get total events count
      const eventsStr = await AsyncStorage.getItem('countdowns');
      if (!eventsStr) return false;
      
      const events = JSON.parse(eventsStr);
      return events.length >= MIN_EVENTS_FOR_REVIEW;
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      return false;
    }
  },

  async requestReview() {
    try {
      const StoreReview = getStoreReview();
      if (!StoreReview) return false;

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