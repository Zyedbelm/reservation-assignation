
import { supabase } from '@/integrations/supabase/client';

export interface GameEventMapping {
  eventPattern: string;
  gameId: string;
  gameName: string;
  averageDuration?: number;
}

// Fonction pour normaliser le texte (suppression accents, casse, espaces)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^a-z0-9]/g, ' ') // Remplace les caractères spéciaux par des espaces
    .replace(/\s+/g, ' ') // Normalise les espaces multiples
    .trim();
};

// Cache pour les mappings pour éviter les requêtes répétées
let mappingsCache: GameEventMapping[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getMappings = async (): Promise<GameEventMapping[]> => {
  const now = Date.now();
  
  // Vérifier si le cache est valide
  if (mappingsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return mappingsCache;
  }

  try {
    const { data, error } = await supabase
      .from('event_game_mappings')
      .select(`
        event_name_pattern,
        game_id,
        games (
          name,
          average_duration
        )
      `)
      .eq('is_active', true);

    if (error) throw error;

    mappingsCache = (data || []).map(mapping => ({
      eventPattern: mapping.event_name_pattern,
      gameId: mapping.game_id,
      gameName: mapping.games?.name || '',
      averageDuration: mapping.games?.average_duration
    }));

    cacheTimestamp = now;
    return mappingsCache;
  } catch (error) {
    console.error('Error fetching game mappings:', error);
    return [];
  }
};

// Fonction principale pour trouver un jeu correspondant à un événement
export const findMatchingGame = async (eventTitle: string): Promise<{
  gameId: string | null;
  gameName: string | null;
  averageDuration: number | null;
}> => {
  if (!eventTitle) {
    return { gameId: null, gameName: null, averageDuration: null };
  }

  const mappings = await getMappings();
  const normalizedTitle = normalizeText(eventTitle);

  console.log('Searching for game match:', { eventTitle, normalizedTitle });

  for (const mapping of mappings) {
    const normalizedPattern = normalizeText(mapping.eventPattern);
    
    // Vérifier si le pattern correspond au titre
    if (normalizedTitle.includes(normalizedPattern) || normalizedPattern.includes(normalizedTitle)) {
      console.log('Found game match:', {
        pattern: mapping.eventPattern,
        game: mapping.gameName,
        duration: mapping.averageDuration
      });

      return {
        gameId: mapping.gameId,
        gameName: mapping.gameName,
        averageDuration: mapping.averageDuration || null
      };
    }
  }

  console.log('No game match found for:', eventTitle);
  return { gameId: null, gameName: null, averageDuration: null };
};

// Fonction pour invalider le cache (à utiliser après modification des mappings)
export const invalidateMappingsCache = () => {
  mappingsCache = null;
  cacheTimestamp = 0;
};

// Fonction pour créer un nouveau mapping
export const createEventGameMapping = async (eventPattern: string, gameId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('event_game_mappings')
      .insert({
        event_name_pattern: eventPattern,
        game_id: gameId,
        is_active: true
      });

    if (error) throw error;

    // Invalider le cache après création
    invalidateMappingsCache();
    return true;
  } catch (error) {
    console.error('Error creating event game mapping:', error);
    return false;
  }
};
