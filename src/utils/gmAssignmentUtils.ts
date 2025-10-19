
import { GameMaster } from '@/hooks/useGameMasters';
import { GMCompetency } from '@/hooks/useGMCompetencies';
import { EventGameMapping } from '@/hooks/useEventGameMappings';
import { Availability } from '@/hooks/useAvailabilities';
import { getSimplifiedAssignment, EligibleGM } from './simplifiedAssignmentService';

export interface AssignmentCandidate {
  gm: GameMaster;
  hasCompetency: boolean;
  competencyLevel?: number;
  isAvailable: boolean;
  score: number;
  gameMatch?: {
    gameId: string | null;
    gameName: string | null;
    confidence: number;
  };
  availabilityDetails?: {
    hasExactMatch: boolean;
    hasFlexibleMatch: boolean;
    matchingSlots: string[];
  };
}

// NOUVELLE FONCTION SIMPLIFIÉE - Utilise la nouvelle logique
export const getGMAssignmentCandidates = async (
  gameMasters: GameMaster[],
  eventTitle: string,
  eventDate: string,
  eventStartTime: string,
  eventEndTime: string,
  mappings: EventGameMapping[],
  competencies: GMCompetency[],
  availabilities: Availability[]
): Promise<AssignmentCandidate[]> => {
  console.log('🔄 [GM-ASSIGNMENT] Utilisation de la NOUVELLE logique simplifiée');
  
  // Utiliser la nouvelle logique simplifiée
  const { eligibleGMs, gameMatch } = await getSimplifiedAssignment(
    gameMasters,
    eventTitle,
    eventDate,
    eventStartTime,
    eventEndTime,
    mappings,
    competencies,
    availabilities
  );

  // Convertir les EligibleGM en AssignmentCandidate pour compatibilité
  const candidates: AssignmentCandidate[] = eligibleGMs.map((eligibleGM: EligibleGM) => ({
    gm: eligibleGM.gm,
    hasCompetency: eligibleGM.hasSpecificCompetency,
    competencyLevel: eligibleGM.competencyLevel,
    isAvailable: true, // Tous les GMs éligibles sont disponibles par définition
    score: eligibleGM.weight, // Le score devient le poids
    gameMatch,
    availabilityDetails: {
      hasExactMatch: false,
      hasFlexibleMatch: true,
      matchingSlots: eligibleGM.availableSlots
    }
  }));

  console.log(`✅ [GM-ASSIGNMENT] ${candidates.length} candidat(s) éligible(s) retourné(s)`);
  
  return candidates;
};

// Fonction de sélection du meilleur GM - NOUVELLE LOGIQUE
export const getBestGMCandidate = async (
  gameMasters: GameMaster[],
  eventTitle: string,
  eventDate: string,
  eventStartTime: string,
  eventEndTime: string,
  mappings: EventGameMapping[],
  competencies: GMCompetency[],
  availabilities: Availability[]
): Promise<{ selectedGM: GameMaster | null; selectionDetails: any }> => {
  console.log('🎯 [BEST-GM] Sélection du meilleur GM avec la nouvelle logique');
  
  const { selectedGM, eligibleGMs, gameMatch } = await getSimplifiedAssignment(
    gameMasters,
    eventTitle,
    eventDate,
    eventStartTime,
    eventEndTime,
    mappings,
    competencies,
    availabilities
  );

  return {
    selectedGM: selectedGM?.gm || null,
    selectionDetails: {
      gameMatch,
      eligibleCount: eligibleGMs.length,
      selectedGMDetails: selectedGM ? {
        name: selectedGM.gm.name,
        competencyLevel: selectedGM.competencyLevel,
        weight: selectedGM.weight,
        hasSpecificCompetency: selectedGM.hasSpecificCompetency
      } : null,
      selectionMethod: 'weighted-random',
      allEligibleGMs: eligibleGMs.map(gm => ({
        name: gm.gm.name,
        weight: gm.weight,
        competencyLevel: gm.competencyLevel
      }))
    }
  };
};

export const getEligibleGMs = (candidates: AssignmentCandidate[]): AssignmentCandidate[] => {
  // Avec la nouvelle logique, tous les candidats retournés sont déjà éligibles
  console.log(`✅ [ELIGIBLE-GMS] Tous les ${candidates.length} candidat(s) sont éligibles`);
  return candidates;
};

// Fonction utilitaire pour la compatibilité
const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};
