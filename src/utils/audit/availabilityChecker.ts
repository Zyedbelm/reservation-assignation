
import { ScheduleConflict } from './auditTypes';

export const isTimeWithinAvailability = (
  eventStartTime: string,
  eventEndTime: string,
  availability: any
): boolean => {
  if (!availability) return false;

  const eventStartMinutes = timeToMinutes(eventStartTime);
  const eventEndMinutes = timeToMinutes(eventEndTime);
  const availabilityStartMinutes = timeToMinutes(availability.start_time);
  const availabilityEndMinutes = timeToMinutes(availability.end_time);

  return (
    eventStartMinutes >= availabilityStartMinutes &&
    eventEndMinutes <= availabilityEndMinutes
  );
};

export const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

export const detectScheduleConflicts = (events: any[]): ScheduleConflict[] => {
  const conflicts: ScheduleConflict[] = [];

  for (let i = 0; i < events.length; i++) {
    const event1 = events[i];

    for (let j = i + 1; j < events.length; j++) {
      const event2 = events[j];

      if (event1.assigned_gm_id === event2.assigned_gm_id && event1.date === event2.date) {
        const conflict = checkIfEventsOverlap(event1, event2);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }
  }

  return conflicts;
};

const checkIfEventsOverlap = (event1: any, event2: any): ScheduleConflict | null => {
  const start1 = timeToMinutes(event1.start_time);
  const end1 = timeToMinutes(event1.end_time);
  const start2 = timeToMinutes(event2.start_time);
  const end2 = timeToMinutes(event2.end_time);

  const overlap = !(end1 <= start2 || end2 <= start1);

  if (overlap) {
    return {
      eventId: event1.id,
      eventTitle: event1.title,
      eventDate: event1.date,
      gmId: event1.assigned_gm_id,
      conflictingEvents: [{
        id: event2.id,
        title: event2.title,
        startTime: event2.start_time,
        endTime: event2.end_time
      }]
    };
  }

  return null;
};

// Time slot compatibility checker
export const isTimeSlotCompatible = (timeSlots: string[], eventStart: string, eventEnd: string): boolean => {
  if (!timeSlots || timeSlots.length === 0) return false;
  
  // Si GM indisponible toute la journée, pas compatible
  if (timeSlots.includes('indisponible-toute-la-journee')) {
    return false;
  }
  
  const eventStartMinutes = timeToMinutes(eventStart);
  const eventEndMinutes = timeToMinutes(eventEnd);
  
  // Vérifier si l'événement s'inscrit dans au moins un créneau disponible
  for (const slot of timeSlots) {
    if (slot === 'matin' && eventStartMinutes >= 480 && eventEndMinutes <= 720) { // 8h-12h
      return true;
    }
    if (slot === 'apres-midi' && eventStartMinutes >= 840 && eventEndMinutes <= 1080) { // 14h-18h
      return true;
    }
    if (slot === 'soir' && eventStartMinutes >= 1080 && eventEndMinutes <= 1320) { // 18h-22h
      return true;
    }
    if (slot === 'toute-la-journee') {
      return true;
    }
  }
  
  return false;
};

// GM Stats analyzer
export const analyzeGMStats = (
  gameMasters: any[], 
  events: any[], 
  availabilities: any[]
) => {
  return (gameMasters || []).map(gm => {
    const gmEvents = events?.filter(e => e.assigned_gm_id === gm.id) || [];
    const gmAvailabilities = availabilities?.filter(a => a.gm_id === gm.id) || [];
    
    // Analyser les conflits de disponibilité
    const conflictingAssignments = [];
    
    for (const event of gmEvents) {
      const eventDate = event.date;
      const eventStart = event.start_time;
      const eventEnd = event.end_time;
      
      // Vérifier si le GM a une disponibilité pour cette date
      const availability = gmAvailabilities.find(a => a.date === eventDate);
      
      if (!availability) {
        conflictingAssignments.push({
          eventId: event.id,
          eventTitle: event.title,
          eventDate,
          eventTime: `${eventStart}-${eventEnd}`,
          issue: 'Aucune disponibilité déclarée pour cette date'
        });
      } else {
        // Vérifier si le GM est indisponible toute la journée
        if (availability.time_slots && availability.time_slots.includes('indisponible-toute-la-journee')) {
          conflictingAssignments.push({
            eventId: event.id,
            eventTitle: event.title,
            eventDate,
            eventTime: `${eventStart}-${eventEnd}`,
            availableSlots: availability.time_slots,
            issue: 'GM déclaré INDISPONIBLE toute la journée - assignation forcée détectée !'
          });
        } else {
          // Vérifier si le créneau est compatible
          const isCompatible = isTimeSlotCompatible(availability.time_slots, eventStart, eventEnd);
          
          if (!isCompatible) {
            conflictingAssignments.push({
              eventId: event.id,
              eventTitle: event.title,
              eventDate,
              eventTime: `${eventStart}-${eventEnd}`,
              availableSlots: availability.time_slots,
              issue: 'Créneau assigné non compatible avec les disponibilités déclarées'
            });
          }
        }
      }
    }

    return {
      gmId: gm.id,
      gmName: gm.name,
      assignedCount: gmEvents.length,
      availabilityDates: gmAvailabilities.map(a => a.date),
      conflictingAssignments
    };
  });
};
