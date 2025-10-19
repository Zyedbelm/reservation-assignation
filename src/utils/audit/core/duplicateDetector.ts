
import { isTimeSlotCompatible, timeToMinutes } from '../availabilityChecker';

export const detectDuplicateAssignments = (events: any[]) => {
  const duplicates: Array<{
    eventId: string;
    eventTitle: string;
    eventDate: string;
    assignedGMs: Array<{ id: string; name: string; }>;
  }> = [];

  // Grouper les événements par ID pour détecter les doublons
  const eventGroups: { [key: string]: any[] } = {};
  
  events?.forEach(event => {
    if (event.assigned_gm_id) {
      if (!eventGroups[event.id]) {
        eventGroups[event.id] = [];
      }
      eventGroups[event.id].push(event);
    }
  });

  // Chercher les événements avec plusieurs assignations
  Object.values(eventGroups).forEach(eventGroup => {
    if (eventGroup.length > 1) {
      const firstEvent = eventGroup[0];
      const assignedGMs = eventGroup.map(e => ({
        id: e.assigned_gm_id,
        name: e.game_masters?.name || 'GM inconnu'
      }));
      
      duplicates.push({
        eventId: firstEvent.id,
        eventTitle: firstEvent.title,
        eventDate: firstEvent.date,
        assignedGMs
      });
    }
  });

  return duplicates;
};

export const analyzeGMStatsWithDuplicates = (
  gameMasters: any[], 
  events: any[], 
  availabilities: any[], 
  duplicateAssignments: any[]
) => {
  return (gameMasters || []).map(gm => {
    const gmEvents = events?.filter(e => e.assigned_gm_id === gm.id) || [];
    const gmAvailabilities = availabilities?.filter(a => a.gm_id === gm.id) || [];
    
    // Vérifier les conflits d'assignation (disponibilité)
    const availabilityConflicts = analyzeAvailabilityConflicts(gmEvents, gmAvailabilities);

    // Ajouter les conflits de doublons pour ce GM
    const gmDuplicateConflicts = duplicateAssignments
      .filter(duplicate => duplicate.assignedGMs.some(assignedGM => assignedGM.id === gm.id))
      .map(duplicate => ({
        eventId: duplicate.eventId,
        eventTitle: duplicate.eventTitle,
        eventDate: duplicate.eventDate,
        eventTime: 'Assignation multiple',
        issue: `DOUBLON: Assigné simultanément avec ${duplicate.assignedGMs.filter(assignedGM => assignedGM.id !== gm.id).map(otherGM => otherGM.name).join(', ')}`
      }));

    // Combiner tous les conflits
    const allConflicts = [...availabilityConflicts, ...gmDuplicateConflicts];

    return {
      gmId: gm.id,
      gmName: gm.name,
      assignedCount: gmEvents.length,
      availabilityDates: gmAvailabilities.map(a => a.date),
      conflictingAssignments: allConflicts
    };
  });
};

const analyzeAvailabilityConflicts = (gmEvents: any[], gmAvailabilities: any[]) => {
  const availabilityConflicts = [];
  
  for (const event of gmEvents) {
    const eventDate = event.date;
    const eventStart = event.start_time;
    const eventEnd = event.end_time;
    
    // Vérifier si le GM a une disponibilité pour cette date
    const availability = gmAvailabilities.find(a => a.date === eventDate);
    
    if (!availability) {
      availabilityConflicts.push({
        eventId: event.id,
        eventTitle: event.title,
        eventDate,
        eventTime: `${eventStart}-${eventEnd}`,
        issue: 'Aucune disponibilité déclarée pour cette date'
      });
    } else {
      // Vérifier spécifiquement si le GM est indisponible toute la journée
      if (availability.time_slots && availability.time_slots.includes('indisponible-toute-la-journee')) {
        availabilityConflicts.push({
          eventId: event.id,
          eventTitle: event.title,
          eventDate,
          eventTime: `${eventStart}-${eventEnd}`,
          availableSlots: availability.time_slots,
          issue: 'GM déclaré INDISPONIBLE toute la journée - assignation forcée détectée !'
        });
      } else {
        // Vérifier si le créneau est compatible avec les disponibilités déclarées
        const isCompatible = isTimeSlotCompatible(availability.time_slots, eventStart, eventEnd);
        
        if (!isCompatible) {
          availabilityConflicts.push({
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

  return availabilityConflicts;
};
