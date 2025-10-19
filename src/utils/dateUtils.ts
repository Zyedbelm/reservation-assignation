import { formatInTimeZone } from 'date-fns-tz';

/**
 * Format a date as local Swiss date string (YYYY-MM-DD)
 * This ensures consistent date formatting in Europe/Zurich timezone
 * regardless of browser timezone or DST transitions
 */
export const formatLocalDate = (date: Date | string, timezone: string = 'Europe/Zurich'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(dateObj, timezone, 'yyyy-MM-dd');
};

/**
 * Format a date for display in Swiss format
 */
export const formatLocalDisplayDate = (date: Date | string, timezone: string = 'Europe/Zurich'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(dateObj, timezone, 'dd.MM.yyyy');
};

/**
 * Get the current date in Swiss timezone as YYYY-MM-DD string
 */
export const getCurrentSwissDate = (): string => {
  return formatLocalDate(new Date(), 'Europe/Zurich');
};