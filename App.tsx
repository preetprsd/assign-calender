import React, { useState, useEffect, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, set } from 'date-fns';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CalendarGrid from './components/CalendarGrid';
import EventModal from './components/EventModal';
import { Event, DisplayEvent, EventModalProps, RecurrenceFrequency } from './types';
import { loadEvents, saveEvents, getEventsForDateRangeOptimized, checkConflict, generateEventId } from './services/eventService';

const TOAST_CONTAINER_ID = 'app-toast';

const App: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [displayedEvents, setDisplayedEvents] = useState<DisplayEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<DisplayEvent | null>(null);
  const [selectedDateForModal, setSelectedDateForModal] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [draggedEventState, setDraggedEventState] = useState<DisplayEvent | null>(null);
  const [showDragConflictModal, setShowDragConflictModal] = useState(false);
  const [pendingDragUpdate, setPendingDragUpdate] = useState<{ updatedEventsList: Event[], eventForConflictCheck: Event } | null>(null);

  useEffect(() => {
    const savedEvents = loadEvents();
    setEvents(savedEvents);
  }, []);

  useEffect(() => {
    const monthViewStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const monthViewEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    setDisplayedEvents(getEventsForDateRangeOptimized(events, monthViewStart, monthViewEnd));
  }, [events, currentDate]);

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

  useEffect(() => {
    if (searchQuery && searchQuery.trim() !== '') {
      const eventsWithSearch = displayedEvents.filter(event => 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      if (eventsWithSearch.length === 0) {
        toast.info(`No events found matching "${searchQuery}" in the current month.`, {
          containerId: TOAST_CONTAINER_ID,
          autoClose: 4000,
        });
      }
    }
  }, [searchQuery, displayedEvents]);

  const handleDateChange = useCallback((newDate: Date) => {
    setCurrentDate(newDate);
  },[]);

  const handleDayClick = useCallback((date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const clickedDate = new Date(date);
    clickedDate.setHours(0, 0, 0, 0);
    if (clickedDate < today) {
      toast.error("Selected date is in the past, not allowed to add event", { containerId: TOAST_CONTAINER_ID });
      return;
    }
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

     
      if (eventDataFromModal.isInstance && originalEventSeries.recurrenceRule && originalEventSeries.recurrenceRule.frequency !== RecurrenceFrequency.NONE) {
       
        finalEventToSave = {
          ...eventDataFromModal, 
          id: generateEventId(), 
          recurrenceRule: undefined, 
          originalSeriesId: originalEventSeries.id, 
          exceptionDates: [], 
          isInstance: false, 
        };
        
        const originalInstanceOfRecurringEventDate = eventToEdit?.instanceDate; 
        if (!originalInstanceOfRecurringEventDate) {
            toast.error("Could not determine original instance date for creating exception.", { containerId: TOAST_CONTAINER_ID });
            return; 
        }

        const updatedOriginalSeries = {
          ...originalEventSeries,
          exceptionDates: [...(originalEventSeries.exceptionDates || []), format(parseISO(originalInstanceOfRecurringEventDate), 'yyyy-MM-dd')]
        };
        updatedEvents = events.map(e => e.id === originalEventSeries.id ? updatedOriginalSeries : e);
        updatedEvents.push(finalEventToSave);
      } else {
        
        finalEventToSave = { ...eventDataFromModal }; 
         if (checkConflict(finalEventToSave, events, monthViewStart, monthViewEnd)) {
            toast.info("This event conflicts with an existing event.", {
              autoClose: false,
              closeOnClick: true,
              onClose: () => {},
              containerId: TOAST_CONTAINER_ID,
            });
          
            return;
        }
        updatedEvents = events.map(e => (e.id === finalEventToSave.id ? finalEventToSave : e));
      }
    } else { 
      finalEventToSave = { ...eventDataFromModal, id: generateEventId() };
       if (checkConflict(finalEventToSave, events, monthViewStart, monthViewEnd)) {
            toast.info("This event conflicts with an existing event.", {
              autoClose: false,
              closeOnClick: true,
              onClose: () => {},
              containerId: TOAST_CONTAINER_ID,
            });
           
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
        isInstance: false, 
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

 
  const filteredEvents = displayedEvents.filter(event => {
    const matchesCategory = !categoryFilter || event.category === categoryFilter;
    const matchesSearch = !searchQuery ||
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const allEventsForSelectedDay = selectedDateForModal
    ? displayedEvents.filter(event =>
        event.instanceDate &&
        new Date(event.instanceDate).toDateString() === selectedDateForModal.toDateString()
      )
    : [];

  const handleModalEventClick = (event: DisplayEvent) => {
    setEventToEdit(event);
  };

  const modalProps: EventModalProps = {
    isOpen: isModalOpen,
    onClose: handleModalClose,
    onSave: handleSaveEvent,
    onDelete: handleDeleteEvent,
    eventToEdit: eventToEdit,
    selectedDate: selectedDateForModal,
    allEventsForDay: allEventsForSelectedDay,
    onEventClick: handleModalEventClick,
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mb-2">
          <div className="relative w-full sm:w-[300px]">
            <input
              type="text"
              placeholder="Search events or categories..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-red-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm pr-8"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 focus:outline-none"
                aria-label="Clear search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">All Categories</option>
            <option value="Work">Work</option>
            <option value="Personal">Personal</option>
            <option value="Holiday">Holiday</option>
            <option value="Other">Other</option>
          </select>
        </div>
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
         
      </div>
    </DndProvider>
  );
};

export default App;