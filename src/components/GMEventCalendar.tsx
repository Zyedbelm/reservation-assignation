
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, User, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import { useAuth } from '@/hooks/useAuth';
import { useGameMasters } from '@/hooks/useGameMasters';
import { useActivitiesRealtime } from '@/hooks/useActivitiesRealtime';
import { extractOptions } from '@/utils/eventOptionsExtractor';
import EventDetailsDialog from './EventDetailsDialog';

const GMEventCalendar = () => {
  const { profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: activities = [] } = useActivities();
  const { data: gameMasters = [] } = useGameMasters();
  
  // Activer les mises à jour en temps réel
  useActivitiesRealtime();

  const gmId = profile?.gm_id || profile?.id;
  const myActivities = activities.filter(activity => activity.assigned_gm_id === gmId);

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(newDate);
  };

  const getDateRange = () => {
    if (viewMode === 'week') {
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Start Monday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.toLocaleDateString('fr-FR')} - ${endOfWeek.toLocaleDateString('fr-FR')}`;
    } else {
      return selectedDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const getDaysOfWeek = () => {
    const days = [];
    const startDate = new Date(selectedDate);
    startDate.setDate(startDate.getDate() - startDate.getDay() + 1); // Start Monday
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
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
    const dayStr = day.toISOString().split('T')[0];
    const slotHour = parseInt(timeSlot.split(':')[0]);
    
    return myActivities.filter(event => {
      if (event.date !== dayStr) return false;
      
      // Convertir les heures de début et fin en minutes pour plus de précision
      const eventStartHour = parseInt(event.start_time.split(':')[0]);
      const eventStartMinute = parseInt(event.start_time.split(':')[1]);
      const eventEndHour = parseInt(event.end_time.split(':')[0]);
      const eventEndMinute = parseInt(event.end_time.split(':')[1]);
      
      const eventStartInMinutes = eventStartHour * 60 + eventStartMinute;
      const eventEndInMinutes = eventEndHour * 60 + eventEndMinute;
      const slotStartInMinutes = slotHour * 60;
      const slotEndInMinutes = (slotHour + 1) * 60;
      
      // Vérifier si l'événement chevauche avec ce créneau horaire
      return eventStartInMinutes < slotEndInMinutes && eventEndInMinutes > slotStartInMinutes;
    });
  };

  const getEventPosition = (event: any, timeSlot: string) => {
    const eventStartHour = parseInt(event.start_time.split(':')[0]);
    const eventStartMinute = parseInt(event.start_time.split(':')[1]);
    const eventEndHour = parseInt(event.end_time.split(':')[0]);
    const eventEndMinute = parseInt(event.end_time.split(':')[1]);
    const slotHour = parseInt(timeSlot.split(':')[0]);
    
    // Seul le slot de démarrage affiche l'événement complet
    const isStartSlot = eventStartHour === slotHour;
    
    if (!isStartSlot) return null;
    
    // Calculer la durée totale en minutes
    const eventStartInMinutes = eventStartHour * 60 + eventStartMinute;
    const eventEndInMinutes = eventEndHour * 60 + eventEndMinute;
    const durationInMinutes = eventEndInMinutes - eventStartInMinutes;
    
    // Hauteur du slot (60px par heure)
    const slotHeightPx = 60;
    const heightInPixels = Math.max((durationInMinutes / 60) * slotHeightPx, 40);
    
    // Position verticale basée sur les minutes dans l'heure de début
    const topOffsetPx = (eventStartMinute / 60) * slotHeightPx;
    
    return {
      height: `${heightInPixels}px`,
      top: `${topOffsetPx}px`
    };
  };

  const renderGridCalendarView = () => {
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
            {days.map((day, index) => {
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
              {days.map((day, dayIndex) => {
                const dayEvents = getEventsForDayAndTime(day, timeSlot);
                const isToday = day.toDateString() === new Date().toDateString();
                
                return (
                  <div 
                    key={`${dayIndex}-${timeSlot}`} 
                    className={`relative min-h-[60px] border-r border-gray-200 last:border-r-0 ${
                      isToday ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    {dayEvents.map((event, eventIndex) => {
                      const position = getEventPosition(event, timeSlot);
                      if (!position) return null;
                      
                      const options = extractOptions(event.description || '');
                      const optionsSummary = options.length > 0
                        ? `\nOptions:\n- ${options.slice(0, 5).join('\n- ')}${options.length > 5 ? '\n...' : ''}`
                        : '';
                      
                      return (
                        <div
                          key={eventIndex}
                          className="absolute left-0 right-0 mx-1 p-2 rounded text-xs cursor-pointer transition-all duration-200 hover:shadow-lg hover:z-10 border-l-4 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-150 text-green-900 border-green-400"
                          style={{
                            top: position.top,
                            height: position.height,
                            minHeight: '40px'
                          }}
                          onClick={() => handleEventClick(event)}
                          title={`${event.title}\n${event.start_time.slice(0, 5)} - ${event.end_time.slice(0, 5)}${optionsSummary}`}
                        >
                          <div className="flex items-start gap-1 mb-1">
                            <div className="font-bold text-xs truncate flex-1">{event.title}</div>
                            {(event as any).admin_notes?.trim() && (
                              <Flag className="w-3 h-3 text-yellow-600 flex-shrink-0" fill="currentColor" />
                            )}
                            {options.length > 0 && (
                              <span className="inline-flex items-center rounded border border-yellow-300 bg-yellow-100 text-yellow-800 text-[10px] px-1 py-0.5 flex-shrink-0">
                                📋 {options.length}
                              </span>
                            )}
                          </div>
                          <div className="text-xs opacity-75">
                            {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
                          </div>
                          <div className="text-xs mt-1 font-medium">
                            ✓ Assigné
                          </div>
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
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Mes Événements
              </CardTitle>
              <CardDescription>
                Vue d'ensemble de tous mes événements assignés
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'week' ? 'month' : 'week')}
              >
                {viewMode === 'week' ? 'Vue Mois' : 'Vue Semaine'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-lg font-semibold">{getDateRange()}</h3>
            <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Tabs defaultValue="calendar" className="space-y-4">
            <TabsList>
              <TabsTrigger value="calendar">Vue Calendrier</TabsTrigger>
              <TabsTrigger value="list">Vue Liste</TabsTrigger>
            </TabsList>

            <TabsContent value="calendar">
              {renderGridCalendarView()}
            </TabsContent>

            <TabsContent value="list">
              <div className="space-y-3">
                {myActivities.map((event) => (
                  <div 
                    key={event.id} 
                    className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{event.title}</h4>
                        {(event as any).admin_notes?.trim() && (
                          <Flag className="w-4 h-4 text-yellow-600 flex-shrink-0" fill="currentColor" />
                        )}
                        {(() => {
                          const count = extractOptions(event.description || '').length;
                          return count > 0 ? (
                            <span className="inline-flex items-center rounded border border-yellow-300 bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0.5">
                              📋 {count}
                            </span>
                          ) : null;
                        })()}
                        <Badge className="bg-green-100 text-green-800">
                          Assigné
                        </Badge>
                        <Badge variant="secondary">{event.activity_type}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(event.date).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {event.start_time.substring(0, 5)} - {event.end_time.substring(0, 5)}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          Sion Centre
                        </div>
                      </div>
                      
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
                  </div>
                ))}
                {myActivities.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Aucun événement assigné</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <EventDetailsDialog 
        event={selectedEvent}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
};

export default GMEventCalendar;
