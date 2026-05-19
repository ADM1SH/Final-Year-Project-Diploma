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
  // 🚀 PRESENTATION TIP: If using Ngrok, paste your URL here:
  // e.g. const NGROK_URL = 'https://abc-123.ngrok-free.app';
  const NGROK_URL = 'https://unvillainous-shila-hardheadedly.ngrok-free.dev'; 

  if (NGROK_URL) {
    const url = `${NGROK_URL}/api/`;
    console.log('🌐 TUNNEL TARGET:', url);
    return url;
  }

  // Fallback to local network IP (requires phone and PC on same Wi-Fi)
  const MACHINE_IP = '10.122.236.226'; 
  const url = `http://${MACHINE_IP}:8000/api/`;
  console.log('🏠 LOCAL TARGET:', url);
  return url;
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
};
