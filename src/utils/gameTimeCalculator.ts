
import { findMatchingGame } from './eventGameMappings';
import { supabase } from '@/integrations/supabase/client';

export interface TimeCalculationResult {
  endTime: string;
  duration: number;
  source: 'game_mapping' | 'event_data' | 'default';
  gameInfo?: {
    gameId: string;
    gameName: string;
  };
}

export const calculateEventEndTime = async (
  startTime: string, 
  eventTitle?: string, 
  providedDuration?: number,
  eventDescription?: string
): Promise<TimeCalculationResult> => {
  console.log('Calculating end time for:', { startTime, eventTitle, providedDuration });

  // 1. Essayer de trouver une correspondance de jeu (priorité absolue)
  if (eventTitle) {
    try {
      const gameMatch = await findMatchingGame(eventTitle);
      
      if (gameMatch.gameId && gameMatch.averageDuration) {
        const endTime = addMinutesToTime(startTime, gameMatch.averageDuration);
        console.log('Using game mapping duration:', gameMatch.averageDuration);
        
        return {
          endTime,
          duration: gameMatch.averageDuration,
          source: 'game_mapping',
          gameInfo: {
            gameId: gameMatch.gameId,
            gameName: gameMatch.gameName || 'Jeu inconnu'
          }
        };
      }
    } catch (error) {
      console.log('Error finding game match:', error);
    }
  }

  // 2. Utiliser la durée fournie dans l'événement
  if (providedDuration && providedDuration > 0) {
    const endTime = addMinutesToTime(startTime, providedDuration);
    return {
      endTime,
      duration: providedDuration,
      source: 'event_data'
    };
  }

  // 3. Essayer d'extraire la durée de la description
  if (eventDescription) {
    const durationFromDesc = extractDurationFromDescription(eventDescription);
    if (durationFromDesc > 0) {
      const endTime = addMinutesToTime(startTime, durationFromDesc);
      return {
        endTime,
        duration: durationFromDesc,
        source: 'event_data'
      };
    }
  }

  // 4. Durée par défaut
  const defaultDuration = 60;
  const endTime = addMinutesToTime(startTime, defaultDuration);
  return {
    endTime,
    duration: defaultDuration,
    source: 'default'
  };
};

const addMinutesToTime = (timeString: string, minutes: number): string => {
  const [hours, mins] = timeString.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
};

const extractDurationFromDescription = (description: string): number => {
  // Chercher des patterns comme "60 min", "1h30", "90 minutes"
  const patterns = [
    /(\d+)\s*min(?:utes?)?/i,
    /(\d+)h(\d+)/i,
    /(\d+)\s*heures?/i
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      if (pattern.source.includes('h')) {
        // Format "1h30"
        const hours = parseInt(match[1]);
        const minutes = match[2] ? parseInt(match[2]) : 0;
        return hours * 60 + minutes;
      } else if (pattern.source.includes('heures')) {
        // Format "2 heures"
        return parseInt(match[1]) * 60;
      } else {
        // Format "60 min"
        return parseInt(match[1]);
      }
    }
  }

  return 0;
};

// Fonction pour mettre à jour un événement avec la durée calculée
export const updateEventWithCalculatedDuration = async (eventId: string, eventTitle?: string) => {
  try {
    const { data: event } = await supabase
      .from('activities')
      .select('start_time, title, description, duration')
      .eq('id', eventId)
      .single();

    if (!event) return;

    const calculation = await calculateEventEndTime(
      event.start_time,
      eventTitle || event.title,
      event.duration,
      event.description
    );

    const updateData: any = {
      end_time: calculation.endTime,
      duration: calculation.duration
    };

    // Si on a trouvé une correspondance de jeu, ajouter l'info
    if (calculation.gameInfo) {
      updateData.game_id = calculation.gameInfo.gameId;
    }

    await supabase
      .from('activities')
      .update(updateData)
      .eq('id', eventId);

    console.log(`Event ${eventId} updated with calculated duration:`, calculation);
  } catch (error) {
    console.error('Error updating event duration:', error);
  }
};
