
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import { useGameMasters } from '@/hooks/useGameMasters';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { useGMPublicNames, getGMNameById } from '@/hooks/useGMPublicNames';
import { useActivitiesRealtime } from '@/hooks/useActivitiesRealtime';
import CalendarNavigation from './calendar/CalendarNavigation';
import WeekHeader from './calendar/WeekHeader';
import TimeGrid from './calendar/TimeGrid';
import EventDetailsDialog from './EventDetailsDialog';

interface IOSCalendarViewProps {
  isAdmin?: boolean;
}

const IOSCalendarView = ({ isAdmin = false }: IOSCalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  
  const { data: activities = [] } = useActivities();
  const { data: gameMasters = [] } = useGameMasters();
  const { data: profiles = [] } = useProfiles();
  const { data: gmNames = [] } = useGMPublicNames();
  const { profile } = useAuth();
  
  // Activer les mises à jour en temps réel
  useActivitiesRealtime();

  const today = new Date();
  
  // Filtrer les événements pour le GM connecté uniquement (ou tous si admin)
  const gmId = profile?.gm_id || profile?.id;
  
  const gmActivities = useMemo(() => {
    if (isAdmin) {
      return activities.filter(activity => activity.assigned_gm_id !== null);
    }
    return activities.filter(activity => activity.assigned_gm_id === gmId);
  }, [activities, gmId, isAdmin]);

  // Fonction simplifiée pour comparer les titres d'événements
  const isSameGame = (title1: string, title2: string): boolean => {
    // Extraire le nom du jeu de base (avant le premier "[" ou "-")
    const cleanTitle1 = title1.split(/[\[\-]/)[0].trim().toLowerCase();
    const cleanTitle2 = title2.split(/[\[\-]/)[0].trim().toLowerCase();
    
    // Comparer les titres nettoyés
    return cleanTitle1 === cleanTitle2 && cleanTitle1.length > 0;
  };

  // Fonction optimisée pour trouver les événements précédents
  const findPrecedingEvents = (gmEvents: any[]) => {
    const precedingEvents: any[] = [];
    
    for (const gmEvent of gmEvents) {
      const gmStartTime = new Date(`${gmEvent.date}T${gmEvent.start_time}`);
      const precedingThreshold = new Date(gmStartTime.getTime() - 6 * 60 * 60 * 1000); // 6 heures avant
      
      // Chercher les événements du même jour et du même jeu
      const sameDayEvents = activities.filter(activity => {
        if (activity.date !== gmEvent.date) return false;
        if (activity.assigned_gm_id === gmId) return false; // Pas du même GM
        if (!activity.assigned_gm_id) return false; // Doit être assigné
        if (!isSameGame(activity.title, gmEvent.title)) return false; // Même jeu
        
        // Vérifier la fenêtre de temps
        const eventEndTime = new Date(`${activity.date}T${activity.end_time}`);
        return eventEndTime > precedingThreshold && eventEndTime <= gmStartTime;
      });
      
      // Ajouter les événements trouvés
      precedingEvents.push(...sameDayEvents.map(event => ({ 
        ...event, 
        eventType: 'preceding' as const 
      })));
    }
    
    return precedingEvents;
  };

  // Fonction optimisée pour trouver les événements suivants
  const findFollowingEvents = (gmEvents: any[]) => {
    const followingEvents: any[] = [];
    
    for (const gmEvent of gmEvents) {
      const gmEndTime = new Date(`${gmEvent.date}T${gmEvent.end_time}`);
      const followingThreshold = new Date(gmEndTime.getTime() + 6 * 60 * 60 * 1000); // 6 heures après
      
      // Chercher les événements du même jour et du même jeu
      const sameDayEvents = activities.filter(activity => {
        if (activity.date !== gmEvent.date) return false;
        if (activity.assigned_gm_id === gmId) return false; // Pas du même GM
        if (!activity.assigned_gm_id) return false; // Doit être assigné
        if (!isSameGame(activity.title, gmEvent.title)) return false; // Même jeu
        
        // Vérifier la fenêtre de temps
        const eventStartTime = new Date(`${activity.date}T${activity.start_time}`);
        return eventStartTime >= gmEndTime && eventStartTime < followingThreshold;
      });
      
      // Ajouter les événements trouvés
      followingEvents.push(...sameDayEvents.map(event => ({ 
        ...event, 
        eventType: 'following' as const 
      })));
    }
    
    return followingEvents;
  };

  // Fonction pour générer une couleur unique basée sur le titre du jeu
  const getColorForGame = (gameTitle: string): string => {
    const colors = [
      'from-red-500 to-red-600',
      'from-orange-500 to-orange-600',
      'from-amber-500 to-amber-600',
      'from-yellow-500 to-yellow-600',
      'from-lime-500 to-lime-600',
      'from-emerald-500 to-emerald-600',
      'from-teal-500 to-teal-600',
      'from-cyan-500 to-cyan-600',
      'from-sky-500 to-sky-600',
      'from-indigo-500 to-indigo-600',
      'from-violet-500 to-violet-600',
      'from-purple-500 to-purple-600',
      'from-fuchsia-500 to-fuchsia-600',
      'from-pink-500 to-pink-600',
      'from-rose-500 to-rose-600',
    ];
    
    // Générer un hash simple basé sur le titre du jeu
    let hash = 0;
    for (let i = 0; i < gameTitle.length; i++) {
      hash = gameTitle.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Calculer les événements d'affichage avec useMemo pour éviter la boucle infinie
  const allDisplayEvents = useMemo(() => {
    const enrichedGmActivities = gmActivities.map(activity => ({
      ...activity,
      eventType: 'own' as const,
      colorClass: isAdmin ? getColorForGame(activity.title) : undefined
    }));
    
    if (!isAdmin && gmActivities.length > 0) {
      const precedingEvents = findPrecedingEvents(gmActivities);
      const followingEvents = findFollowingEvents(gmActivities);
      return [...enrichedGmActivities, ...precedingEvents, ...followingEvents];
    } else {
      return enrichedGmActivities;
    }
  }, [gmActivities, activities, isAdmin]);

  // Navigation functions
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get week days starting from Monday
  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    startOfWeek.setDate(diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Generate time slots (8h to 23h to match TimeGrid display)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 23; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  // Get events for a specific date (including preceding events)
  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return allDisplayEvents.filter(activity => activity.date === dateString);
  };

  // Calculate position and height of event in the grid (now aligned with 8AM start)
  const getEventStyle = (startTime: string, endTime: string) => {
    const startHour = parseInt(startTime.split(':')[0]);
    const startMinute = parseInt(startTime.split(':')[1]);
    const endHour = parseInt(endTime.split(':')[0]);
    const endMinute = parseInt(endTime.split(':')[1]);

    const startInMinutes = (startHour - 8) * 60 + startMinute; // Now starting from 8AM
    const endInMinutes = (endHour - 8) * 60 + endMinute;
    const duration = endInMinutes - startInMinutes;

    const top = (startInMinutes / 60) * 48; // 48px per hour (h-12)
    const height = Math.max((duration / 60) * 48, 24); // minimum 24px height

    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  };

  // Get GM name using the secure public names function
  const getGMName = (gmId: string) => {
    return getGMNameById(gmNames, gmId);
  };

  // Handle event click
  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const weekDays = getWeekDays(currentDate);
  const timeSlots = generateTimeSlots();

  // Get week range for display
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];
  const formatWeekRange = () => {
    const startMonth = weekStart.toLocaleString('fr-FR', { month: 'short' });
    const endMonth = weekEnd.toLocaleString('fr-FR', { month: 'short' });
    
    if (startMonth === endMonth) {
      return `${weekStart.getDate()} - ${weekEnd.getDate()} ${startMonth} ${weekStart.getFullYear()}`;
    } else {
      return `${weekStart.getDate()} ${startMonth} - ${weekEnd.getDate()} ${endMonth} ${weekStart.getFullYear()}`;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Mon Planning - {formatWeekRange()}
            </CardTitle>
            <CalendarNavigation
              onPreviousWeek={goToPreviousWeek}
              onNextWeek={goToNextWeek}
              onToday={goToToday}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <WeekHeader weekDays={weekDays} today={today} />
              <TimeGrid
                weekDays={weekDays}
                timeSlots={timeSlots}
                getEventsForDate={getEventsForDate}
                getEventStyle={getEventStyle}
                getGMName={getGMName}
                onEventClick={handleEventClick}
              />
            </div>
          </div>
          
          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-4 text-sm flex-wrap">
            {!isAdmin && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Mes événements assignés</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded opacity-60"></div>
                  <span>Événements précédents (contexte)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400 rounded opacity-60"></div>
                  <span>Événements suivants (contexte)</span>
                </div>
              </>
            )}
            {isAdmin && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded"></div>
                <span>Couleurs uniques par jeu</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Aujourd'hui</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <EventDetailsDialog 
        event={selectedEvent}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        isReadOnly={selectedEvent?.eventType === 'preceding' || selectedEvent?.eventType === 'following'}
      />
    </>
  );
};

export default IOSCalendarView;
