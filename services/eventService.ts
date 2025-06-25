import { Event, RecurrenceFrequency,  DisplayEvent } from '../types.ts';
import { LOCAL_STORAGE_EVENTS_KEY } from '../constants.ts';
import { 
  addDays, 
  addMonths, 
  addWeeks, 
  addYears,
  format, 
  isAfter, 
  isBefore, 
  isSameDay, 
  parseISO, 
  getDay,
  getDate,
  isWithinInterval,
  startOfDay,
  endOfDay
} from 'date-fns';

export const loadEvents = (): Event[] => {
  const eventsJson = localStorage.getItem(LOCAL_STORAGE_EVENTS_KEY);
  return eventsJson ? JSON.parse(eventsJson) : [];
};

export const saveEvents = (events: Event[]): void => {
  localStorage.setItem(LOCAL_STORAGE_EVENTS_KEY, JSON.stringify(events));
};

export const generateEventId = (): string => {
  return crypto.randomUUID();
};

const isOccurrenceCancelled = (event: Event, date: Date): boolean => {
  if (!event.exceptionDates) return false;
  const dateString = format(date, 'yyyy-MM-dd');
  return event.exceptionDates.includes(dateString);
};

// Optimized recurrence calculation
export const getEventsForDateRangeOptimized = (events: Event[], viewStartDate: Date, viewEndDate: Date): DisplayEvent[] => {
  const displayEvents: DisplayEvent[] = [];

  events.forEach(event => {
    const originalEventStart = parseISO(event.start);
    const originalEventEnd = parseISO(event.end);
    const duration = originalEventEnd.getTime() - originalEventStart.getTime();

    if (event.recurrenceRule && event.recurrenceRule.frequency !== RecurrenceFrequency.NONE) {
      const { frequency, interval = 1, byweekday, bymonthday, until, customUnit } = event.recurrenceRule;
      const recurrenceEndDate = until ? parseISO(until) : null;

      let currentDate = new Date(originalEventStart); 

      const maxIterationDate = addYears(viewEndDate, 5); 
      let iterations = 0;
      const maxIterations = 1000;

      while (isBefore(currentDate, maxIterationDate) && iterations < maxIterations) {
        iterations++;
        if (recurrenceEndDate && isAfter(currentDate, recurrenceEndDate)) break;
        if (isAfter(currentDate, addMonths(viewEndDate,1)) && isAfter(originalEventStart, viewEndDate)) break;

        if (isAfter(currentDate, originalEventStart) || isSameDay(currentDate, originalEventStart)) {
            let isValidOccurrence = false;
            switch (frequency) {
            case RecurrenceFrequency.DAILY:
                isValidOccurrence = true; 
                break;
            case RecurrenceFrequency.WEEKLY:
                if (byweekday && byweekday.includes(getDay(currentDate))) {
                  isValidOccurrence = true;
                }
                break;
            case RecurrenceFrequency.MONTHLY:
                if (bymonthday && getDate(currentDate) === bymonthday) {
                  isValidOccurrence = true;
                }
                break;
            case RecurrenceFrequency.CUSTOM:
                // For custom, use customUnit and interval
                if (customUnit === RecurrenceFrequency.DAILY) {
                  isValidOccurrence = true;
                } else if (customUnit === RecurrenceFrequency.WEEKLY) {
                  // For weekly custom, treat as weekly on the same weekday as originalEventStart
                  if (getDay(currentDate) === getDay(originalEventStart)) {
                    isValidOccurrence = true;
                  }
                } else if (customUnit === RecurrenceFrequency.MONTHLY) {
                  if (getDate(currentDate) === getDate(originalEventStart)) {
                    isValidOccurrence = true;
                  }
                }
                break;
            }

            if (isValidOccurrence && !isOccurrenceCancelled(event, currentDate)) {
                const instanceSpecificStartDt = new Date(currentDate);
                instanceSpecificStartDt.setHours(originalEventStart.getHours(), originalEventStart.getMinutes(), originalEventStart.getSeconds(), originalEventStart.getMilliseconds());
                const instanceSpecificEndDt = new Date(instanceSpecificStartDt.getTime() + duration);

                if (isWithinInterval(instanceSpecificStartDt, { start: startOfDay(viewStartDate), end: endOfDay(viewEndDate) }) ||
                    isWithinInterval(instanceSpecificEndDt, { start: startOfDay(viewStartDate), end: endOfDay(viewEndDate) }) ||
                    (isBefore(instanceSpecificStartDt, viewStartDate) && isAfter(instanceSpecificEndDt, viewEndDate))
                ) {
                    displayEvents.push({
                        ...event,
                        start: instanceSpecificStartDt.toISOString(),
                        end: instanceSpecificEndDt.toISOString(),
                        isInstance: true,
                        instanceDate: format(currentDate, 'yyyy-MM-dd'),
                    });
                }
            }
        }
        
        let tempDate = new Date(currentDate);
        switch (frequency) {
          case RecurrenceFrequency.DAILY: 
            currentDate = addDays(currentDate, interval); 
            break;
          case RecurrenceFrequency.WEEKLY:
            currentDate = addDays(currentDate, 1);
            break;
          case RecurrenceFrequency.MONTHLY:
            currentDate = addDays(currentDate, 1);
            break;
          case RecurrenceFrequency.CUSTOM:
            if (customUnit === RecurrenceFrequency.DAILY) {
              currentDate = addDays(currentDate, interval);
            } else if (customUnit === RecurrenceFrequency.WEEKLY) {
              currentDate = addWeeks(currentDate, interval);
            } else if (customUnit === RecurrenceFrequency.MONTHLY) {
              currentDate = addMonths(currentDate, interval);
            } else {
              currentDate = addDays(currentDate, 1);
            }
            break;
          default: 
            currentDate = addDays(currentDate, 1); 
        }
        
        if (currentDate.getTime() <= tempDate.getTime()) {
            currentDate = addDays(tempDate, 1);
        }
      }

    } else { // Non-recurring event
      if (
        isWithinInterval(originalEventStart, { start: startOfDay(viewStartDate), end: endOfDay(viewEndDate) }) ||
        isWithinInterval(originalEventEnd, { start: startOfDay(viewStartDate), end: endOfDay(viewEndDate) }) ||
        (isBefore(originalEventStart, viewStartDate) && isAfter(originalEventEnd, viewEndDate))
      ) {
         // For non-recurring events, isInstance is false, instanceDate is its start date.
        displayEvents.push({ 
            ...event, 
            instanceDate: format(originalEventStart, 'yyyy-MM-dd'), 
            isInstance: false 
        });
      }
    }
  });
  
  const uniqueDisplayEvents = Array.from(new Map(displayEvents.map(e => [`${e.id}-${e.start}`, e])).values());
  return uniqueDisplayEvents.sort((a,b) => parseISO(a.start).getTime() - parseISO(b.start).getTime());
};


