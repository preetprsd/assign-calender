import React from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import DayCell from "./DayCell.tsx";
import { DisplayEvent } from "../types.ts";
import { DAYS_OF_WEEK } from "../constants.ts";

interface CalendarGridProps {
  currentDate: Date;
  events: DisplayEvent[];
}

const CalendarGrid: React.FC<CalendarGridProps> = ({ currentDate, events }) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="bg-gradient-to-r from-cyan-500 to-indigo-500 shadow-xl rounded-lg p-2 sm:p-3 w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-2"></div>
      <div className="grid grid-cols-7 gap-px border border-red-200 bg-red-200 flex-grow">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="py-1 text-center text-[10px] sm:text-xs font-semibold text-gray-600 bg-indigo-100"
          >
            {day}
          </div>
        ))}
        {days.map((day) => (
          <DayCell
            key={day.toString()}
            date={day}
            isCurrentMonth={isSameMonth(day, currentDate)}
            events={events}
          />
        ))}
      </div>
    </div>
  );
};

export default CalendarGrid;
