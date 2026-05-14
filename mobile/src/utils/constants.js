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
  // Your computer's current Network IP (found via ifconfig)
  const MACHINE_IP = '10.122.159.181'; 

  // For both iOS and Android physical devices (Expo Go), use the MACHINE_IP.
  // The Android Emulator (10.0.2.2) also works with the MACHINE_IP as long as Django is running on 0.0.0.0.
  const url = `http://${MACHINE_IP}:8000/api/`;
  console.log('🔗 API TARGET:', url);
  return url;
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
};
