import React, { useState, useEffect, useCallback } from 'react';
import { Event, EventModalProps, RecurrenceFrequency, RecurrenceRule } from '../types';
import { EVENT_COLORS, RECURRENCE_OPTIONS,  FULL_DAYS_OF_WEEK } from '../constants';
import { format, parseISO, isValid, set, getDay, getDate } from 'date-fns';
import TrashIcon from './icons/TrashIcon';
import XMarkIcon from './icons/XMarkIcon';
import { generateEventId } from '../services/eventService';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const TOAST_CONTAINER_ID = 'main-toast';

const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  eventToEdit, 
  selectedDate,
  allEventsForDay,
  onEventClick,
}) => {
  const getInitialEventState = useCallback(() => {
    const baseDate = selectedDate || new Date();
    const defaultStartTime = set(baseDate, { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });
    const defaultEndTime = set(baseDate, { hours: 10, minutes: 0, seconds: 0, milliseconds: 0 });

    return {
      id: generateEventId(),
      title: '',
      start: format(defaultStartTime, "yyyy-MM-dd'T'HH:mm"),
      end: format(defaultEndTime, "yyyy-MM-dd'T'HH:mm"),
      description: '',
      color: EVENT_COLORS[0].value,
      recurrenceRule: {
        frequency: RecurrenceFrequency.NONE,
        interval: 1,
        byweekday: [getDay(defaultStartTime)],
        bymonthday: getDate(defaultStartTime),
      },
      exceptionDates: [],
      instanceDate: format(defaultStartTime, 'yyyy-MM-dd'),
      isInstance: false, 
    };
  }, [selectedDate]);


  const [event, setEvent] = useState<Omit<Event, 'id' | 'start' | 'end' | 'isInstance' | 'instanceDate'> & { id?: string, start: string, end: string, isInstance?: boolean, instanceDate?: string }>(getInitialEventState());
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  useEffect(() => {
    if (eventToEdit) {
      setEvent({
        ...eventToEdit, 
        start: format(parseISO(eventToEdit.start), "yyyy-MM-dd'T'HH:mm"), 
        end: format(parseISO(eventToEdit.end), "yyyy-MM-dd'T'HH:mm"),     
        recurrenceRule: eventToEdit.recurrenceRule || getInitialEventState().recurrenceRule,
        exceptionDates: eventToEdit.exceptionDates || [],
        isInstance: eventToEdit.isInstance,
        instanceDate: eventToEdit.instanceDate,
      });
    } else {
      setEvent(getInitialEventState());
    }
  }, [eventToEdit, isOpen, getInitialEventState]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEvent(prev => ({ ...prev, [name]: value }));
  };

  const handleRecurrenceChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    let newRecurrenceRule = { ...(event.recurrenceRule || getInitialEventState().recurrenceRule) } as RecurrenceRule;

    if (name === 'frequency') {
      newRecurrenceRule.frequency = value as RecurrenceFrequency;
      if (value === RecurrenceFrequency.NONE) {
         newRecurrenceRule = getInitialEventState().recurrenceRule; 
         newRecurrenceRule.frequency = RecurrenceFrequency.NONE; 
      } else if (value === RecurrenceFrequency.WEEKLY && (!newRecurrenceRule.byweekday || newRecurrenceRule.byweekday.length === 0)) {
        newRecurrenceRule.byweekday = [getDay(parseISO(event.start))]; 
      } else if (value === RecurrenceFrequency.MONTHLY && !newRecurrenceRule.bymonthday) {
        newRecurrenceRule.bymonthday = getDate(parseISO(event.start));
      } else if (value === RecurrenceFrequency.CUSTOM) {
        newRecurrenceRule.customUnit = RecurrenceFrequency.WEEKLY;
        newRecurrenceRule.interval = 1;
      }
    } else if (name === 'interval' || name === 'bymonthday') {
      newRecurrenceRule[name as 'interval' | 'bymonthday'] = parseInt(value, 10);
    } else if (name === 'until') {
      newRecurrenceRule.until = value ? format(parseISO(value), "yyyy-MM-dd") : undefined;
    } else if (name === 'customUnit') {
      newRecurrenceRule.customUnit = value as RecurrenceFrequency;
    }
    
    setEvent(prev => ({ ...prev, recurrenceRule: newRecurrenceRule }));
  };

  const handleWeekdayToggle = (dayIndex: number) => {
    setEvent(prev => {
      const currentRule = prev.recurrenceRule || getInitialEventState().recurrenceRule;
      const byweekday = currentRule.byweekday ? [...currentRule.byweekday] : [];
      const index = byweekday.indexOf(dayIndex);
      if (index > -1) {
        byweekday.splice(index, 1);
      } else {
        byweekday.push(dayIndex);
      }
      return { ...prev, recurrenceRule: { ...currentRule, frequency: currentRule.frequency, byweekday } };
    });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!event.title.trim()) {
      toast.error("Event title is required.", { containerId: TOAST_CONTAINER_ID });
      return;
    }
    const startDate = parseISO(event.start);
    const endDate = parseISO(event.end);

    if (!isValid(startDate) || !isValid(endDate)) {
      toast.error("Invalid date or time format.", { containerId: TOAST_CONTAINER_ID });
      return;
    }

    if (endDate <= startDate) {
      toast.error("End time must be after start time.", { containerId: TOAST_CONTAINER_ID });
      return;
    }
    
    const finalEvent: Event = {
      id: event.id || generateEventId(),
      title: event.title,
      description: event.description,
      color: event.color,
      exceptionDates: event.exceptionDates || [],
      originalSeriesId: event.originalSeriesId,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      recurrenceRule: event.recurrenceRule?.frequency === RecurrenceFrequency.NONE ? undefined : event.recurrenceRule,
      instanceDate: event.instanceDate || format(startDate, 'yyyy-MM-dd'),
      isInstance: event.isInstance,
      category: event.category || '',
    };
    onSave(finalEvent);
    toast.success("Event saved successfully!", { containerId: TOAST_CONTAINER_ID });
    onClose();
  };

  const handleDeleteClick = (deleteType?: 'instance' | 'series') => {
    if (onDelete && eventToEdit?.id) {
        const instanceDateForDelete = eventToEdit.isInstance ? eventToEdit.instanceDate : undefined;
        onDelete(eventToEdit.id, deleteType, instanceDateForDelete);
        toast.success("Event deleted successfully!", { containerId: TOAST_CONTAINER_ID });
        setShowDeleteConfirmation(false);
        onClose();
    }
  };

  if (!isOpen) return null;

  const isRecurringInstance = !!(eventToEdit?.isInstance && eventToEdit?.recurrenceRule && eventToEdit.recurrenceRule.frequency !== RecurrenceFrequency.NONE);


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity duration-300">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">{eventToEdit ? 'Edit Event' : 'Add Event'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Show all events for the day if more than 1 event exists */}
        {allEventsForDay && allEventsForDay.length > 1 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-700">Events for this day</h3>
            <ul className="space-y-1">
              {allEventsForDay.map(ev => (
                <li
                  key={ev.id + ev.start}
                  className="p-2 rounded bg-gray-100 flex flex-col cursor-pointer hover:bg-blue-100"
                  onClick={() => onEventClick && onEventClick(ev)}
                >
                  <span className="font-medium text-gray-800">{ev.title}</span>
                  <span className="text-xs text-gray-500">{format(parseISO(ev.start), 'p')} - {format(parseISO(ev.end), 'p')}</span>
                  {ev.description && <span className="text-xs text-gray-600">{ev.description}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
            <input
              type="text"
              name="title"
              id="title"
              value={event.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., Team Meeting"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start" className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="datetime-local"
                name="start"
                id="start"
                value={event.start}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="end" className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="datetime-local"
                name="end"
                id="end"
                value={event.end}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
            <textarea
              name="description"
              id="description"
              value={event.description || ''}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Add more details..."
            />
          </div>

          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <select
              name="color"
              id="color"
              value={event.color}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              {EVENT_COLORS.map(c => (
                <option key={c.value} value={c.value}>{c.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="category"
              id="category"
              value={event.category || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">No Category</option>
              <option value="Work">Work</option>
              <option value="Personal">Personal</option>
              <option value="Holiday">Holiday</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          {!(eventToEdit && eventToEdit.isInstance && eventToEdit.originalSeriesId !== eventToEdit.id) && (
            <div className="border-t pt-4 mt-4">
                 <h3 className="text-lg font-medium text-gray-900 mb-2">Recurrence</h3>
                 <div>
                    <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-1">Repeats</label>
                    <select
                    name="frequency"
                    id="frequency"
                    value={event.recurrenceRule?.frequency || RecurrenceFrequency.NONE}
                    onChange={handleRecurrenceChange}
                    disabled={isRecurringInstance} 
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${isRecurringInstance ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    >
                    {RECURRENCE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                    </select>
                </div>

                {event.recurrenceRule?.frequency && event.recurrenceRule.frequency !== RecurrenceFrequency.NONE && !isRecurringInstance && (
                    <div className="mt-4 space-y-4">
                    <div>
                        <label htmlFor="interval" className="block text-sm font-medium text-gray-700 mb-1">
                        Repeat every
                        </label>
                        <div className="flex items-center space-x-2">
                        <input
                            type="number"
                            name="interval"
                            id="interval"
                            min="1"
                            value={event.recurrenceRule.interval || 1}
                            onChange={handleRecurrenceChange}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        <span className="text-sm text-gray-600">
                            {event.recurrenceRule.frequency === RecurrenceFrequency.DAILY ? 'day(s)' : ''}
                            {event.recurrenceRule.frequency === RecurrenceFrequency.WEEKLY ? 'week(s)' : ''}
                            {event.recurrenceRule.frequency === RecurrenceFrequency.MONTHLY ? 'month(s)' : ''}
                        </span>
                        </div>
                    </div>

                    {event.recurrenceRule.frequency === RecurrenceFrequency.CUSTOM && (
                        <div className="flex items-center space-x-2">
                            <input
                                type="number"
                                name="interval"
                                id="custom-interval"
                                min="1"
                                value={event.recurrenceRule.interval || 1}
                                onChange={handleRecurrenceChange}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            <select
                                name="customUnit"
                                id="custom-unit"
                                value={event.recurrenceRule.customUnit || RecurrenceFrequency.WEEKLY}
                                onChange={handleRecurrenceChange}
                                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                                <option value={RecurrenceFrequency.DAILY}>day(s)</option>
                                <option value={RecurrenceFrequency.WEEKLY}>week(s)</option>
                                <option value={RecurrenceFrequency.MONTHLY}>month(s)</option>
                            </select>
                        </div>
                    )}

                    {event.recurrenceRule.frequency === RecurrenceFrequency.WEEKLY && (
                        <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Repeat on</label>
                        <div className="flex flex-wrap gap-2">
                            {FULL_DAYS_OF_WEEK.map((dayName, index) => (
                            <button
                                type="button"
                                key={index}
                                onClick={() => handleWeekdayToggle(index)}
                                className={`px-3 py-1.5 border rounded-md text-sm transition-colors
                                ${event.recurrenceRule?.byweekday?.includes(index) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                            >
                                {dayName}
                            </button>
                            ))}
                        </div>
                        </div>
                    )}

                    {event.recurrenceRule.frequency === RecurrenceFrequency.MONTHLY && (
                        <div>
                        <label htmlFor="bymonthday" className="block text-sm font-medium text-gray-700 mb-1">
                            Day of month
                        </label>
                        <input
                            type="number"
                            name="bymonthday"
                            id="bymonthday"
                            min="1"
                            max="31"
                            value={event.recurrenceRule.bymonthday || 1}
                            onChange={handleRecurrenceChange}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        </div>
                    )}
                    
                    <div>
                        <label htmlFor="until" className="block text-sm font-medium text-gray-700 mb-1">Ends (Optional)</label>
                        <input
                        type="date"
                        name="until"
                        id="until"
                        value={event.recurrenceRule.until ? format(parseISO(event.recurrenceRule.until), 'yyyy-MM-dd') : ''}
                        onChange={handleRecurrenceChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>
                    </div>
                )}
            </div>
          )}
          {isRecurringInstance && (
            <div className="border-t pt-4 mt-4 text-sm text-gray-600 bg-yellow-50 p-3 rounded-md">
                This is an instance of a recurring event: "{eventToEdit?.title}". <br/>
                To change recurrence rules (e.g., how often it repeats), you need to edit the original series.
                Saving changes here will modify this specific occurrence. Deleting provides options for this instance or the whole series.
            </div>
          )}


          <div className="flex flex-col sm:flex-row justify-end items-center space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t">
            {eventToEdit && onDelete && (
                 <button
                 type="button"
                 onClick={() => setShowDeleteConfirmation(true)}
                 className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 flex items-center justify-center space-x-2 rounded-md border border-red-300 hover:bg-red-50 transition-colors"
               >
                 <TrashIcon className="h-5 w-5" />
                 <span>Delete</span>
               </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {eventToEdit ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </form>

        {showDeleteConfirmation && eventToEdit && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-[60]">
                <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Confirm Deletion</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Are you sure you want to delete "{eventToEdit.title}"?
                    </p>
                    {isRecurringInstance ? (
                         <div className="space-y-3">
                            <button
                                onClick={() => handleDeleteClick('instance')}
                                className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700"
                            >
                                Delete This Instance Only
                            </button>
                            <button
                                onClick={() => handleDeleteClick('series')}
                                className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md shadow-sm hover:bg-red-50"
                            >
                                Delete Entire Series
                            </button>
                         </div>
                    ) : (
                        <button
                            onClick={() => handleDeleteClick()} 
                            className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700"
                        >
                            Yes, Delete Event
                        </button>
                    )}
                    <button
                        onClick={() => setShowDeleteConfirmation(false)}
                        className="mt-3 w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default EventModal;