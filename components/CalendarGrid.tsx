import React from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import DayCell from './DayCell';
import { DisplayEvent } from '../types';
import { DAYS_OF_WEEK } from '../constants';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';

interface CalendarGridProps {
  currentDate: Date;
  events: DisplayEvent[];
  onDateChange: (newDate: Date) => void;
  onDayClick: (date: Date) => void;
  onEventClick: (event: DisplayEvent) => void;
  onEventDrop: (newDate: Date, event: DisplayEvent) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentDate,
  events,
  onDateChange,
  onDayClick,
  onEventClick,
  onEventDrop,
}) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const prevMonth = () => onDateChange(subMonths(currentDate, 1));
  const nextMonth = () => onDateChange(addMonths(currentDate, 1));
  const goToToday = () => onDateChange(new Date());


  return (
    <div className="bg-gradient-to-r from-cyan-500 to-indigo-500 shadow-xl rounded-lg p-2 sm:p-3 w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-full hover:bg-gray-200 transition-colors text-gray-600 hover:text-gray-800"
          aria-label="Previous month"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div className="text-center">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">
            {format(currentDate, 'MMMM yyyy')}
            </h2>
            <button 
                onClick={goToToday}
                className="text-sm text-black hover:text-blue-800 font-medium"
            >
                Go to Today
            </button>
        </div>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-full hover:bg-gray-200 transition-colors text-gray-600 hover:text-gray-800"
          aria-label="Next month"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px border border-red-200 bg-red-200 flex-grow">
        {DAYS_OF_WEEK.map(day => (
          <div key={day} className="py-1 text-center text-[10px] sm:text-xs font-semibold text-gray-600 bg-indigo-100">
            {day}
          </div>
        ))}
        {days.map((day: Date) => (
          <DayCell
            key={day.toString()}
            date={day}
            isCurrentMonth={isSameMonth(day, currentDate)}
            events={events}
            onDayClick={onDayClick}
            onEventClick={onEventClick}
            onEventDrop={onEventDrop}
          />
        ))}
      </div>
    </div>
  );
};

export default CalendarGrid;
