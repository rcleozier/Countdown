import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import es from '../locales/es.json';

const LOCALE_STORAGE_KEY = '@app_locale';
const RTL_STORAGE_KEY = '@app_rtl_override';

// Supported locales
export const SUPPORTED_LOCALES = {
  en: { name: 'English', translations: en, rtl: false },
  hi: { name: 'हिंदी', translations: hi, rtl: false },
  es: { name: 'Español', translations: es, rtl: false },
};

// RTL locales (for future support)
const RTL_LOCALES = ['ar', 'he', 'fa', 'ur'];

// Get device locale
const getDeviceLocale = () => {
  try {
    // Use Intl API which is available on both iOS and Android
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const langCode = locale.split('-')[0].toLowerCase();
    
    // Check if we support this locale
    if (SUPPORTED_LOCALES[langCode]) {
      return langCode;
    }
    
    // Fallback to English
    return 'en';
  } catch (error) {
    console.error('Error detecting device locale:', error);
    return 'en';
  }
};

// Check if locale is RTL
const isRTL = (locale) => {
  return RTL_LOCALES.includes(locale) || I18nManager.isRTL;
};

// i18n class
class I18n {
  constructor() {
    this.locale = 'en';
    this.translations = en;
    this.isRTL = false;
    this.isInitialized = false;
  }

  // Initialize i18n
  async init() {
    try {
      // Load saved locale preference
      const savedLocale = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
      const savedRTL = await AsyncStorage.getItem(RTL_STORAGE_KEY);
      
      if (savedLocale && SUPPORTED_LOCALES[savedLocale]) {
        this.setLocale(savedLocale);
      } else {
        // Auto-detect on first launch
        const deviceLocale = getDeviceLocale();
        this.setLocale(deviceLocale);
        // Save detected locale
        await AsyncStorage.setItem(LOCALE_STORAGE_KEY, deviceLocale);
      }
      
      // Handle RTL override (DEV only)
      if (savedRTL === 'true' || savedRTL === 'false') {
        this.setRTL(savedRTL === 'true');
      } else {
        this.setRTL(isRTL(this.locale));
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing i18n:', error);
      this.setLocale('en');
      this.isInitialized = true;
    }
  }

  // Set locale
  setLocale(locale) {
    if (!SUPPORTED_LOCALES[locale]) {
      console.warn(`Locale ${locale} not supported, falling back to en`);
      locale = 'en';
    }
    
    this.locale = locale;
    this.translations = SUPPORTED_LOCALES[locale].translations;
  }

  // Set RTL (for DEV testing)
  setRTL(rtl) {
    this.isRTL = rtl;
    if (I18nManager.forceRTL !== undefined) {
      I18nManager.forceRTL(rtl);
      I18nManager.allowRTL(rtl);
    }
  }

  // Save locale preference
  async saveLocale(locale) {
    try {
      this.setLocale(locale);
      await AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
      // Update RTL based on new locale
      this.setRTL(isRTL(locale));
    } catch (error) {
      console.error('Error saving locale:', error);
    }
  }

  // Save RTL override (DEV only)
  async saveRTL(rtl) {
    try {
      this.setRTL(rtl);
      await AsyncStorage.setItem(RTL_STORAGE_KEY, rtl ? 'true' : 'false');
    } catch (error) {
      console.error('Error saving RTL override:', error);
    }
  }

  // Translate function
  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key "${key}" not found`);
        return key;
      }
    }
    
    if (typeof value !== 'string') {
      console.warn(`Translation value for "${key}" is not a string`);
      return key;
    }
    
    // Simple parameter replacement
    return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
      return params[paramKey] !== undefined ? String(params[paramKey]) : match;
    });
  }

  // Format date
  formatDate(date, options = {}) {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      };
      return new Intl.DateTimeFormat(this.locale, { ...defaultOptions, ...options }).format(dateObj);
    } catch (error) {
      console.error('Error formatting date:', error);
      return date.toString();
    }
  }

  // Format time
  formatTime(date, options = {}) {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      const defaultOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true, // Will respect locale preferences
      };
      return new Intl.DateTimeFormat(this.locale, { ...defaultOptions, ...options }).format(dateObj);
    } catch (error) {
      console.error('Error formatting time:', error);
      return date.toString();
    }
  }

  // Format date and time
  formatDateTime(date, options = {}) {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      };
      return new Intl.DateTimeFormat(this.locale, { ...defaultOptions, ...options }).format(dateObj);
    } catch (error) {
      console.error('Error formatting date/time:', error);
      return date.toString();
    }
  }

  // Format relative time (e.g., "in 2 days", "2 days ago")
  formatRelativeTime(date) {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      const now = new Date();
      const diffMs = dateObj.getTime() - now.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (Math.abs(diffDays) < 1) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (Math.abs(diffHours) < 1) {
          const diffMins = Math.floor(diffMs / (1000 * 60));
          if (diffMins === 0) {
            return this.t('time.now');
          }
          return this.t('time.minutes', { count: Math.abs(diffMins) });
        }
        return this.t('time.hours', { count: Math.abs(diffHours) });
      }
      
      if (diffDays === 0) {
        return this.t('time.today');
      } else if (diffDays === 1) {
        return this.t('time.tomorrow');
      } else if (diffDays === -1) {
        return this.t('time.yesterday');
      } else if (diffDays > 0) {
        return this.t('time.daysFromNow', { count: diffDays });
      } else {
        return this.t('time.daysAgo', { count: Math.abs(diffDays) });
      }
    } catch (error) {
      console.error('Error formatting relative time:', error);
      return date.toString();
    }
  }

  // Format reminder offset (e.g., "1 week before", "2 days before")
  formatReminderOffset(offset, unit) {
    const count = Math.abs(offset);
    const unitKey = unit === 'days' ? 'days' : unit === 'weeks' ? 'weeks' : 'months';
    const beforeKey = `reminders.${unitKey}Before`;
    return this.t(beforeKey, { count });
  }
}

// Export singleton instance
export const i18n = new I18n();

// Export hook for React components
export const useTranslation = () => {
  return {
    t: (key, params) => i18n.t(key, params),
    locale: i18n.locale,
    setLocale: (locale) => i18n.saveLocale(locale),
    formatDate: (date, options) => i18n.formatDate(date, options),
    formatTime: (date, options) => i18n.formatTime(date, options),
    formatDateTime: (date, options) => i18n.formatDateTime(date, options),
    formatRelativeTime: (date) => i18n.formatRelativeTime(date),
    formatReminderOffset: (offset, unit) => i18n.formatReminderOffset(offset, unit),
    isRTL: i18n.isRTL,
  };
};

