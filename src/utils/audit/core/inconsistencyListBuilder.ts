/**
 * Construit la liste complète des incohérences détectées lors de l'audit
 */
export const buildInconsistencyList = (
  events: any[], 
  duplicateAssignments: any[], 
  scheduleConflicts: any[], 
  gmStats: any[], 
  gameMasters: any[],
  missingCompetencies: any[]
) => {
  const inconsistentEventDetails: any[] = [];

  // Ajouter les doublons
  duplicateAssignments.forEach(duplicate => {
    inconsistentEventDetails.push({
      id: duplicate.eventId,
      title: duplicate.eventTitle,
      date: duplicate.eventDate,
      issue: `DOUBLON: Événement assigné à ${duplicate.assignedGMs.length} GMs différents (${duplicate.assignedGMs.map(gm => gm.name).join(', ')})`,
      assigned_gm_id: duplicate.assignedGMs[0]?.id,
      assigned_gm_name: duplicate.assignedGMs[0]?.name,
      status: 'assigned'
    });
  });
  
  // Ajouter les conflits d'horaires
  scheduleConflicts.forEach(conflict => {
    const gmName = gameMasters?.find(gm => gm.id === conflict.gmId)?.name || 'GM inconnu';
    inconsistentEventDetails.push({
      id: conflict.eventId,
      title: conflict.eventTitle,
      date: conflict.eventDate,
      issue: `Conflit d'horaire: GM ${gmName} assigné simultanément à ${conflict.conflictingEvents.length} autre(s) événement(s)`,
      assigned_gm_id: conflict.gmId,
      assigned_gm_name: gmName,
      status: 'assigned'
    });
  });

  // Ajouter les compétences manquantes
  missingCompetencies.forEach(missing => {
    inconsistentEventDetails.push({
      id: missing.eventId,
      title: missing.eventTitle,
      date: missing.eventDate,
      issue: `COMPÉTENCE MANQUANTE: ${missing.gmName} assigné à "${missing.gameName}" sans compétence déclarée`,
      assigned_gm_id: missing.gmId,
      assigned_gm_name: missing.gmName,
      status: 'assigned'
    });
  });

  // Ajouter les conflits de disponibilité
  gmStats.forEach(gm => {
    gm.conflictingAssignments.forEach(conflict => {
      const alreadyExists = inconsistentEventDetails.some(existing => 
        existing.id === conflict.eventId && existing.issue.includes(conflict.issue)
      );
      
      if (!alreadyExists) {
        inconsistentEventDetails.push({
          id: conflict.eventId,
          title: conflict.eventTitle,
          date: conflict.eventDate,
          issue: `GM ${gm.gmName}: ${conflict.issue}`,
          assigned_gm_id: gm.gmId,
          assigned_gm_name: gm.gmName,
          status: 'assigned'
        });
      }
    });
  });

  return inconsistentEventDetails;
};