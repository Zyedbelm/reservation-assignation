// Service de mapping des jeux pour l'edge function Make Webhook
// Adaptation de unifiedGameMappingService.ts pour Deno avec accès direct à Supabase

interface GameMatch {
  gameId: string | null;
  gameName: string | null;
  averageDuration: number | null;
  confidence: number;
}

interface EventGameMapping {
  id: string;
  event_name_pattern: string;
  game_id: string;
  is_active: boolean;
  games: {
    name: string;
    category: string | null;
    average_duration: number | null;
  } | null;
}

interface MappingWithVariants extends EventGameMapping {
  normalizedPattern: string;
  patternVariants: string[];
}

/**
 * Normalise le texte en supprimant les accents, la casse et les caractères spéciaux
 */
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^a-z0-9]/g, ' ') // Remplace les caractères spéciaux par des espaces
    .replace(/\s+/g, ' ') // Normalise les espaces multiples
    .trim();
};

/**
 * Crée des variantes d'un titre pour améliorer le matching
 */
const createTitleVariants = (title: string): string[] => {
  const normalized = normalizeText(title);
  const variants = [normalized];
  
  // Séparer en mots
  const words = normalized.split(' ');
  
  // Variante sans les mots courts (< 3 caractères)
  const significantWords = words.filter(word => word.length > 2);
  if (significantWords.length !== words.length) {
    variants.push(significantWords.join(' '));
  }
  
  // Variante avec seulement les premiers mots
  if (significantWords.length > 1) {
    variants.push(significantWords.slice(0, -1).join(' '));
  }
  
  // Variante avec le premier mot seulement
  if (significantWords.length > 0) {
    variants.push(significantWords[0]);
  }
  
  return [...new Set(variants)]; // Supprimer les doublons
};

// Cache simple pour les mappings
let mappingsCache: MappingWithVariants[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Récupère les mappings événement-jeu depuis Supabase avec cache
 */
const getMappings = async (supabaseClient: any): Promise<MappingWithVariants[]> => {
  const now = Date.now();
  
  // Vérifier si le cache est valide
  if (mappingsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return mappingsCache;
  }

  try {
    const { data, error } = await supabaseClient
      .from('event_game_mappings')
      .select(`
        id,
        event_name_pattern,
        game_id,
        is_active,
        games (
          name,
          category,
          average_duration
        )
      `)
      .eq('is_active', true);

    if (error) throw error;

    // Préparer les mappings avec variantes normalisées
    mappingsCache = (data || []).map((mapping: EventGameMapping) => ({
      ...mapping,
      normalizedPattern: normalizeText(mapping.event_name_pattern),
      patternVariants: createTitleVariants(mapping.event_name_pattern)
    }));

    cacheTimestamp = now;
    console.log(`✅ Loaded ${mappingsCache.length} game mappings from database`);
    
    return mappingsCache;
  } catch (error) {
    console.error('❌ Error fetching game mappings:', error);
    return [];
  }
};

/**
 * Trouve le jeu correspondant le mieux à un titre d'événement
 * Retourne le jeu avec le score de confiance le plus élevé
 */
export const findMatchingGame = async (
  eventTitle: string, 
  supabaseClient: any
): Promise<GameMatch> => {
  if (!eventTitle) {
    return { gameId: null, gameName: null, averageDuration: null, confidence: 0 };
  }

  const mappings = await getMappings(supabaseClient);
  const titleVariants = createTitleVariants(eventTitle);

  let bestMatch: GameMatch = { 
    gameId: null, 
    gameName: null, 
    averageDuration: null, 
    confidence: 0 
  };

  // Parcourir tous les mappings pour trouver le meilleur match
  for (const mapping of mappings) {
    let confidence = 0;
    
    // Tester toutes les variantes du titre avec toutes les variantes du pattern
    for (const titleVariant of titleVariants) {
      for (const patternVariant of mapping.patternVariants) {
        // Match exact = confiance maximale
        if (titleVariant === patternVariant) {
          confidence = Math.max(confidence, 100);
          break;
        } 
        // Titre contient le pattern = très bonne confiance
        else if (titleVariant.includes(patternVariant)) {
          confidence = Math.max(confidence, 95);
        } 
        // Pattern contient le titre = bonne confiance
        else if (patternVariant.includes(titleVariant)) {
          confidence = Math.max(confidence, 90);
        }
        // Mots en commun = confiance moyenne
        else {
          const titleWords = new Set(titleVariant.split(' '));
          const patternWords = patternVariant.split(' ');
          const commonWords = patternWords.filter(word => titleWords.has(word));
          if (commonWords.length > 0) {
            const ratio = commonWords.length / patternWords.length;
            confidence = Math.max(confidence, ratio * 85);
          }
        }
      }
      if (confidence === 100) break; // Match parfait trouvé
    }
    
    // Si ce mapping a une meilleure confiance, le garder
    if (confidence > bestMatch.confidence) {
      const gameData = mapping.games;
      bestMatch = {
        gameId: mapping.game_id,
        gameName: gameData?.name || null,
        averageDuration: gameData?.average_duration || null,
        confidence: Math.round(confidence)
      };
    }
  }

  return bestMatch;
};

/**
 * Invalide le cache des mappings (à utiliser après modifications)
 */
export const invalidateMappingsCache = (): void => {
  mappingsCache = null;
  cacheTimestamp = 0;
  console.log('🔄 Game mappings cache invalidated');
};
