
import { Activity } from '@/hooks/useActivities';
import EventBlock from './EventBlock';

interface TimeGridProps {
  weekDays: Date[];
  timeSlots: string[];
  getEventsForDate: (date: Date) => (Activity & { eventType?: 'own' | 'preceding' })[];
  getEventStyle: (startTime: string, endTime: string) => { top: string; height: string };
  getGMName: (gmId: string) => string;
  onEventClick: (event: Activity & { eventType?: 'own' | 'preceding' }) => void;
}

const TimeGrid = ({ weekDays, timeSlots, getEventsForDate, getEventStyle, getGMName, onEventClick }: TimeGridProps) => {
  // Use the time slots passed as props
  const displayTimeSlots = timeSlots;

  return (
    <div className="grid grid-cols-8 relative">
      {/* Time labels column */}
      <div className="border-r">
        {displayTimeSlots.map((time) => (
          <div key={time} className="h-12 flex items-center justify-end pr-3 text-sm text-gray-600 border-b font-medium">
            {time}
          </div>
        ))}
      </div>

      {/* Days columns */}
      {weekDays.map((day) => {
        const dayEvents = getEventsForDate(day);
        return (
          <div key={day.toISOString()} className="relative border-r">
            {/* Hour lines */}
            {displayTimeSlots.map((time) => (
              <div key={time} className="h-12 border-b border-gray-100"></div>
            ))}

            {/* Events for this day */}
            {dayEvents.map((event) => {
              const style = getEventStyle(event.start_time, event.end_time);
              return (
                <EventBlock
                  key={event.id}
                  event={event}
                  style={style}
                  getGMName={getGMName}
                  onEventClick={onEventClick}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default TimeGrid;
