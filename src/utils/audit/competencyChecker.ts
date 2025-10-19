import { MissingCompetencyAssignment } from './auditTypes';

/**
 * Détecte les assignations où un GM n'a pas de compétence déclarée pour le jeu requis
 */
export const detectMissingCompetencies = (
  events: any[], 
  competencies: any[], 
  mappings: any[]
): MissingCompetencyAssignment[] => {
  console.log('🔍 [COMPETENCY-CHECKER] Début vérification compétences...');
  console.log('🔍 [COMPETENCY-CHECKER] Events assignés:', events?.length || 0);
  console.log('🔍 [COMPETENCY-CHECKER] Compétences disponibles:', competencies?.length || 0);
  console.log('🔍 [COMPETENCY-CHECKER] Mappings disponibles:', mappings?.length || 0);
  
  const missingCompetencies: MissingCompetencyAssignment[] = [];

  for (const event of events) {
    if (!event.assigned_gm_id || event.status !== 'assigned') continue;
    
    console.log(`🔍 [COMPETENCY-CHECKER] Vérification événement "${event.title}" (GM: ${event.assigned_gm_id})`);

    // Trouver le jeu correspondant à cet événement
    const eventGame = findGameForEvent(event, mappings);
    console.log(`🔍 [COMPETENCY-CHECKER] Jeu trouvé pour "${event.title}":`, eventGame);
    if (!eventGame) {
      console.log(`⚠️ [COMPETENCY-CHECKER] Aucun jeu trouvé pour "${event.title}" - ignoré`);
      continue;
    }

    // Vérifier si le GM assigné a une compétence pour ce jeu
    const gmCompetency = competencies?.find(comp => 
      comp.gm_id === event.assigned_gm_id && 
      comp.game_id === eventGame.id
    );
    
    console.log(`🔍 [COMPETENCY-CHECKER] Compétence GM ${event.assigned_gm_id} pour jeu ${eventGame.id}:`, gmCompetency);

    if (!gmCompetency) {
      console.log(`❌ [COMPETENCY-CHECKER] PROBLÈME DÉTECTÉ: GM ${event.assigned_gm_id} n'a pas de compétence pour "${eventGame.name}"`);
      missingCompetencies.push({
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: `${event.start_time}-${event.end_time}`,
        gmId: event.assigned_gm_id,
        gmName: event.game_masters?.name || 'GM inconnu',
        gameId: eventGame.id,
        gameName: eventGame.name,
        issue: `Aucune compétence déclarée pour le jeu "${eventGame.name}"`
      });
    }
  }

  console.log(`🎯 [COMPETENCY-CHECKER] Résultat final: ${missingCompetencies.length} compétence(s) manquante(s) détectée(s)`);
  return missingCompetencies;
};

/**
 * Trouve le jeu correspondant à un événement basé sur les mappings
 */
const findGameForEvent = (event: any, mappings: any[]) => {
  if (!mappings || !event.title) return null;

  for (const mapping of mappings) {
    if (!mapping.event_name_pattern || !mapping.games) continue;

    // Vérifier si le titre de l'événement correspond au pattern
    const pattern = mapping.event_name_pattern.toLowerCase();
    const eventTitle = event.title.toLowerCase();

    if (eventTitle.includes(pattern) || pattern.includes(eventTitle)) {
      return {
        id: mapping.game_id,
        name: mapping.games.name
      };
    }
  }

  return null;
};

/**
 * Vérifie si un GM a la compétence requise pour un jeu spécifique
 */
export const hasCompetencyForGame = (
  gmId: string, 
  gameId: string, 
  competencies: any[]
): boolean => {
  const competency = competencies?.find(comp => 
    comp.gm_id === gmId && comp.game_id === gameId
  );
  
  return !!competency && competency.competency_level > 0;
};

/**
 * Obtient le niveau de compétence d'un GM pour un jeu
 */
export const getCompetencyLevel = (
  gmId: string, 
  gameId: string, 
  competencies: any[]
): number => {
  const competency = competencies?.find(comp => 
    comp.gm_id === gmId && comp.game_id === gameId
  );
  
  return competency?.competency_level || 0;
};