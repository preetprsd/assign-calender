import { RecurrenceFrequency } from './types';

export const EVENT_COLORS = [
  { name: 'Blue', value: 'bg-blue-500', text: 'text-blue-50' },
  { name: 'Green', value: 'bg-green-500', text: 'text-green-50' },
  { name: 'Red', value: 'bg-red-500', text: 'text-red-50' },
  { name: 'Yellow', value: 'bg-yellow-500', text: 'text-yellow-800' },
  { name: 'Purple', value: 'bg-purple-500', text: 'text-purple-50' },
  { name: 'Pink', value: 'bg-pink-500', text: 'text-pink-50' },
  { name: 'Indigo', value: 'bg-indigo-500', text: 'text-indigo-50' },
  { name: 'Teal', value: 'bg-teal-500', text: 'text-teal-50' },
];

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const FULL_DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];


export const RECURRENCE_OPTIONS = [
  { value: RecurrenceFrequency.NONE, label: 'Does not repeat' },
  { value: RecurrenceFrequency.DAILY, label: 'Daily' },
  { value: RecurrenceFrequency.WEEKLY, label: 'Weekly' },
  { value: RecurrenceFrequency.MONTHLY, label: 'Monthly' },
  { value: RecurrenceFrequency.CUSTOM, label: 'Custom' },
];

export const LOCAL_STORAGE_EVENTS_KEY = 'calendarEvents';
