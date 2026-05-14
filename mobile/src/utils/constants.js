import { Platform } from 'react-native';

/**
 * Centralized constants for MyPreLove.
 */

export const COLORS = {
  primary: '#064E3B', // Deep Emerald Green from Prototype
  secondary: '#0D9488', // Teal
  success: '#059669',
  warning: '#FBBF24',
  danger: '#EF4444',
  eco: '#ECFDF5',
  ecoText: '#065F46',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  black: '#111827',
};

export const GRADES = {
  A: { label: 'Grade A - Like New', color: '#059669', bg: '#D1FAE5' },
  B: { label: 'Grade B - Lightly Used', color: '#D97706', bg: '#FEF3C7' },
  C: { label: 'Grade C - Well Used', color: '#EA580C', bg: '#FFEDD5' },
  D: { label: 'Grade D - Heavily Used', color: '#DC2626', bg: '#FEE2E2' },
};

const getBaseUrl = () => {
  // Detected Local IP for Expo Go on Physical Device
  const LOCAL_IP = '172.20.10.2'; 

  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to reach the host computer's localhost
    return 'http://10.0.2.2:8000/api/';
  }
  
  // For iOS Simulator, use localhost. For physical iOS devices, use LOCAL_IP.
  return `http://${LOCAL_IP}:8000/api/`;
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
};
