import { AssignmentAuditResult } from '../auditTypes';
import { analyzeEvents } from '../eventAnalyzer';
import { detectScheduleConflicts } from '../scheduleConflictDetector';
import { detectDuplicateAssignments, analyzeGMStatsWithDuplicates } from './duplicateDetector';
import { detectMissingCompetencies } from '../competencyChecker';
import { buildInconsistencyList } from './inconsistencyListBuilder';
import { generateProblemTypes } from './problemTypeGenerator';

/**
 * Construit le résultat complet de l'audit d'assignation
 */
export const buildAuditResult = async (
  events: any[], 
  gameMasters: any[], 
  availabilities: any[], 
  competencies: any[], 
  mappings: any[]
): Promise<AssignmentAuditResult> => {
  // Analyser les événements avec la logique corrigée
  const { 
    totalEvents, 
    assignedEvents,
    assignedAssignedCount,
    assignedConfirmedCount, 
    pendingEvents, 
    pendingPastEvents, 
    pendingUpcomingEvents, 
    unassignedEvents,
    upcomingNoGmPendingCount,
    upcomingNoGmAssignedStatusCount,
    pastNoGmCount
  } = analyzeEvents(events);
  
  // Détecter les doublons d'assignation
  const duplicateAssignments = detectDuplicateAssignments(events);
  
  // Détecter les conflits d'horaires (considérer assigned et confirmed)
  const assignedEventsList = events?.filter(e => e.assigned_gm_id && (e.status === 'assigned' || e.status === 'confirmed')) || [];
  const scheduleConflicts = detectScheduleConflicts(assignedEventsList);
  
  // Détecter les compétences manquantes
  const missingCompetencies = detectMissingCompetencies(assignedEventsList, competencies, mappings);
  console.log(`🎯 [ASSIGNMENT-AUDIT] ${missingCompetencies.length} assignation(s) sans compétence déclarée détectée(s)`);
  
  // Analyser les statistiques par GM avec doublons
  const gmStats = analyzeGMStatsWithDuplicates(gameMasters, events, availabilities, duplicateAssignments);

  // Construire la liste des incohérences (avec les compétences manquantes)
  const inconsistentEventDetails = buildInconsistencyList(
    events, 
    duplicateAssignments, 
    scheduleConflicts, 
    gmStats, 
    gameMasters,
    missingCompetencies
  );

  // Générer les types de problèmes détectés (avec les compétences manquantes)
  const problemTypes = generateProblemTypes(
    events, 
    scheduleConflicts, 
    duplicateAssignments, 
    gmStats,
    missingCompetencies
  );

  const auditResult: AssignmentAuditResult = {
    totalEvents,
    assignedEvents,
    assignedAssignedCount,
    assignedConfirmedCount,
    pendingEvents,
    pendingPastEvents,
    pendingUpcomingEvents,
    unassignedEvents,
    upcomingNoGmPendingCount,
    upcomingNoGmAssignedStatusCount,
    pastNoGmCount,
    inconsistentEvents: inconsistentEventDetails.length,
    inconsistentEventDetails,
    gmStats,
    issues: problemTypes
  };

  console.log('✅ [ASSIGNMENT-AUDIT] Comprehensive audit completed:', auditResult);
  return auditResult;
};