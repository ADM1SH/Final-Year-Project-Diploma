import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../utils/constants';

// Define dark color palette
export const DARK_COLORS = {
  primary: '#85F8B2',    // Light mint/forest green for dark mode primary
  secondary: '#FFB49C',  // Light coral
  success: '#81D89D',
  warning: '#FBBF24',
  danger: '#FFB4AB',
  eco: '#132B1E',        // Dark soft mint green background
  ecoText: '#A7F3D0',
  gray: '#8C938B',
  lightGray: '#252926',  // Darker container surface
  white: '#1A1E1B',      // Card surfaces in dark mode
  black: '#E1E3DF',      // On-surface / Off-white text
  background: '#111412', // Very dark forest/charcoal background
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load persisted theme preference on app start
    const loadTheme = async () => {
      try {
        const value = await AsyncStorage.getItem('userTheme');
        if (value === 'dark') {
          setIsDarkMode(true);
        }
      } catch (e) {
        console.error('Failed to load theme preference', e);
      } finally {
        setLoading(false);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    try {
      const nextTheme = !isDarkMode;
      setIsDarkMode(nextTheme);
      await AsyncStorage.setItem('userTheme', nextTheme ? 'dark' : 'light');
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const colors = isDarkMode ? DARK_COLORS : COLORS;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors }}>
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
