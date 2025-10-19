interface EventsCalendarViewProps {
  viewMode: 'week' | 'month';
  selectedDate: Date;
  filteredEvents: any[];
  onEventClick: (event: any) => void;
}

import { formatLocalDate } from '@/utils/dateUtils';
import { useAllEventAssignments } from '@/hooks/useEventAssignments';
import { useGMPublicNames, getGMNameById } from '@/hooks/useGMPublicNames';
import { Users, Flag, Wine, Cake } from 'lucide-react';
import { extractOptions } from '@/utils/eventOptionsExtractor';

const EventsCalendarView = ({ viewMode, selectedDate, filteredEvents, onEventClick }: EventsCalendarViewProps) => {
  const { data: assignmentsByEvent = {} } = useAllEventAssignments();
  const { data: gmNames = [] } = useGMPublicNames();
  
  const formatGMDisplayName = (gmName: string) => {
    const parts = gmName.split(' ');
    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastNameInitial = parts[parts.length - 1].charAt(0).toUpperCase();
      return `${firstName} ${lastNameInitial}.`;
    }
    return gmName;
  };

  const getEventsForDay = (day: Date) => {
    const dayStr = formatLocalDate(day, 'Europe/Zurich');
    return filteredEvents.filter(event => event.date === dayStr);
  };

  const getDaysOfWeek = () => {
    const days = [];
    const startDate = new Date(selectedDate);
    
    if (viewMode === 'week') {
      startDate.setDate(startDate.getDate() - startDate.getDay() + 1); // Start Monday
      for (let i = 0; i < 7; i++) {
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + i);
        days.push(day);
      }
    } else {
      startDate.setDate(1);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      for (let i = 1; i <= endDate.getDate(); i++) {
        const day = new Date(startDate.getFullYear(), startDate.getMonth(), i);
        days.push(day);
      }
    }
    
    return days;
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 22; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  const getEventsForDayAndTime = (day: Date, timeSlot: string) => {
    const dayStr = formatLocalDate(day, 'Europe/Zurich');
    const slotHour = parseInt(timeSlot.split(':')[0], 10);
    const slotStart = slotHour * 60; // Début du créneau en minutes
    const slotEnd = slotStart + 60;   // Fin du créneau en minutes (1 heure plus tard)
    
    return filteredEvents.filter(event => {
      if (event.date !== dayStr) return false;
      
      const [sh, sm] = event.start_time.split(':').map(Number);
      const [eh, em] = event.end_time.split(':').map(Number);
      const eventStart = sh * 60 + sm; // Début événement en minutes
      const eventEnd = eh * 60 + em;   // Fin événement en minutes
      
      // L'événement chevauche le créneau s'il commence avant la fin du créneau
      // ET se termine après le début du créneau
      return eventStart < slotEnd && eventEnd > slotStart;
    });
  };

  // Nouvelle fonction pour organiser les événements simultanés
  const organizeSimultaneousEvents = (events: any[], timeSlot: string) => {
    const organizedEvents = [];
    const processedEvents = new Set();

    for (const event of events) {
      if (processedEvents.has(event.id)) continue;

      const eventStartHour = parseInt(event.start_time.split(':')[0]);
      const slotHour = parseInt(timeSlot.split(':')[0]);
      
      // Vérifier si c'est le créneau de démarrage de l'événement
      if (eventStartHour === slotHour) {
        // Chercher tous les événements qui commencent exactement à la même heure
        const simultaneousEvents = events.filter(e => 
          !processedEvents.has(e.id) &&
          parseInt(e.start_time.split(':')[0]) === eventStartHour &&
          parseInt(e.start_time.split(':')[1]) === parseInt(event.start_time.split(':')[1])
        );

        organizedEvents.push({
          events: simultaneousEvents,
          startTime: event.start_time,
          isStartSlot: true
        });

        // Marquer ces événements comme traités
        simultaneousEvents.forEach(e => processedEvents.add(e.id));
      }
    }

    return organizedEvents;
  };

  const getEventPosition = (event: any, timeSlot: string) => {
    const eventStartHour = parseInt(event.start_time.split(':')[0]);
    const eventStartMinute = parseInt(event.start_time.split(':')[1]);
    const eventEndHour = parseInt(event.end_time.split(':')[0]);
    const eventEndMinute = parseInt(event.end_time.split(':')[1]);
    
    // Calculate total duration in minutes
    const startTotalMinutes = eventStartHour * 60 + eventStartMinute;
    const endTotalMinutes = eventEndHour * 60 + eventEndMinute;
    const durationMinutes = endTotalMinutes - startTotalMinutes;
    
    // Each time slot represents 60 minutes and has a height of 60px (min-h-[60px])
    const slotHeightPx = 60;
    const minutesPerSlot = 60;
    
    // Calculate height in pixels based on actual duration
    const heightPx = (durationMinutes / minutesPerSlot) * slotHeightPx;
    
    // Calculate top offset within the time slot based on start minutes
    const slotHour = parseInt(timeSlot.split(':')[0]);
    const minutesFromSlotStart = eventStartMinute;
    const topOffsetPx = (minutesFromSlotStart / minutesPerSlot) * slotHeightPx;
    
    return {
      height: `${heightPx}px`,
      top: `${topOffsetPx}px`
    };
  };

  const renderGridView = () => {
    const days = getDaysOfWeek();
    const timeSlots = getTimeSlots();
    const daysOfWeekLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    
    return (
      <div className="overflow-x-auto bg-white">
        <div className="min-w-[900px]">
          {/* Header with days */}
          <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
            <div className="p-4 text-center font-medium text-gray-500 border-r border-gray-200 bg-gray-50">
              <div className="text-sm font-medium">Heures</div>
            </div>
            {days.slice(0, 7).map((day, index) => {
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <div key={index} className={`p-4 text-center border-r border-gray-200 last:border-r-0 ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <div className={`text-xs font-semibold uppercase tracking-wider ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                    {daysOfWeekLabels[index]}
                  </div>
                  <div className={`text-2xl font-bold mt-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                    {day.getDate()}
                  </div>
                  <div className={`text-xs mt-1 ${isToday ? 'text-blue-500' : 'text-gray-500'}`}>
                    {day.toLocaleDateString('fr-FR', { month: 'short' })}
                  </div>
                  {isToday && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mt-2"></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Time slots grid */}
          {timeSlots.map((timeSlot, timeIndex) => (
            <div key={timeSlot} className="grid border-b border-gray-100 hover:bg-gray-50/30 transition-colors duration-150" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
              {/* Time column */}
              <div className="p-4 text-center border-r border-gray-200 bg-white/80 backdrop-blur-sm">
                <div className="text-sm font-semibold text-gray-700">
                  {timeSlot}
                </div>
              </div>
              
              {/* Day columns */}
              {days.slice(0, 7).map((day, dayIndex) => {
                const dayEvents = getEventsForDayAndTime(day, timeSlot);
                const organizedEvents = organizeSimultaneousEvents(dayEvents, timeSlot);
                const isToday = day.toDateString() === new Date().toDateString();
                
                return (
                  <div 
                    key={`${dayIndex}-${timeSlot}`} 
                    className={`relative min-h-[60px] border-r border-gray-200 last:border-r-0 ${
                      isToday ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    {organizedEvents.map((eventGroup, groupIndex) => (
                      <div key={`group-${groupIndex}`} className="flex gap-1 absolute inset-x-1">
                        {eventGroup.events.map((event, eventIndex) => {
                          const position = getEventPosition(event, timeSlot);
                          const eventWidth = `${100 / eventGroup.events.length}%`;
                          const eventLeft = `${(eventIndex * 100) / eventGroup.events.length}%`;
                          
                          return (
                            <div
                              key={event.id}
                              className={`absolute p-2 rounded text-xs cursor-pointer transition-all duration-200 hover:shadow-lg hover:z-10 border-l-4 overflow-hidden ${
                                event.is_assigned 
                                  ? 'bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-150 text-green-900 border-green-400' 
                                  : 'bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-150 text-orange-900 border-orange-400'
                              }`}
                              style={{
                                top: position.top,
                                height: position.height,
                                minHeight: '40px',
                                width: eventWidth,
                                left: eventLeft
                              }}
                              onClick={() => onEventClick(event)}
                            >
                              <div className="flex items-start gap-1 mb-1">
                                <div className="font-bold text-xs truncate flex-1">{event.title}</div>
                                {event.admin_notes?.trim() && (
                                  <Flag className="w-3 h-3 text-yellow-600 flex-shrink-0" fill="currentColor" />
                                )}
                              </div>
                              
                              {(() => {
                                const options = extractOptions(event.description || '');
                                const hasVinum = options.some(opt => opt.toLowerCase().includes('vinum'));
                                const hasAnniversaire = event.title.toLowerCase().includes('serviteur') && 
                                                        options.some(opt => opt.toLowerCase().includes('spécial anniversaire kids'));
                                return options.length > 0 ? (
                                  <div className="bg-yellow-100 border border-yellow-300 rounded px-1.5 py-0.5 mb-1 flex items-center justify-between gap-1">
                                    <div className="text-[10px] font-semibold text-yellow-800 truncate flex-1">
                                      {options.length === 1 ? options[0] : `${options.length} options`}
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      {hasAnniversaire && (
                                        <Cake className="w-3 h-3 text-yellow-800" />
                                      )}
                                      {hasVinum && (
                                        <Wine className="w-3 h-3 text-yellow-800" />
                                      )}
                                    </div>
                                  </div>
                                ) : null;
                              })()}

                              {event.is_assigned && (
                                <div className="text-xs mt-1 font-medium">
                                  <div>✓ Assigné</div>
                                  {assignmentsByEvent[event.id]?.gmIds?.map((gmId, index) => (
                                    <div key={gmId} className="text-xs opacity-80 mt-0.5">
                                      {formatGMDisplayName(getGMNameById(gmNames, gmId))}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {(() => {
                                const assignmentData = assignmentsByEvent[event.id];
                                const gmCount = assignmentData?.count || (event.assigned_gm_id ? 1 : 0);
                                return gmCount > 1 ? (
                                  <div className="text-xs mt-1 flex items-center gap-1 font-medium">
                                    <Users className="w-3 h-3" />
                                    {gmCount} GMs
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return renderGridView();
};

export default EventsCalendarView;
