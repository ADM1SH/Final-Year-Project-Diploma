/**
 * Centralized constants for MyPreLove.
 * Manage theme colors, grades, and configuration in one place.
 */

export const COLORS = {
  primary: '#3B82F6', // Blue
  success: '#22C55E', // Green
  warning: '#F59E0B', // Orange
  danger: '#EF4444',  // Red
  gray: '#6B7280',
  white: '#FFFFFF',
  black: '#000000',
};

export const GRADES = {
  A: {
    label: 'Grade A - Like New',
    color: COLORS.success,
  },
  B: {
    label: 'Grade B - Lightly Used',
    color: COLORS.primary,
  },
  C: {
    label: 'Grade C - Well Used',
    color: COLORS.warning,
  },
  D: {
    label: 'Grade D - Heavily Used',
    color: COLORS.danger,
  },
};

export const ABI_TIPS = {
  ability: 'Based on the number of successfully completed sales.',
  benevolence: 'Based on the average rating from buyer reviews.',
  integrity: 'Based on ID verification and account standing.',
};

export const API_CONFIG = {
  // 10.0.2.2 is the bridge to localhost from the Android Emulator
  BASE_URL: 'http://10.0.2.2:8000/api/',
};
