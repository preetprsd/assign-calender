import React, { useRef } from "react";

import { format } from "date-fns";
import { DisplayEvent } from "../types.ts";

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  events: DisplayEvent[];
}

const DayCell: React.FC<DayCellProps> = ({ date }) => {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className={`border border-gray-200 p-1 flex flex-col min-h-[60px] sm:min-h-[80px]  transition-all duration-200 relative cursor-pointer 'bg-blue-100 border-blue-400 shadow-md scale-[1.02]' `}
    >
      <div className="flex justify-between items-center mb-0.5">
        <span
          className={`text-xs sm:text-sm font-medium  'bg-blue-600 text-white rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center' : isCurrentMonth ? 'text-gray-700' : 'text-gray-400'}`}
        >
          {format(date, "d")}
        </span>
      </div>
      <div className="mt-0.5 flex-grow overflow-y-auto space-y-0.5 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"></div>
    </div>
  );
};

export default DayCell;
