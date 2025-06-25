import React, { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import CalendarGrid from "./components/CalendarGrid";

import { Event, DisplayEvent } from "./types.ts";
import {
  loadEvents,
  getEventsForDateRangeOptimized,
} from "./services/eventService.ts";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const TOAST_CONTAINER_ID = "main-toast";

const App: React.FC = () => {
  const [currentDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [displayedEvents, setDisplayedEvents] = useState<DisplayEvent[]>([]);

  useEffect(() => {
    setEvents(loadEvents());
  }, []);

  useEffect(() => {
    const monthViewStart = startOfWeek(startOfMonth(currentDate), {
      weekStartsOn: 0,
    });
    const monthViewEnd = endOfWeek(endOfMonth(currentDate), {
      weekStartsOn: 0,
    });
    setDisplayedEvents(
      getEventsForDateRangeOptimized(events, monthViewStart, monthViewEnd)
    );
  }, [events, currentDate]);

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
          <h1 className="text-3xl sm:text-4xl font-bold text-center text-gray-800">
            Event Calendar
          </h1>
        </header>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mb-2"></div>
        <main className="flex-grow overflow-hidden">
          <CalendarGrid currentDate={currentDate} events={displayedEvents} />
        </main>
      </div>
    </DndProvider>
  );
};

export default App;
