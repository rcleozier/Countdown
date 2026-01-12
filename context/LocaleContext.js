import React, { createContext, useContext, useState, useEffect } from 'react';
import { i18n } from '../util/i18n';

const LocaleContext = createContext();

export const LocaleProvider = ({ children }) => {
  const [locale, setLocaleState] = useState(i18n.locale);
  const [isRTL, setRTLState] = useState(i18n.isRTL);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize i18n on mount
    i18n.init().then(() => {
      setLocaleState(i18n.locale);
      setRTLState(i18n.isRTL);
      setIsInitialized(true);
    });
  }, []);

  const setLocale = async (newLocale) => {
    await i18n.saveLocale(newLocale);
    setLocaleState(i18n.locale);
    setRTLState(i18n.isRTL);
  };

  const setRTL = async (rtl) => {
    await i18n.saveRTL(rtl);
    setRTLState(i18n.isRTL);
  };

  const value = {
    locale,
    setLocale,
    isRTL,
    setRTL,
    isInitialized,
    t: (key, params) => i18n.t(key, params),
    formatDate: (date, options) => i18n.formatDate(date, options),
    formatTime: (date, options) => i18n.formatTime(date, options),
    formatDateTime: (date, options) => i18n.formatDateTime(date, options),
    formatRelativeTime: (date) => i18n.formatRelativeTime(date),
    formatReminderOffset: (offset, unit) => i18n.formatReminderOffset(offset, unit),
  };

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};



