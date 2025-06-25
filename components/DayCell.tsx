import React, { useRef, useState } from 'react';
import { useDrop } from 'react-dnd';
import { format, isSameDay, isToday, parseISO } from 'date-fns';
import { DisplayEvent } from '../types';
import EventItem from './EventItem';
import { toast } from 'react-toastify';

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  events: DisplayEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: DisplayEvent) => void;
  onEventDrop: (newDate: Date, event: DisplayEvent) => void;
}

const DayCell: React.FC<DayCellProps> = ({ date, isCurrentMonth, events, onDayClick, onEventClick, onEventDrop }) => {
  const [showAllEvents, setShowAllEvents] = useState(false);

  const dayEvents = events
    .filter(event => isSameDay(parseISO(event.instanceDate), date))
    .sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime());

  const ref = useRef<HTMLDivElement>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isPastDay = date < today;

  const [{ isOver }, drop] = useDrop({
    accept: 'EVENT',
    drop: (item: { event: DisplayEvent }) => {
      const dropDate = new Date(date);
      dropDate.setHours(0, 0, 0, 0);
      if (dropDate < today) {
        toast.error('Cannot move event to a past day.', { containerId: 'app-toast' });
        return;
      }
      onEventDrop(date, item.event);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  drop(ref);

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAllEvents(true);
  };

  const handleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAllEvents(false);
  };

  return (
    <div
      ref={ref}
      className={`border border-gray-200 p-1 flex flex-col min-h-[60px] sm:min-h-[80px] ${isPastDay ? 'bg-[#c35d6f]' : isCurrentMonth ? 'bg-white hover:bg-slate-50' : 'bg-gray-50 hover:bg-slate-100'} transition-all duration-200 relative cursor-pointer ${isOver ? 'bg-blue-100 border-blue-400 shadow-md scale-[1.02]' : ''}`}
      onClick={() => onDayClick(date)}
    >
      <div className="flex justify-between items-center mb-0.5">
        <span
          className={`text-xs sm:text-sm font-medium ${isToday(date) ? 'bg-blue-600 text-white rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center' : isCurrentMonth ? 'text-gray-700' : 'text-gray-400'}`}
        >
          {format(date, 'd')}
        </span>
      </div>
      <div className="mt-0.5 flex-grow overflow-y-auto space-y-0.5 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {showAllEvents
          ? <>
              {dayEvents.map(event => (
                <EventItem key={`${event.id}-${event.start}`} event={event} onClick={onEventClick} />
              ))}
              {dayEvents.length > 3 && (
                <div className="text-[10px] text-blue-500 mt-0.5 cursor-pointer" onClick={handleCollapse}>
                  Show less
                </div>
              )}
            </>
          : <>
              {dayEvents.slice(0, 3).map(event => (
                <EventItem key={`${event.id}-${event.start}`} event={event} onClick={onEventClick} />
              ))}
              {dayEvents.length > 3 && (
                <div className="text-[10px] text-gray-500 mt-0.5 cursor-pointer" onClick={handleExpand}>
                  + {dayEvents.length - 3} more
                </div>
              )}
            </>
        }
      </div>
    </div>
  );
};

export default DayCell;
