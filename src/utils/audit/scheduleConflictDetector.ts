
import { ScheduleConflict } from './auditTypes';

export const detectScheduleConflicts = (events: any[]): ScheduleConflict[] => {
  const conflicts: ScheduleConflict[] = [];

  // Grouper les événements par GM et par date
  const eventsByGmAndDate: { [key: string]: any[] } = {};
  
  events.forEach(event => {
    if (!event.assigned_gm_id) return;
    
    const key = `${event.assigned_gm_id}_${event.date}`;
    if (!eventsByGmAndDate[key]) {
      eventsByGmAndDate[key] = [];
    }
    eventsByGmAndDate[key].push(event);
  });

  // Vérifier les conflits pour chaque groupe
  Object.values(eventsByGmAndDate).forEach(dayEvents => {
    if (dayEvents.length <= 1) return;

    dayEvents.forEach((event, index) => {
      const conflictingEvents: Array<{ id: string; title: string; startTime: string; endTime: string; }> = [];
      
      // Comparer avec tous les autres événements du même jour
      dayEvents.forEach((otherEvent, otherIndex) => {
        if (index === otherIndex) return;
        
        // Vérifier le chevauchement d'horaires
        const eventStart = timeToMinutes(event.start_time);
        const eventEnd = timeToMinutes(event.end_time);
        const otherStart = timeToMinutes(otherEvent.start_time);
        const otherEnd = timeToMinutes(otherEvent.end_time);
        
        // Il y a conflit si les horaires se chevauchent
        if (eventStart < otherEnd && eventEnd > otherStart) {
          conflictingEvents.push({
            id: otherEvent.id,
            title: otherEvent.title,
            startTime: otherEvent.start_time,
            endTime: otherEvent.end_time
          });
        }
      });

      if (conflictingEvents.length > 0) {
        conflicts.push({
          eventId: event.id,
          eventTitle: event.title,
          eventDate: event.date,
          gmId: event.assigned_gm_id,
          conflictingEvents
        });
      }
    });
  });

  return conflicts;
};

export const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};
