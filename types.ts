export enum RecurrenceFrequency {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM',
}

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  byweekday?: number[];
  bymonthday?: number;
  until?: string;
  customUnit?: RecurrenceFrequency;
}

export interface Event {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  color: string;
  recurrenceRule?: RecurrenceRule;
  exceptionDates?: string[];
  originalSeriesId?: string; 
  instanceDate?: string;
  isInstance?: boolean;
  category?: string;
}

export interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Event) => void;
  onDelete?: (eventId: string, deleteType?: 'instance' | 'series', instanceDate?: string) => void;
  eventToEdit?: DisplayEvent | null; 
  selectedDate: Date | null; 
  allEventsForDay?: DisplayEvent[];
  onEventClick?: (event: DisplayEvent) => void;
}

export interface DisplayEvent extends Event {
  isInstance: boolean;
  instanceDate: string;
  category?: string;
}