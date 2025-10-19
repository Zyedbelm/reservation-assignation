
import { GameMaster } from '@/hooks/useGameMasters';
import { GMCompetency } from '@/hooks/useGMCompetencies';
import { EventGameMapping } from '@/hooks/useEventGameMappings';
import { Availability } from '@/hooks/useAvailabilities';
import { findMatchingGame } from './unifiedGameMappingService';
import { checkGMAvailabilityConflicts } from './assignmentValidation';

export interface EligibleGM {
  gm: GameMaster;
  competencyLevel: number;
  weight: number;
  availableSlots: string[];
  hasSpecificCompetency: boolean;
}

// Fonction pour vérifier la compatibilité des créneaux avec amélioration de logs
const isTimeSlotCompatible = (availableSlots: string[], eventStart: string, eventEnd: string): boolean => {
  console.log(`⏰ [TIME-CHECK] Vérification créneaux pour ${eventStart}-${eventEnd}`);
  console.log(`📅 [TIME-CHECK] Créneaux disponibles: [${availableSlots.join(', ')}]`);
  
  if (!availableSlots || availableSlots.length === 0) {
    console.log(`❌ [TIME-CHECK] Aucun créneau disponible`);
    return false;
  }

  // Vérifier les créneaux d'indisponibilité
  if (availableSlots.includes('indisponible-toute-la-journee')) {
    console.log(`❌ [TIME-CHECK] GM indisponible toute la journée`);
    return false;
  }

  // Cas spécial : "toute-la-journee" accepte tout
  if (availableSlots.includes('toute-la-journee')) {
    console.log(`✅ [TIME-CHECK] Créneau "toute-la-journee" - Compatible`);
    return true;
  }

  // Vérification des créneaux horaires spécifiques
  const eventStartMin = timeToMinutes(eventStart);
  const eventEndMin = timeToMinutes(eventEnd);
  console.log(`🕐 [TIME-CHECK] Événement: ${eventStartMin}-${eventEndMin} minutes`);

  for (const slot of availableSlots) {
    if (slot.includes('-')) {
      try {
        const [slotStart, slotEnd] = slot.split('-');
        const slotStartMin = timeToMinutes(slotStart);
        const slotEndMin = timeToMinutes(slotEnd);
        
        console.log(`🕐 [TIME-CHECK] Test créneau: ${slot} (${slotStartMin}-${slotEndMin} minutes)`);
        
        // L'événement doit s'intégrer complètement dans le créneau
        if (slotStartMin <= eventStartMin && slotEndMin >= eventEndMin) {
          console.log(`✅ [TIME-CHECK] Événement s'intègre parfaitement dans le créneau: ${slot}`);
          return true;
        } else {
          console.log(`❌ [TIME-CHECK] Créneau ${slot} incompatible: ne couvre pas entièrement l'événement`);
        }
      } catch (error) {
        console.warn(`⚠️ [TIME-CHECK] Erreur vérification créneau ${slot}:`, error);
        continue;
      }
    }
  }
  
  console.log(`❌ [TIME-CHECK] Aucun créneau compatible trouvé`);
  return false;
};