export const checkConflict = (eventToCheck: Event, existingEvents: Event[], viewStartDate: Date, viewEndDate: Date): boolean => {
  const { start: newStartStr, end: newEndStr, recurrenceRule, id: eventIdToIgnore } = eventToCheck;
  
  const potentialInstancesToCheck: DisplayEvent[] = [];

  if (recurrenceRule && recurrenceRule.frequency !== RecurrenceFrequency.NONE) {
    const instances = getEventsForDateRangeOptimized([eventToCheck], viewStartDate, viewEndDate);
    potentialInstancesToCheck.push(...instances);
  } else {
    potentialInstancesToCheck.push({
        ...eventToCheck,
        start: newStartStr, // ensure it's the string form if coming from eventToCheck
        end: newEndStr,
        instanceDate: eventToCheck.instanceDate || format(parseISO(newStartStr), 'yyyy-MM-dd'), 
        isInstance: !!eventToCheck.isInstance // Default to false if undefined
    });
  }
  
  const allExistingDisplayEvents = getEventsForDateRangeOptimized(
    existingEvents.filter(e => e.id !== eventIdToIgnore), 
    viewStartDate, 
    viewEndDate
  );


  for (const pInstance of potentialInstancesToCheck) {
    const pInstanceStart = parseISO(pInstance.start);
    const pInstanceEnd = parseISO(pInstance.end);

    for (const existingEventInstance of allExistingDisplayEvents) {
      const existingStart = parseISO(existingEventInstance.start);
      const existingEnd = parseISO(existingEventInstance.end);
      
      if (isBefore(pInstanceStart, existingEnd) && isAfter(pInstanceEnd, existingStart)) {
        return true; 
      }
    }
  }
  return false; 
};