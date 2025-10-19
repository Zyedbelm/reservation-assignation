
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, AlertTriangle, Flag } from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import { useAvailabilities } from '@/hooks/useAvailabilities';
import { useGameMasters } from '@/hooks/useGameMasters';
import { useActivitiesRealtime } from '@/hooks/useActivitiesRealtime';
import { extractOptions } from '@/utils/eventOptionsExtractor';
import { toast } from '@/hooks/use-toast';
import { formatLocalDate } from '@/utils/dateUtils';
import ManualAssignmentDialog from './ManualAssignmentDialog';
import EventDetailsDialog from './EventDetailsDialog';

const WeeklyCalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  console.log('WeeklyCalendarView rendering, currentDate:', currentDate);

  const { data: activities = [], refetch, isLoading: activitiesLoading } = useActivities();
  const { data: availabilities = [], isLoading: availabilitiesLoading } = useAvailabilities();
  const { data: gameMasters = [], isLoading: gmLoading } = useGameMasters();
  
  // Activer les mises à jour en temps réel
  useActivitiesRealtime();

  console.log('Data loaded:', {
    activities: activities.length,
    availabilities: availabilities.length,
    gameMasters: gameMasters.length,
    activitiesLoading,
    availabilitiesLoading,
    gmLoading
  });

  // Obtenir le début et la fin de la semaine (lundi à dimanche)
  const getWeekBounds = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Lundi comme premier jour
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  };

  const { start: weekStart, end: weekEnd } = getWeekBounds(currentDate);

  // Filtrer les activités de la semaine
  const weekActivities = activities.filter(activity => {
    const activityDate = new Date(activity.date);
    return activityDate >= weekStart && activityDate <= weekEnd;
  });

  // Filtrer les disponibilités de la semaine
  const weekAvailabilities = availabilities.filter(availability => {
    const availDate = new Date(availability.date);
    return availDate >= weekStart && availDate <= weekEnd;
  });

  console.log('Filtered data:', {
    weekActivities: weekActivities.length,
    weekAvailabilities: weekAvailabilities.length,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString()
  });

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const getDaysOfWeek = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
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
    const [hour] = timeSlot.split(':');
    
    return weekActivities.filter(event => {
      if (event.date !== dayStr) return false;
      const eventHour = parseInt(event.start_time.split(':')[0]);
      return eventHour === parseInt(hour);
    });
  };

  const getAvailabilityForDayAndTime = (day: Date, timeSlot: string) => {
    const dayStr = formatLocalDate(day, 'Europe/Zurich');
    
    return weekAvailabilities.filter(availability => {
      if (availability.date !== dayStr) return false;
      return availability.time_slots.some(slot => slot.startsWith(timeSlot.slice(0, 2)));
    });
  };

  const handleEventClick = (event: any) => {
    console.log('Event clicked:', event);
    setSelectedEvent(event);
    setIsEventDialogOpen(true);
  };

  const checkGMAvailabilityForEvent = (event: any, gmId: string) => {
    const eventDate = event.date;
    const eventHour = event.start_time.slice(0, 2);
    
    const availability = availabilities.find(avail => 
      avail.gm_id === gmId && 
      avail.date === eventDate &&
      avail.time_slots.some(slot => slot.startsWith(eventHour))
    );
    
    return !!availability;
  };

  const handleReassignEvent = (event: any) => {
    const eventDate = new Date(event.date);
    const availabilitiesForSlot = getAvailabilityForDayAndTime(eventDate, event.start_time);
    
    if (availabilitiesForSlot.length === 0) {
      toast({
        title: "Aucune disponibilité",
        description: "Aucun GM n'est disponible pour ce créneau. Les GMs doivent d'abord déclarer leur disponibilité.",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedEvent(event);
    setIsAssignmentDialogOpen(true);
  };

  const getGMName = (gmId?: string) => {
    if (!gmId) return 'Non assigné';
    const gm = gameMasters.find(gm => gm.id === gmId);
    return gm?.name || 'GM inconnu';
  };

  const formatWeekRange = () => {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${weekStart.toLocaleDateString('fr-FR', options)} - ${weekEnd.toLocaleDateString('fr-FR', options)}`;
  };

  const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Afficher un indicateur de chargement si les données sont en cours de chargement
  if (activitiesLoading || availabilitiesLoading || gmLoading) {
    return (
      <Card className="shadow-lg border-gray-100 bg-white">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du calendrier...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-lg border-gray-100 bg-white">
        {/* Header style iOS */}
        <CardHeader className="bg-gradient-to-r from-blue-50 via-slate-50 to-blue-50 border-b border-gray-100 rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              Planning Hebdomadaire
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigateWeek('prev')}
                className="w-10 h-10 rounded-full hover:bg-gray-100 p-0"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </Button>
              <div className="bg-white px-6 py-3 rounded-xl shadow-sm border border-gray-200 min-w-[200px] text-center">
                <span className="text-base font-semibold text-gray-700">
                  {formatWeekRange()}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigateWeek('next')}
                className="w-10 h-10 rounded-full hover:bg-gray-100 p-0"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto bg-white">
            <div className="min-w-[900px]">
              {/* En-tête avec les jours - Style iOS amélioré */}
              <div className="grid grid-cols-8 border-b border-gray-200">
                <div className="p-4 text-center font-medium text-gray-500 border-r border-gray-200 bg-gray-50/50">
                  <div className="text-sm font-medium">Heures</div>
                </div>
                {getDaysOfWeek().map((day, index) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <div key={index} className={`p-4 text-center border-r border-gray-200 last:border-r-0 ${isToday ? 'bg-blue-50' : 'bg-gray-50/50'}`}>
                      <div className={`text-xs font-semibold uppercase tracking-wider ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                        {daysOfWeek[index]}
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

              {/* Grille des créneaux horaires - Style iOS */}
              {getTimeSlots().map((timeSlot, timeIndex) => (
                <div key={timeSlot} className={`grid grid-cols-8 border-b border-gray-100 hover:bg-gray-50/30 transition-colors duration-150`}>
                  {/* Colonne des heures */}
                  <div className="p-4 text-center border-r border-gray-200 bg-white/80 backdrop-blur-sm">
                    <div className="text-base font-semibold text-gray-700">
                      {timeSlot}
                    </div>
                  </div>
                  
                  {/* Créneaux pour chaque jour */}
                  {getDaysOfWeek().map((day, dayIndex) => {
                    const dayEvents = getEventsForDayAndTime(day, timeSlot);
                    const dayAvailabilities = getAvailabilityForDayAndTime(day, timeSlot);
                    const isToday = day.toDateString() === new Date().toDateString();
                    
                    return (
                      <div 
                        key={`${dayIndex}-${timeSlot}`} 
                        className={`p-2 min-h-[90px] border-r border-gray-200 last:border-r-0 transition-all duration-200 ${
                          isToday ? 'bg-blue-50/30 hover:bg-blue-50/50' : 'hover:bg-gray-50/50'
                        }`}
                      >
                        {/* Événements */}
                        {dayEvents.map((event, eventIndex) => (
                          <div
                            key={eventIndex}
                            className={`mb-2 p-3 rounded-xl text-sm cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-l-4 ${
                              event.is_assigned 
                                ? 'bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-150 text-blue-900 border-blue-400 shadow-sm' 
                                : 'bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-150 text-orange-900 border-orange-400 shadow-sm'
                            }`}
                            onClick={() => handleEventClick(event)}
                          >
                            <div className="flex items-start gap-1 mb-2">
                              <div className="font-bold text-base truncate flex-1">{event.title}</div>
                              {(event as any).admin_notes?.trim() && (
                                <Flag className="w-3 h-3 text-yellow-600 flex-shrink-0" fill="currentColor" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs opacity-80 mb-2">
                              <Clock className="w-3 h-3" />
                              <span className="font-medium">{event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}</span>
                            </div>
                            {event.is_assigned ? (
                              <div className="flex items-center gap-2 text-xs">
                                <User className="w-3 h-3" />
                                <span className="truncate font-semibold">{getGMName(event.assigned_gm_id)}</span>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300 font-medium">
                                Non assigné
                              </Badge>
                            )}
                            
                            {(() => {
                              const options = extractOptions(event.description || '');
                              if (options.length === 0) return null;
                              return (
                                <div className="mt-2 bg-yellow-50 border border-yellow-300 rounded-lg p-2">
                                  <div className="text-xs font-semibold text-yellow-800 mb-1">
                                    📋 Options sélectionnées
                                  </div>
                                  <ul className="text-xs text-yellow-900 space-y-0.5">
                                    {options.map((option, idx) => (
                                      <li key={idx} className="flex items-start gap-1">
                                        <span className="text-yellow-600">•</span>
                                        <span>{option}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            })()}
                          </div>
                        ))}
                        
                        {/* Disponibilités (affichées seulement s'il n'y a pas d'événement) */}
                        {dayEvents.length === 0 && dayAvailabilities.map((availability, availIndex) => {
                          const gm = gameMasters.find(gm => gm.id === availability.gm_id);
                          return (
                            <div
                              key={availIndex}
                              className="mb-2 p-3 rounded-xl text-xs bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border border-green-200 shadow-sm"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <User className="w-3 h-3" />
                                <span className="truncate font-semibold">{gm?.name || 'GM'}</span>
                              </div>
                              <div className="text-xs text-green-600 font-medium">✓ Disponible</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de détails d'événement */}
      <EventDetailsDialog
        event={selectedEvent}
        open={isEventDialogOpen}
        onOpenChange={setIsEventDialogOpen}
      />

      {/* Dialog d'assignation manuelle */}
      <ManualAssignmentDialog
        open={isAssignmentDialogOpen}
        onOpenChange={setIsAssignmentDialogOpen}
        event={selectedEvent}
        onAssignmentComplete={() => {
          refetch();
          setIsAssignmentDialogOpen(false);
        }}
        availableGMs={selectedEvent ? gameMasters.filter(gm => 
          gm.is_active && gm.is_available && checkGMAvailabilityForEvent(selectedEvent, gm.id)
        ) : []}
      />
    </>
  );
};

export default WeeklyCalendarView;