const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Fonction pour évaluer l'éligibilité d'un GM avec logs détaillés
export const evaluateGMEligibility = async (
  gm: GameMaster,
  eventDate: string,
  eventStartTime: string,
  eventEndTime: string,
  gameId: string | null,
  availabilities: Availability[],
  competencies: GMCompetency[]
): Promise<EligibleGM | null> => {
  console.log(`\n🔍 [GM-ELIGIBILITY] ====== Évaluation ${gm.name} ======`);

  // 1. Vérifier que le GM est actif
  if (!gm.is_active) {
    console.log(`❌ [GM-ELIGIBILITY] ${gm.name} - GM inactif`);
    return null;
  }
  console.log(`✅ [GM-ELIGIBILITY] ${gm.name} - GM actif`);

  // 2. Vérifier que le GM est disponible dans le système
  if (!gm.is_available) {
    console.log(`❌ [GM-ELIGIBILITY] ${gm.name} - GM marqué comme indisponible dans le système`);
    return null;
  }
  console.log(`✅ [GM-ELIGIBILITY] ${gm.name} - GM disponible dans le système`);

  // 3. Vérifier les disponibilités déclarées
  const gmAvailability = availabilities.find(av => av.gm_id === gm.id && av.date === eventDate);
  if (!gmAvailability) {
    console.log(`❌ [GM-ELIGIBILITY] ${gm.name} - Aucune disponibilité déclarée pour le ${eventDate}`);
    return null;
  }
  console.log(`✅ [GM-ELIGIBILITY] ${gm.name} - Disponibilité déclarée trouvée`);

  // 4. Vérifier la compatibilité des créneaux
  if (!isTimeSlotCompatible(gmAvailability.time_slots, eventStartTime, eventEndTime)) {
    console.log(`❌ [GM-ELIGIBILITY] ${gm.name} - Créneaux horaires incompatibles`);
    return null;
  }
  console.log(`✅ [GM-ELIGIBILITY] ${gm.name} - Créneaux horaires compatibles`);

  // 5. Vérifier les conflits d'assignation existants
  console.log(`🔍 [GM-ELIGIBILITY] ${gm.name} - Vérification des conflits d'assignation...`);
  const conflictCheck = await checkGMAvailabilityConflicts(
    gm.id,
    eventDate,
    eventStartTime,
    eventEndTime
  );

  if (conflictCheck.hasConflict) {
    console.log(`❌ [GM-ELIGIBILITY] ${gm.name} - Conflit d'assignation détecté:`, conflictCheck.conflicts);
    return null;
  }
  console.log(`✅ [GM-ELIGIBILITY] ${gm.name} - Aucun conflit d'assignation`);

  // 6. Vérifier les compétences si un jeu spécifique est requis
  let competencyLevel = 1; // Niveau par défaut
  let hasSpecificCompetency = false;

  if (gameId) {
    console.log(`🎮 [GM-ELIGIBILITY] ${gm.name} - Vérification compétence pour le jeu ID: ${gameId}`);
    const gmCompetency = competencies.find(comp => comp.gm_id === gm.id && comp.game_id === gameId);
    if (gmCompetency && gmCompetency.competency_level >= 1) {
      competencyLevel = gmCompetency.competency_level;
      hasSpecificCompetency = true;
      console.log(`✅ [GM-ELIGIBILITY] ${gm.name} - Compétence niveau ${competencyLevel} validée`);
    } else {
      console.log(`❌ [GM-ELIGIBILITY] ${gm.name} - Compétence insuffisante (niveau requis: 1, trouvé: ${gmCompetency?.competency_level || 0})`);
      return null;
    }
  } else {
    console.log(`✅ [GM-ELIGIBILITY] ${gm.name} - Événement général, aucune compétence spécifique requise`);
  }

  console.log(`🎉 [GM-ELIGIBILITY] ${gm.name} - ÉLIGIBLE ! (Niveau: ${competencyLevel}, Poids: ${competencyLevel})`);

  return {
    gm,
    competencyLevel,
    weight: competencyLevel, // Le poids = niveau de compétence
    availableSlots: gmAvailability.time_slots,
    hasSpecificCompetency
  };
};

// Fonction de sélection aléatoire pondérée améliorée
export const selectGMByWeightedRandom = (eligibleGMs: EligibleGM[]): EligibleGM => {
  console.log(`\n🎯 [WEIGHTED-SELECTION] ====== Sélection Aléatoire Pondérée ======`);
  console.log(`👥 [WEIGHTED-SELECTION] ${eligibleGMs.length} GM(s) éligible(s) pour la sélection`);
  
  if (eligibleGMs.length === 0) {
    throw new Error('Aucun GM éligible pour la sélection');
  }

  if (eligibleGMs.length === 1) {
    console.log(`✅ [WEIGHTED-SELECTION] Un seul GM éligible: ${eligibleGMs[0].gm.name}`);
    return eligibleGMs[0];
  }

  // Calculer le poids total
  const totalWeight = eligibleGMs.reduce((sum, gm) => sum + gm.weight, 0);
  console.log(`📊 [WEIGHTED-SELECTION] Poids total: ${totalWeight}`);

  // Afficher les candidats avec leurs poids et probabilités
  console.log(`📋 [WEIGHTED-SELECTION] Candidats et leurs chances:`);
  eligibleGMs.forEach(candidate => {
    const percentage = ((candidate.weight / totalWeight) * 100).toFixed(1);
    console.log(`👤 [WEIGHTED-SELECTION] ${candidate.gm.name}: Poids ${candidate.weight}/${totalWeight} (${percentage}% de chance)`);
  });

  // Générer un nombre aléatoire
  const random = Math.random() * totalWeight;
  console.log(`🎲 [WEIGHTED-SELECTION] Nombre aléatoire généré: ${random.toFixed(3)} / ${totalWeight}`);

  // Sélectionner le GM
  let cumulativeWeight = 0;
  for (const candidate of eligibleGMs) {
    cumulativeWeight += candidate.weight;
    console.log(`🔍 [WEIGHTED-SELECTION] Test ${candidate.gm.name}: seuil cumulé = ${cumulativeWeight}`);
    if (random <= cumulativeWeight) {
      console.log(`🏆 [WEIGHTED-SELECTION] GM SÉLECTIONNÉ: ${candidate.gm.name} (poids: ${candidate.weight})`);
      return candidate;
    }
  }

  // Failsafe : retourner le dernier GM si quelque chose se passe mal
  console.log(`⚠️ [WEIGHTED-SELECTION] Failsafe activé: sélection du dernier GM`);
  return eligibleGMs[eligibleGMs.length - 1];
};

