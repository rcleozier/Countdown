import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

const THEME_STORAGE_KEY = '@app_theme';

// Light theme (current theme)
export const lightTheme = {
  name: 'light',
  colors: {
    // Background colors
    background: '#F8F9FA',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    
    // Text colors
    primary: '#3498DB',
    secondary: '#2C3E50',
    text: '#2C3E50',
    textSecondary: '#7F8C8D',
    textLight: '#95A5A6',
    
    // UI colors
    border: '#E0E0E0',
    shadow: '#000000',
    success: '#27AE60',
    warning: '#F39C12',
    error: '#E74C3C',
    
    // Interactive colors
    button: '#3498DB',
    buttonText: '#FFFFFF',
    buttonSecondary: '#F4F8FB',
    buttonSecondaryText: '#3498DB',
    
    // Tab bar
    tabBar: '#FFFFFF',
    tabBarBorder: '#E0E0E0',
    tabActive: '#333333',
    tabInactive: 'gray',
    
    // Modal
    modalOverlay: 'rgba(255,255,255,0.9)',
    modalBackground: '#FFFFFF',
    
    // Progress bar
    progressBackground: '#E0E0E0',
    progressFill: '#3498DB',
    
    // Ad container
    adContainer: '#f8f9fa',
  }
};

// Dark theme
export const darkTheme = {
  name: 'dark',
  colors: {
    // Background colors
    background: '#1A1A1A',
    surface: '#2D2D2D',
    card: '#2D2D2D',
    
    // Text colors
    primary: '#4A9EFF',
    secondary: '#E8E8E8',
    text: '#E8E8E8',
    textSecondary: '#B0B0B0',
    textLight: '#808080',
    
    // UI colors
    border: '#404040',
    shadow: '#000000',
    success: '#2ECC71',
    warning: '#F39C12',
    error: '#E74C3C',
    
    // Interactive colors
    button: '#4A9EFF',
    buttonText: '#FFFFFF',
    buttonSecondary: '#404040',
    buttonSecondaryText: '#4A9EFF',
    
    // Tab bar
    tabBar: '#2D2D2D',
    tabBarBorder: '#404040',
    tabActive: '#4A9EFF',
    tabInactive: '#808080',
    
    // Modal
    modalOverlay: 'rgba(0,0,0,0.8)',
    modalBackground: '#2D2D2D',
    
    // Progress bar
    progressBackground: '#404040',
    progressFill: '#4A9EFF',
    
    // Ad container
    adContainer: '#2D2D2D',
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(lightTheme);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from storage on app start
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        const themeName = JSON.parse(savedTheme);
        setTheme(themeName === 'dark' ? darkTheme : lightTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = theme.name === 'light' ? darkTheme : lightTheme;
      setTheme(newTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(newTheme.name));
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const value = {
    theme,
    isDark: theme.name === 'dark',
    toggleTheme,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
