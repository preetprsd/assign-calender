import React, { useState, useEffect, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import CalendarGrid from './components/CalendarGrid';
import EventModal from './components/EventModal';
import { Event, DisplayEvent, EventModalProps, RecurrenceFrequency } from './types';
import { loadEvents, saveEvents, generateEventId, getEventsForDateRangeOptimized, checkConflict } from './services/eventService';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isEqual, set } from 'date-fns';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const TOAST_CONTAINER_ID = 'main-toast';

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [displayedEvents, setDisplayedEvents] = useState<DisplayEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [eventToEdit, setEventToEdit] = useState<DisplayEvent | null>(null);
  const [selectedDateForModal, setSelectedDateForModal] = useState<Date | null>(null);
  const [draggedEventState, setDraggedEventState] = useState<DisplayEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showDragConflictModal, setShowDragConflictModal] = useState(false);
  const [pendingDragUpdate, setPendingDragUpdate] = useState<{
    updatedEventsList: Event[];
    eventForConflictCheck: Event;
  } | null>(null);


  useEffect(() => {
    setEvents(loadEvents());
  }, []);

  useEffect(() => {
    const monthViewStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const monthViewEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    setDisplayedEvents(getEventsForDateRangeOptimized(events, monthViewStart, monthViewEnd));
  }, [events, currentDate]);

  // Monitor category filter changes and show toast if no events found
  useEffect(() => {
    if (categoryFilter && categoryFilter !== '') {
      const eventsWithCategory = displayedEvents.filter(event => event.category === categoryFilter);
      if (eventsWithCategory.length === 0) {
        toast.warning(`No events found for category "${categoryFilter}" in the current month.`, {
          containerId: TOAST_CONTAINER_ID,
          autoClose: 4000,
        });
      }
    }
  }, [categoryFilter, displayedEvents]);

  const handleDateChange = useCallback((newDate: Date) => {
    setCurrentDate(newDate);
  },[]);

  const handleDayClick = useCallback((date: Date) => {
    setSelectedDateForModal(date);
    setEventToEdit(null);
    setIsModalOpen(true);
  },[]);

  const handleEventClick = useCallback((event: DisplayEvent) => {
    setEventToEdit(event); 
    setSelectedDateForModal(parseISO(event.start));
    setIsModalOpen(true);
  },[]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setEventToEdit(null);
    setSelectedDateForModal(null);
  },[]);

  const handleSaveEvent = useCallback((eventDataFromModal: Event) => {
    const isEditing = events.some(e => e.id === eventDataFromModal.id);
    let finalEventToSave: Event;
    let updatedEvents: Event[];

    const monthViewStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const monthViewEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });

    if (isEditing) { 
      const originalEventSeries = events.find(e => e.id === eventDataFromModal.id);
      if (!originalEventSeries) return;

      // Check if we are editing an instance of a recurring event
      // eventDataFromModal.isInstance will be true if EventModal passed it correctly
      // eventToEdit also holds the original DisplayEvent context
      if (eventDataFromModal.isInstance && originalEventSeries.recurrenceRule && originalEventSeries.recurrenceRule.frequency !== RecurrenceFrequency.NONE) {
        // This means we are modifying a specific occurrence of a recurring event.
        // It becomes a new standalone event, and an exception is added to the original series.
        finalEventToSave = {
          ...eventDataFromModal, // Contains new start/end, title etc. from modal
          id: generateEventId(), 
          recurrenceRule: undefined, 
          originalSeriesId: originalEventSeries.id, 
          exceptionDates: [], 
          isInstance: false, // It's now a standalone event, not an "instance" in the recurring sense
          // instanceDate is already set by eventDataFromModal from the modal
        };
        
        const originalInstanceOfRecurringEventDate = eventToEdit?.instanceDate; // Date of the instance that was opened in modal
        if (!originalInstanceOfRecurringEventDate) {
            toast.error("Could not determine original instance date for creating exception.", { containerId: TOAST_CONTAINER_ID });
            return; // Or handle error appropriately
        }

        const updatedOriginalSeries = {
          ...originalEventSeries,
          exceptionDates: [...(originalEventSeries.exceptionDates || []), format(parseISO(originalInstanceOfRecurringEventDate), 'yyyy-MM-dd')]
        };
        updatedEvents = events.map(e => e.id === originalEventSeries.id ? updatedOriginalSeries : e);
        updatedEvents.push(finalEventToSave);
      } else {
        // Editing a non-recurring event or the master definition of a recurring series
        finalEventToSave = { ...eventDataFromModal }; 
         if (checkConflict(finalEventToSave, events, monthViewStart, monthViewEnd)) {
            toast.info("This event conflicts with an existing event. Save anyway?", {
              autoClose: false,
              closeOnClick: true,
              onClose: () => {},
              containerId: TOAST_CONTAINER_ID,
            });
            // You can implement a custom modal for confirmation if needed
            return;
        }
        updatedEvents = events.map(e => (e.id === finalEventToSave.id ? finalEventToSave : e));
      }
    } else { // Adding a new event
      finalEventToSave = { ...eventDataFromModal, id: generateEventId() };
       if (checkConflict(finalEventToSave, events, monthViewStart, monthViewEnd)) {
            toast.info("This event conflicts with an existing event. Save anyway?", {
              autoClose: false,
              closeOnClick: true,
              onClose: () => {},
              containerId: TOAST_CONTAINER_ID,
            });
            // You can implement a custom modal for confirmation if needed
            return;
        }
      updatedEvents = [...events, finalEventToSave];
    }
    
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
    handleModalClose();
  }, [events, currentDate, eventToEdit, handleModalClose]);

  const handleDeleteEvent = useCallback((eventId: string, deleteType?: 'instance' | 'series', instanceDateStr?: string) => {
    let updatedEvents = [...events];
    const eventToDelete = events.find(e => e.id === eventId);

    if (!eventToDelete) return;

    if (eventToDelete.recurrenceRule && eventToDelete.recurrenceRule.frequency !== RecurrenceFrequency.NONE && deleteType === 'instance' && instanceDateStr) {
        const masterEvent = events.find(e => e.id === eventId); 
        if (masterEvent) {
            const updatedMasterEvent = {
                ...masterEvent,
                exceptionDates: [...(masterEvent.exceptionDates || []), instanceDateStr]
            };
            updatedEvents = events.map(e => e.id === eventId ? updatedMasterEvent : e);
        }
    } else {
        updatedEvents = events.filter(e => e.id !== eventId);
        if (eventToDelete.recurrenceRule) {
            updatedEvents = updatedEvents.filter(e => e.originalSeriesId !== eventId);
        }
    }
    
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
    handleModalClose();
  }, [events, handleModalClose]);

  const handleEventDrop = useCallback((newDateOnCalendar: Date, droppedEvent?: DisplayEvent) => {
    // Use the dropped event if provided, otherwise fall back to draggedEventState
    const eventToMove = droppedEvent || draggedEventState;
    if (!eventToMove) return;
    
    const originalEventSeries = events.find(e => e.id === eventToMove.id);
    if (!originalEventSeries) {
      console.error("Original event series not found for drag operation", eventToMove.id);
      setDraggedEventState(null);
      return;
    }
    const draggedInstanceStartTime = parseISO(eventToMove.start); 
    const newStartDateTime = set(newDateOnCalendar, {
      hours: draggedInstanceStartTime.getHours(),
      minutes: draggedInstanceStartTime.getMinutes(),
      seconds: draggedInstanceStartTime.getSeconds(),
    });
    const duration = parseISO(eventToMove.end).getTime() - draggedInstanceStartTime.getTime();
    const newEndDateTime = new Date(newStartDateTime.getTime() + duration);
    let updatedEventsList = [...events];
    let eventForConflictCheck: Event;
    if (originalEventSeries.recurrenceRule && originalEventSeries.recurrenceRule.frequency !== RecurrenceFrequency.NONE) {
      const newStandaloneEvent: Event = {
        ...originalEventSeries, 
        id: generateEventId(), 
        start: newStartDateTime.toISOString(),
        end: newEndDateTime.toISOString(),
        recurrenceRule: undefined, 
        exceptionDates: [],
        originalSeriesId: originalEventSeries.id, 
        instanceDate: format(newStartDateTime, 'yyyy-MM-dd'), 
        isInstance: false, 
      };
      eventForConflictCheck = newStandaloneEvent;
      const originalInstanceDateToExcept = eventToMove.instanceDate; 
      const modifiedOriginalSeries = {
        ...originalEventSeries,
        exceptionDates: [...(originalEventSeries.exceptionDates || []), originalInstanceDateToExcept]
      };
      updatedEventsList = updatedEventsList.map(e => e.id === originalEventSeries.id ? modifiedOriginalSeries : e);
      updatedEventsList.push(newStandaloneEvent);
    } else {
      const updatedNonRecurringEvent: Event = {
        ...originalEventSeries,
        start: newStartDateTime.toISOString(),
        end: newEndDateTime.toISOString(),
        instanceDate: format(newStartDateTime, 'yyyy-MM-dd'),
        isInstance: false, // Explicitly false for non-recurring or master event
      };
      eventForConflictCheck = updatedNonRecurringEvent;
      updatedEventsList = updatedEventsList.map(e => e.id === originalEventSeries.id ? updatedNonRecurringEvent : e);
    }
    const monthViewStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const monthViewEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    if (checkConflict(eventForConflictCheck, updatedEventsList.filter(e => e.id !== eventForConflictCheck.id), monthViewStart, monthViewEnd)) {
      setPendingDragUpdate({ updatedEventsList, eventForConflictCheck });
      setShowDragConflictModal(true);
      return;
    }
    setEvents(updatedEventsList);
    saveEvents(updatedEventsList);
    setDraggedEventState(null);
  }, [draggedEventState, events, currentDate]);

  const handleConfirmDragConflict = () => {
    if (pendingDragUpdate) {
      setEvents(pendingDragUpdate.updatedEventsList);
      saveEvents(pendingDragUpdate.updatedEventsList);
      setDraggedEventState(null);
      setPendingDragUpdate(null);
      setShowDragConflictModal(false);
    }
  };

  const handleCancelDragConflict = () => {
    setDraggedEventState(null);
    setPendingDragUpdate(null);
    setShowDragConflictModal(false);
  };

  // Filter events by search and category
  const filteredEvents = displayedEvents.filter(event => {
    const matchesCategory = !categoryFilter || event.category === categoryFilter;
    const matchesSearch = !searchQuery ||
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const modalProps: EventModalProps = {
    isOpen: isModalOpen,
    onClose: handleModalClose,
    onSave: handleSaveEvent,
    onDelete: handleDeleteEvent,
    eventToEdit: eventToEdit,
    selectedDate: selectedDateForModal,
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-screen p-2 sm:p-4 bg-gradient-to-r from-blue-500 to-green-500">
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnFocusLoss
          draggable
          pauseOnHover
          containerId={TOAST_CONTAINER_ID}
        />
        <header className="mb-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-center text-gray-800">Event Calendar</h1>
        </header>
        
        <main className="flex-grow overflow-hidden">
          <CalendarGrid
            currentDate={currentDate}
            events={filteredEvents}
            onDateChange={handleDateChange}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
            onEventDrop={handleEventDrop}
          />
        </main>
        <EventModal {...modalProps} />
        {showDragConflictModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Event Conflict</h3>
              <p className="text-gray-700 mb-4">Dragging this event creates a conflict. Proceed?</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancelDragConflict}
                  className="px-4 py-2 rounded-md border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDragConflict}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Proceed
                </button>
              </div>
            </div>
          </div>
        )}
         <footer className="text-center text-xs text-gray-500 py-4">
         Note: Event data is stored in your browser's local storage.
        </footer>
      </div>
    </DndProvider>
  );
};

export default App;