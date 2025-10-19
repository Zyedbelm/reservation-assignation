
import { supabase } from '@/integrations/supabase/client';

export interface TimeSlotConflict {
  eventId: string;
  eventTitle: string;
  startTime: string;
  endTime: string;
  date: string;
}

// Fonction pour convertir une heure en minutes depuis minuit
const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Fonction pour vérifier les conflits d'horaires avec délai minimum
export const checkGMAvailabilityConflicts = async (
  gmId: string,
  eventDate: string,
  eventStartTime: string,
  eventEndTime: string,
  gameId?: string,
  excludeEventId?: string
): Promise<{
  hasConflict: boolean;
  conflicts: TimeSlotConflict[];
  minimumBreakViolations: TimeSlotConflict[];
}> => {
  try {
    // Récupérer les événements assignés au GM pour la même date
    const { data: gmEvents, error: eventsError } = await supabase
      .from('activities')
      .select('id, title, start_time, end_time, date')
      .eq('assigned_gm_id', gmId)
      .eq('date', eventDate)
      .neq('id', excludeEventId || '');

    if (eventsError) throw eventsError;

    // Récupérer le délai minimum si un jeu est spécifié
    let minimumBreakMinutes = 30; // Délai par défaut
    if (gameId) {
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('minimum_break_minutes')
        .eq('id', gameId)
        .single();

      if (!gameError && gameData) {
        minimumBreakMinutes = gameData.minimum_break_minutes || 30;
      }
    }

    const eventStartMinutes = timeToMinutes(eventStartTime);
    const eventEndMinutes = timeToMinutes(eventEndTime);

    const conflicts: TimeSlotConflict[] = [];
    const minimumBreakViolations: TimeSlotConflict[] = [];

    for (const existingEvent of gmEvents || []) {
      const existingStartMinutes = timeToMinutes(existingEvent.start_time);
      const existingEndMinutes = timeToMinutes(existingEvent.end_time);

      // Vérifier le chevauchement direct
      const hasDirectOverlap = (
        (eventStartMinutes < existingEndMinutes && eventEndMinutes > existingStartMinutes)
      );

      if (hasDirectOverlap) {
        conflicts.push({
          eventId: existingEvent.id,
          eventTitle: existingEvent.title,
          startTime: existingEvent.start_time,
          endTime: existingEvent.end_time,
          date: existingEvent.date
        });
      }

      // Vérifier la violation du délai minimum
      const timeBetweenEvents = Math.min(
        Math.abs(eventStartMinutes - existingEndMinutes),
        Math.abs(existingStartMinutes - eventEndMinutes)
      );

      if (!hasDirectOverlap && timeBetweenEvents < minimumBreakMinutes) {
        minimumBreakViolations.push({
          eventId: existingEvent.id,
          eventTitle: existingEvent.title,
          startTime: existingEvent.start_time,
          endTime: existingEvent.end_time,
          date: existingEvent.date
        });
      }
    }

    return {
      hasConflict: conflicts.length > 0 || minimumBreakViolations.length > 0,
      conflicts,
      minimumBreakViolations
    };

  } catch (error) {
    console.error('Error checking GM availability conflicts:', error);
    return {
      hasConflict: false,
      conflicts: [],
      minimumBreakViolations: []
    };
  }
};

// Fonction pour valider la suppression de disponibilités (règle J-7)
export const validateAvailabilityDeletion = (availabilityDate: string): {
  canDelete: boolean;
  daysUntilEvent: number;
  errorMessage?: string;
} => {
  const today = new Date();
  const eventDate = new Date(availabilityDate);
  const timeDiff = eventDate.getTime() - today.getTime();
  const daysUntilEvent = Math.ceil(timeDiff / (1000 * 3600 * 24));

  const canDelete = daysUntilEvent > 7;

  return {
    canDelete,
    daysUntilEvent,
    errorMessage: !canDelete 
      ? `Impossible de supprimer une disponibilité à moins de 7 jours (${daysUntilEvent} jour(s) restant(s))`
      : undefined
  };
};
