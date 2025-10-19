
import { supabase } from '@/integrations/supabase/client';
import { EventGameMapping } from '@/hooks/useEventGameMappings';

export interface GameMatch {
  gameId: string | null;
  gameName: string | null;
  averageDuration: number | null;
  confidence: number; // 0-100, score de confiance de la correspondance
}

// Interface pour les jeux avec durée moyenne
interface GameWithDuration {
  name: string;
  category?: string;
  average_duration?: number | null;
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

// Fonction pour créer des variantes d'un titre
const createTitleVariants = (title: string): string[] => {
  const normalized = normalizeText(title);
  const variants = [normalized];
  
  // Ajouter des variantes courantes
  const words = normalized.split(' ');
  
  // Variante sans mots courts (articles, prépositions)
  const significantWords = words.filter(word => word.length > 2);
  if (significantWords.length !== words.length) {
    variants.push(significantWords.join(' '));
  }
  
  // Variante avec seulement les premiers mots significatifs (pour "Da Vinci Code" -> "Da Vinci")
  if (significantWords.length > 1) {
    variants.push(significantWords.slice(0, -1).join(' '));
  }
  
  // Variante avec le premier mot seulement
  if (significantWords.length > 0) {
    variants.push(significantWords[0]);
  }
  
  console.log(`🔍 [GAME-MAPPING] Title variants for "${title}":`, variants);
  return variants;
};

// Cache pour les mappings
let mappingsCache: Array<EventGameMapping & { normalizedPattern: string; patternVariants: string[] }> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getMappings = async (): Promise<Array<EventGameMapping & { normalizedPattern: string; patternVariants: string[] }>> => {
  const now = Date.now();
  
  // Vérifier si le cache est valide
  if (mappingsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return mappingsCache;
  }

  try {
    const { data, error } = await supabase
      .from('event_game_mappings')
      .select(`
        *,
        games (
          name,
          category,
          average_duration
        )
      `)
      .eq('is_active', true)
      .order('event_name_pattern');

    if (error) throw error;

    mappingsCache = (data || []).map(mapping => {
      const normalizedPattern = normalizeText(mapping.event_name_pattern);
      const patternVariants = createTitleVariants(mapping.event_name_pattern);
      
      return {
        ...mapping,
        normalizedPattern,
        patternVariants
      };
    });

    cacheTimestamp = now;
    console.log('🎮 [GAME-MAPPING] Loaded mappings:', mappingsCache.length);
    return mappingsCache;
  } catch (error) {
    console.error('❌ [GAME-MAPPING] Error fetching mappings:', error);
    return [];
  }
};

// Fonction principale pour trouver un jeu correspondant à un événement
export const findMatchingGame = async (eventTitle: string): Promise<GameMatch> => {
  if (!eventTitle) {
    return { gameId: null, gameName: null, averageDuration: null, confidence: 0 };
  }

  console.log('🔍 [GAME-MAPPING] Searching for game match:', eventTitle);
  
  const mappings = await getMappings();
  const titleVariants = createTitleVariants(eventTitle);

  console.log('🔍 [GAME-MAPPING] Title variants:', titleVariants);
  console.log('🔍 [GAME-MAPPING] Available patterns:', mappings.map(m => m.event_name_pattern));

  let bestMatch: GameMatch = { gameId: null, gameName: null, averageDuration: null, confidence: 0 };

  for (const mapping of mappings) {
    console.log(`🔍 [GAME-MAPPING] Testing pattern: "${mapping.event_name_pattern}"`);
    console.log(`  Pattern variants:`, mapping.patternVariants);
    
    let confidence = 0;
    let matchType = '';
    
    // Tester toutes les combinaisons de variantes
    for (const titleVariant of titleVariants) {
      for (const patternVariant of mapping.patternVariants) {
        
        // 1. Correspondance exacte (confidence 100)
        if (titleVariant === patternVariant) {
          confidence = Math.max(confidence, 100);
          matchType = 'exact';
          break;
        }
        
        // 2. Le titre contient le pattern (confidence 95)
        else if (titleVariant.includes(patternVariant)) {
          confidence = Math.max(confidence, 95);
          matchType = 'title-contains-pattern';
        }
        
        // 3. Le pattern contient le titre (confidence 90)
        else if (patternVariant.includes(titleVariant)) {
          confidence = Math.max(confidence, 90);
          matchType = 'pattern-contains-title';
        }
        
        // 4. Correspondance partielle par mots (confidence variable)
        else {
          const titleWords = titleVariant.split(' ').filter(w => w.length > 2);
          const patternWords = patternVariant.split(' ').filter(w => w.length > 2);
          
          let matchingWords = 0;
          for (const titleWord of titleWords) {
            for (const patternWord of patternWords) {
              if (titleWord.includes(patternWord) || patternWord.includes(titleWord)) {
                matchingWords++;
                break;
              }
            }
          }
          
          if (matchingWords > 0) {
            const partialConfidence = Math.min(80, (matchingWords / Math.max(titleWords.length, patternWords.length)) * 80);
            if (partialConfidence > confidence) {
              confidence = partialConfidence;
              matchType = 'partial';
            }
          }
        }
      }
      
      if (confidence === 100) break; // Arrêter si on a trouvé une correspondance parfaite
    }
    
    if (confidence > 0) {
      console.log(`✅ [GAME-MAPPING] Match found: ${matchType}, confidence: ${confidence}`);
    }
    
    // Garder le meilleur match
    if (confidence > bestMatch.confidence) {
      const gameData = mapping.games as GameWithDuration;
      bestMatch = {
        gameId: mapping.game_id,
        gameName: gameData?.name || null,
        averageDuration: gameData?.average_duration || null,
        confidence
      };
      
      console.log(`🏆 [GAME-MAPPING] New best match: ${gameData?.name} (confidence: ${confidence})`);
    }
  }

  if (bestMatch.confidence > 0) {
    console.log(`✅ [GAME-MAPPING] Final match found:`, bestMatch);
  } else {
    console.log(`❌ [GAME-MAPPING] No match found for: ${eventTitle}`);
  }

  return bestMatch;
};

// Fonction pour invalider le cache
export const invalidateMappingsCache = () => {
  mappingsCache = null;
  cacheTimestamp = 0;
  console.log('🔄 [GAME-MAPPING] Cache invalidated');
};