// Fonction principale d'assignation simplifiée avec logs détaillés
export const getSimplifiedAssignment = async (
  gameMasters: GameMaster[],
  eventTitle: string,
  eventDate: string,
  eventStartTime: string,
  eventEndTime: string,
  mappings: EventGameMapping[],
  competencies: GMCompetency[],
  availabilities: Availability[]
): Promise<{ selectedGM: EligibleGM | null; eligibleGMs: EligibleGM[]; gameMatch: any }> => {
  console.log('\n🚀 [SIMPLIFIED-ASSIGNMENT] ========================================');
  console.log('🚀 [SIMPLIFIED-ASSIGNMENT] DÉMARRAGE NOUVELLE LOGIQUE SIMPLIFIÉE');
  console.log('🚀 [SIMPLIFIED-ASSIGNMENT] ========================================');
  console.log(`📋 [SIMPLIFIED-ASSIGNMENT] Événement: "${eventTitle}"`);
  console.log(`📅 [SIMPLIFIED-ASSIGNMENT] Date: ${eventDate}`);
  console.log(`⏰ [SIMPLIFIED-ASSIGNMENT] Horaire: ${eventStartTime} - ${eventEndTime}`);

  // 1. Identifier le jeu correspondant
  console.log('\n🎮 [SIMPLIFIED-ASSIGNMENT] === ÉTAPE 1: IDENTIFICATION DU JEU ===');
  const gameMatch = await findMatchingGame(eventTitle);
  console.log(`🎮 [SIMPLIFIED-ASSIGNMENT] Correspondance trouvée:`, gameMatch);

  // 2. Évaluer tous les GMs pour l'éligibilité
  console.log('\n👥 [SIMPLIFIED-ASSIGNMENT] === ÉTAPE 2: ÉVALUATION DES GMs ===');
  console.log(`👥 [SIMPLIFIED-ASSIGNMENT] ${gameMasters.length} GM(s) à évaluer`);
  
  const eligibilityPromises = gameMasters.map(gm => 
    evaluateGMEligibility(
      gm,
      eventDate,
      eventStartTime,
      eventEndTime,
      gameMatch.gameId,
      availabilities,
      competencies
    )
  );

  const eligibilityResults = await Promise.all(eligibilityPromises);
  const eligibleGMs = eligibilityResults.filter((result): result is EligibleGM => result !== null);

  console.log('\n📊 [SIMPLIFIED-ASSIGNMENT] === ÉTAPE 3: RÉSULTATS ÉLIGIBILITÉ ===');
  console.log(`👥 [SIMPLIFIED-ASSIGNMENT] GMs évalués: ${gameMasters.length}`);
  console.log(`✅ [SIMPLIFIED-ASSIGNMENT] GMs éligibles: ${eligibleGMs.length}`);
  console.log(`❌ [SIMPLIFIED-ASSIGNMENT] GMs non éligibles: ${gameMasters.length - eligibleGMs.length}`);

  if (eligibleGMs.length === 0) {
    console.log(`❌ [SIMPLIFIED-ASSIGNMENT] ÉCHEC: Aucun GM éligible trouvé`);
    console.log('🚀 [SIMPLIFIED-ASSIGNMENT] ========================================');
    return { selectedGM: null, eligibleGMs: [], gameMatch };
  }

  // 3. Sélection aléatoire pondérée
  console.log('\n🎯 [SIMPLIFIED-ASSIGNMENT] === ÉTAPE 4: SÉLECTION FINALE ===');
  const selectedGM = selectGMByWeightedRandom(eligibleGMs);

  console.log('\n🎉 [SIMPLIFIED-ASSIGNMENT] === ASSIGNATION TERMINÉE ===');
  console.log(`🏆 [SIMPLIFIED-ASSIGNMENT] GM sélectionné: ${selectedGM.gm.name}`);
  console.log(`🎯 [SIMPLIFIED-ASSIGNMENT] Niveau de compétence: ${selectedGM.competencyLevel}`);
  console.log(`⚖️ [SIMPLIFIED-ASSIGNMENT] Poids: ${selectedGM.weight}`);
  console.log(`📊 [SIMPLIFIED-ASSIGNMENT] Éligibles totaux: ${eligibleGMs.length}`);
  console.log('🚀 [SIMPLIFIED-ASSIGNMENT] ========================================');

  return { selectedGM, eligibleGMs, gameMatch };
};
