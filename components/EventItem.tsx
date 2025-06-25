import React, { useRef } from 'react';
import { useDrag } from 'react-dnd';
import { DisplayEvent } from '../types';
import { format, parseISO } from 'date-fns';
import { EVENT_COLORS } from '../constants';

interface EventItemProps {
  event: DisplayEvent;
  onClick: (event: DisplayEvent) => void;
}

const EventItem: React.FC<EventItemProps> = ({ event, onClick }) => {
  const eventColorStyle = EVENT_COLORS.find(c => c.value === event.color) || EVENT_COLORS[0];
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'EVENT',
    item: { event },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(ref);

  return (
    <div
      ref={ref}
      onClick={(e) => { e.stopPropagation(); onClick(event);}} // Stop propagation to prevent DayCell click
      className={`p-1.5 mb-1 rounded-md text-xs cursor-move hover:opacity-80 transition-all duration-200 ${eventColorStyle.value} ${eventColorStyle.text} overflow-hidden whitespace-nowrap text-ellipsis ${isDragging ? 'opacity-30 scale-95 shadow-lg' : ''}`}
      title={`${event.title} - ${format(parseISO(event.start), 'p')} to ${format(parseISO(event.end), 'p')}`}
    >
      <span className="font-semibold">{event.title}</span>
      <span className="ml-1 hidden sm:inline">({format(parseISO(event.start), 'p')})</span>
    </div>
  );
};

export default EventItem;
