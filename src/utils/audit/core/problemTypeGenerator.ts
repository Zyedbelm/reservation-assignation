/**
 * Génère la liste des types de problèmes détectés lors de l'audit
 */
export const generateProblemTypes = (
  events: any[], 
  scheduleConflicts: any[], 
  duplicateAssignments: any[], 
  gmStats: any[],
  missingCompetencies: any[]
): string[] => {
  const problemTypes: string[] = [];

  if (scheduleConflicts.length > 0) {
    problemTypes.push(`${scheduleConflicts.length} événement(s) avec conflits d'horaires`);
  }

  if (duplicateAssignments.length > 0) {
    problemTypes.push(`${duplicateAssignments.length} événement(s) avec assignations en doublon`);
  }

  // Compétences manquantes
  if (missingCompetencies.length > 0) {
    problemTypes.push(`${missingCompetencies.length} assignation(s) sans compétence déclarée`);
  }

  const totalAvailabilityConflicts = gmStats.reduce((sum, gm) => 
    sum + gm.conflictingAssignments.filter(c => !c.issue.includes('DOUBLON')).length, 0
  );
  
  if (totalAvailabilityConflicts > 0) {
    problemTypes.push(`${totalAvailabilityConflicts} assignation(s) en conflit avec les disponibilités`);
  }

  return problemTypes;
};