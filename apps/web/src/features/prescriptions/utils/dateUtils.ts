/**
 * Date formatting utilities for prescription components
 */

/**
 * Format date for display in queue tables
 * @param date - Date to format
 * @returns Formatted date string
 */
export const formatQueueDate = (date: Date | string): string => {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format date for detailed review display
 * @param date - Date to format
 * @returns Formatted date string with weekday
 */
export const formatReviewDate = (date: Date | string): string => {
  return new Date(date).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Calculate urgency level based on submission time
 * @param createdAt - Order creation date
 * @returns Urgency information with level and styling
 */
export const calculateUrgency = (createdAt: Date | string) => {
  const hoursOld = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  
  if (hoursOld > 24) {
    return { level: 'high' as const, color: 'bg-red-100 text-red-800' };
  }
  if (hoursOld > 8) {
    return { level: 'medium' as const, color: 'bg-yellow-100 text-yellow-800' };
  }
  return { level: 'low' as const, color: 'bg-green-100 text-green-800' };
};