export enum RecurrenceFrequency {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM',
}

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // e.g., 1 for every day/week/month, 2 for every 2 days/weeks/months
  byweekday?: number[]; // 0 (Sun) to 6 (Sat), for WEEKLY
  bymonthday?: number; // 1 to 31, for MONTHLY on a specific day
  until?: string; // ISO date string for when recurrence ends
  customUnit?: RecurrenceFrequency; // For custom recurrence, specifies the unit (DAILY, WEEKLY, MONTHLY)
}

export interface Event {
  id: string;
  title: string;
  start: string; // ISO datetime string
  end: string;   // ISO datetime string
  description?: string;
  color: string; // Tailwind bg color class e.g. 'bg-blue-500'
  recurrenceRule?: RecurrenceRule;
  exceptionDates?: string[]; // ISO date strings of occurrences that are cancelled for this recurring event.
  originalSeriesId?: string; 
  instanceDate?: string; // ISO date string (just date part) - For all events, represents the primary date context or instance date
  isInstance?: boolean; // True if this is an instance of a recurring series (even if modified to be standalone)
  category?: string; // Optional category for filtering
}

// Props for the EventModal component
export interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Event) => void;
  onDelete?: (eventId: string, deleteType?: 'instance' | 'series', instanceDate?: string) => void;
  eventToEdit?: DisplayEvent | null; 
  selectedDate: Date | null; 
}

// Type for an event that has been processed for display, especially recurring instances
export interface DisplayEvent extends Event {
  isInstance: boolean; // True if this is an instance of a recurring event (non-optional for DisplayEvent)
  instanceDate: string; // The specific date of this instance (YYYY-MM-DD) (non-optional for DisplayEvent)
  category?: string; // Optional category for filtering
}