
import { supabase } from '@/integrations/supabase/client';

export interface AuditResult {
  section: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string;
  action?: string;
}

export const performSystemAudit = async (): Promise<AuditResult[]> => {
  const results: AuditResult[] = [];
  
  console.log('🔍 [AUDIT] Démarrage de l\'audit système complet...');

  // 1. Audit des Game Masters
  try {
    const { data: gameMasters, error } = await supabase
      .from('game_masters')
      .select('*');

    if (error) throw error;

    const activeGMs = gameMasters?.filter(gm => gm.is_active) || [];
    const availableGMs = gameMasters?.filter(gm => gm.is_available) || [];

    results.push({
      section: 'Game Masters',
      status: activeGMs.length > 0 ? 'success' : 'warning',
      message: `${activeGMs.length} GM(s) actif(s) sur ${gameMasters?.length || 0} total`,
      details: `${availableGMs.length} GM(s) disponible(s)`
    });

    // Vérifier les GMs sans email
    const gmsWithoutEmail = gameMasters?.filter(gm => gm.is_active && !gm.email) || [];
    if (gmsWithoutEmail.length > 0) {
      results.push({
        section: 'Game Masters',
        status: 'warning',
        message: `${gmsWithoutEmail.length} GM(s) actif(s) sans email`,
        details: 'Les notifications ne pourront pas être envoyées',
        action: 'Compléter les adresses email'
      });
    }

  } catch (error) {
    results.push({
      section: 'Game Masters',
      status: 'error',
      message: 'Erreur lors de la récupération des GMs',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }

  // 2. Audit des Disponibilités
  try {
    const { data: availabilities, error } = await supabase
      .from('gm_availabilities')
      .select('*')
      .gte('date', new Date().toISOString().split('T')[0]);

    if (error) throw error;

    const futureAvailabilities = availabilities?.length || 0;
    const indisponibilites = availabilities?.filter(av => 
      av.time_slots?.includes('indisponible-toute-la-journee')
    ) || [];

    results.push({
      section: 'Disponibilités',
      status: futureAvailabilities > 0 ? 'success' : 'warning',
      message: `${futureAvailabilities} disponibilité(s) future(s)`,
      details: `${indisponibilites.length} indisponibilité(s) déclarée(s)`
    });

  } catch (error) {
    results.push({
      section: 'Disponibilités',
      status: 'error',
      message: 'Erreur lors de la récupération des disponibilités',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }

  // 3. Audit des Événements
  try {
    const { data: activities, error } = await supabase
      .from('activities')
      .select('*')
      .gte('date', new Date().toISOString().split('T')[0]);

    if (error) throw error;

    const futureEvents = activities?.length || 0;
    const unassignedEvents = activities?.filter(act => !act.assigned_gm_id && act.status === 'pending') || [];
    const assignedEvents = activities?.filter(act => act.assigned_gm_id && act.status === 'assigned') || [];

    results.push({
      section: 'Événements',
      status: unassignedEvents.length === 0 ? 'success' : 'warning',
      message: `${futureEvents} événement(s) futur(s)`,
      details: `${assignedEvents.length} assigné(s), ${unassignedEvents.length} non assigné(s)`
    });

    if (unassignedEvents.length > 0) {
      results.push({
        section: 'Événements',
        status: 'warning',
        message: `${unassignedEvents.length} événement(s) non assigné(s)`,
        action: 'Lancer l\'auto-assignation ou assigner manuellement'
      });
    }

  } catch (error) {
    results.push({
      section: 'Événements',
      status: 'error',
      message: 'Erreur lors de la récupération des événements',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }

  // 4. Audit des Compétences
  try {
    const { data: competencies, error } = await supabase
      .from('gm_game_competencies')
      .select('*');

    if (error) throw error;

    const totalCompetencies = competencies?.length || 0;
    const highLevelCompetencies = competencies?.filter(comp => comp.competency_level >= 3) || [];

    results.push({
      section: 'Compétences',
      status: totalCompetencies > 0 ? 'success' : 'warning',
      message: `${totalCompetencies} compétence(s) enregistrée(s)`,
      details: `${highLevelCompetencies.length} compétence(s) de niveau élevé (≥3)`
    });

  } catch (error) {
    results.push({
      section: 'Compétences',
      status: 'error',
      message: 'Erreur lors de la récupération des compétences',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }

  // 5. Audit des Mappings Jeux
  try {
    const { data: mappings, error } = await supabase
      .from('event_game_mappings')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    const activeMappings = mappings?.length || 0;

    results.push({
      section: 'Mappings Jeux',
      status: activeMappings > 0 ? 'success' : 'warning',
      message: `${activeMappings} mapping(s) actif(s)`,
      details: 'Correspondances événements ↔ jeux'
    });

  } catch (error) {
    results.push({
      section: 'Mappings Jeux',
      status: 'error',
      message: 'Erreur lors de la récupération des mappings',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }

  // 6. Audit des Conflits d'Assignation
  try {
    const { data: conflicts, error } = await supabase
      .from('activities')
      .select('assigned_gm_id, date, start_time, end_time, title')
      .not('assigned_gm_id', 'is', null)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('assigned_gm_id')
      .order('date')
      .order('start_time');

    if (error) throw error;

    // Détecter les conflits
    const conflictPairs: Array<{ gm: string, event1: any, event2: any }> = [];
    if (conflicts) {
      for (let i = 0; i < conflicts.length - 1; i++) {
        const current = conflicts[i];
        const next = conflicts[i + 1];
        
        if (current.assigned_gm_id === next.assigned_gm_id && current.date === next.date) {
          const currentEnd = new Date(`${current.date}T${current.end_time}`);
          const nextStart = new Date(`${next.date}T${next.start_time}`);
          
          if (currentEnd > nextStart) {
            conflictPairs.push({
              gm: current.assigned_gm_id,
              event1: current,
              event2: next
            });
          }
        }
      }
    }

    results.push({
      section: 'Conflits',
      status: conflictPairs.length === 0 ? 'success' : 'error',
      message: conflictPairs.length === 0 ? 'Aucun conflit détecté' : `${conflictPairs.length} conflit(s) détecté(s)`,
      details: conflictPairs.length > 0 ? 'Assignations simultanées détectées' : 'Planification cohérente',
      action: conflictPairs.length > 0 ? 'Résoudre les conflits d\'assignation' : undefined
    });

  } catch (error) {
    results.push({
      section: 'Conflits',
      status: 'error',
      message: 'Erreur lors de la vérification des conflits',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }

  console.log('✅ [AUDIT] Audit système terminé:', results);
  return results;
};

export const fixCommonIssues = async (): Promise<AuditResult[]> => {
  const results: AuditResult[] = [];
  
  console.log('🔧 [AUDIT-FIX] Démarrage des corrections automatiques...');

  // 1. Nettoyer les événements avec des statuts incohérents
  try {
    const { data: inconsistentEvents, error: selectError } = await supabase
      .from('activities')
      .select('*')
      .not('assigned_gm_id', 'is', null)
      .eq('status', 'pending');

    if (selectError) throw selectError;

    if (inconsistentEvents && inconsistentEvents.length > 0) {
      const { error: updateError } = await supabase
        .from('activities')
        .update({ status: 'assigned' })
        .not('assigned_gm_id', 'is', null)
        .eq('status', 'pending');

      if (updateError) throw updateError;

      results.push({
        section: 'Corrections',
        status: 'success',
        message: `${inconsistentEvents.length} événement(s) corrigé(s)`,
        details: 'Statuts mis à jour : assigned_gm_id présent → status = assigned'
      });
    }

  } catch (error) {
    results.push({
      section: 'Corrections',
      status: 'error',
      message: 'Erreur lors de la correction des statuts',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }

  // 2. Nettoyer les événements passés non traités
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const { data: pastEvents, error: selectError } = await supabase
      .from('activities')
      .select('*')
      .lt('date', yesterdayStr)
      .in('status', ['pending', 'assigned']);

    if (selectError) throw selectError;

    if (pastEvents && pastEvents.length > 0) {
      const { error: updateError } = await supabase
        .from('activities')
        .update({ status: 'completed' })
        .lt('date', yesterdayStr)
        .in('status', ['pending', 'assigned']);

      if (updateError) throw updateError;

      results.push({
        section: 'Corrections',
        status: 'success',
        message: `${pastEvents.length} événement(s) passé(s) marqué(s) comme terminé(s)`,
        details: 'Événements antérieurs à hier → status = completed'
      });
    }

  } catch (error) {
    results.push({
      section: 'Corrections',
      status: 'error',
      message: 'Erreur lors du nettoyage des événements passés',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }

  console.log('✅ [AUDIT-FIX] Corrections automatiques terminées:', results);
  return results;
};
