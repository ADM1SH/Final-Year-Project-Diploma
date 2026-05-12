import { GRADES, ABI_TIPS, COLORS } from './constants';

/**
 * UI Utility Helpers for MyPreLove
 * Optimized for performance and maintainability.
 */

// Pre-create the formatter to avoid expensive re-creation on every call
const currencyFormatter = new Intl.NumberFormat('en-MY', {
  style: 'currency',
  currency: 'MYR',
  currencyDisplay: 'symbol',
});

/**
 * Format a number as Malaysian Ringgit (RM).
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return 'RM 0.00';
  // Use the pre-created formatter and replace MYR with RM
  return currencyFormatter.format(amount).replace('MYR', 'RM');
};

/**
 * Map A-D Grades to specific colors.
 */
export const getGradeColor = (grade) => {
  return GRADES[grade]?.color || COLORS.gray;
};

/**
 * Map A-D Grades to their descriptive labels.
 */
export const getGradeLabel = (grade) => {
  return GRADES[grade]?.label || 'Unknown Grade';
};

/**
 * Format a date string into a human-readable format.
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Map ABI components to helpful labels.
 */
export const getABITooltip = (type) => {
  return ABI_TIPS[type] || '';
};
