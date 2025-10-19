
import { supabase } from '@/integrations/supabase/client';
import { AuditResult } from './auditTypes';

export const fixAssignmentInconsistencies = async (): Promise<AuditResult[]> => {
  console.log('🔧 [INCONSISTENCY-FIXER] Starting assignment inconsistency fixes...');
  
  const results: AuditResult[] = [];

  try {
    // 1. Corriger les événements avec GM assigné mais statut pending
    await fixEventsWithGMButPending(results);

    // 2. Corriger les événements avec statut assigned mais sans GM
    await fixEventsAssignedWithoutGM(results);

    // 3. Corriger les valeurs is_assigned incohérentes
    await fixInconsistentFlags(results);

    // 4. Nettoyer les événements passés non traités
    await cleanupPastEvents(results);

    console.log('✅ [INCONSISTENCY-FIXER] Assignment inconsistency fixes completed:', results);
    return results;

  } catch (error) {
    console.error('💥 [INCONSISTENCY-FIXER] Error in inconsistency fixer:', error);
    return [{
      section: 'Corrections',
      status: 'error',
      message: 'Erreur lors des corrections d\'incohérences',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }];
  }
};

const fixEventsWithGMButPending = async (results: AuditResult[]) => {
  const { data: inconsistentPending, error: selectPendingError } = await supabase
    .from('activities')
    .select('*')
    .not('assigned_gm_id', 'is', null)
    .eq('status', 'pending');

  if (selectPendingError) {
    results.push({
      section: 'Corrections',
      status: 'error',
      message: 'Erreur lors de la récupération des événements pending avec GM',
      details: selectPendingError.message
    });
  } else if (inconsistentPending && inconsistentPending.length > 0) {
    const { error: updatePendingError } = await supabase
      .from('activities')
      .update({ 
        status: 'assigned',
        is_assigned: true,
        updated_at: new Date().toISOString()
      })
      .not('assigned_gm_id', 'is', null)
      .eq('status', 'pending');

    if (updatePendingError) {
      results.push({
        section: 'Corrections',
        status: 'error',
        message: 'Erreur lors de la correction des statuts pending',
        details: updatePendingError.message
      });
    } else {
      results.push({
        section: 'Corrections',
        status: 'success',
        message: `${inconsistentPending.length} événement(s) corrigé(s)`,
        details: 'Statuts mis à jour : GM assigné → status = assigned'
      });
    }
  }
};

const fixEventsAssignedWithoutGM = async (results: AuditResult[]) => {
  const { data: inconsistentAssigned, error: selectAssignedError } = await supabase
    .from('activities')
    .select('*')
    .is('assigned_gm_id', null)
    .eq('status', 'assigned');

  if (selectAssignedError) {
    results.push({
      section: 'Corrections',
      status: 'error',
      message: 'Erreur lors de la récupération des événements assigned sans GM',
      details: selectAssignedError.message
    });
  } else if (inconsistentAssigned && inconsistentAssigned.length > 0) {
    const { error: updateAssignedError } = await supabase
      .from('activities')
      .update({ 
        status: 'pending',
        is_assigned: false,
        assignment_date: null,
        assignment_score: null,
        updated_at: new Date().toISOString()
      })
      .is('assigned_gm_id', null)
      .eq('status', 'assigned');

    if (updateAssignedError) {
      results.push({
        section: 'Corrections',
        status: 'error',
        message: 'Erreur lors de la correction des statuts assigned',
        details: updateAssignedError.message
      });
    } else {
      results.push({
        section: 'Corrections',
        status: 'success',
        message: `${inconsistentAssigned.length} événement(s) corrigé(s)`,
        details: 'Statuts mis à jour : aucun GM → status = pending'
      });

      // Nettoyer les enregistrements d'assignation orphelins
      await supabase
        .from('event_assignments')
        .delete()
        .in('activity_id', inconsistentAssigned.map(e => e.id));
    }
  }
};

const fixInconsistentFlags = async (results: AuditResult[]) => {
  const { data: inconsistentFlags, error: selectFlagsError } = await supabase
    .from('activities')
    .select('*')
    .or('and(assigned_gm_id.not.is.null,is_assigned.is.false),and(assigned_gm_id.is.null,is_assigned.is.true)');

  if (selectFlagsError) {
    results.push({
      section: 'Corrections',
      status: 'error',
      message: 'Erreur lors de la récupération des drapeaux incohérents',
      details: selectFlagsError.message
    });
  } else if (inconsistentFlags && inconsistentFlags.length > 0) {
    // Corriger les drapeaux is_assigned
    for (const event of inconsistentFlags) {
      const correctFlag = event.assigned_gm_id !== null;
      
      const { error: updateFlagError } = await supabase
        .from('activities')
        .update({ 
          is_assigned: correctFlag,
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id);

      if (updateFlagError) {
        results.push({
          section: 'Corrections',
          status: 'error',
          message: `Erreur lors de la correction du drapeau pour ${event.title}`,
          details: updateFlagError.message
        });
      }
    }

    results.push({
      section: 'Corrections',
      status: 'success',
      message: `${inconsistentFlags.length} drapeau(x) is_assigned corrigé(s)`,
      details: 'Cohérence restored between assigned_gm_id and is_assigned'
    });
  }
};

const cleanupPastEvents = async (results: AuditResult[]) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const { data: pastEvents, error: selectPastError } = await supabase
    .from('activities')
    .select('*')
    .lt('date', yesterdayStr)
    .in('status', ['pending', 'assigned']);

  if (selectPastError) {
    results.push({
      section: 'Corrections',
      status: 'error',
      message: 'Erreur lors de la récupération des événements passés',
      details: selectPastError.message
    });
  } else if (pastEvents && pastEvents.length > 0) {
    const { error: updatePastError } = await supabase
      .from('activities')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .lt('date', yesterdayStr)
      .in('status', ['pending', 'assigned']);

    if (updatePastError) {
      results.push({
        section: 'Corrections',
        status: 'error',
        message: 'Erreur lors du nettoyage des événements passés',
        details: updatePastError.message
      });
    } else {
      results.push({
        section: 'Corrections',
        status: 'success',
        message: `${pastEvents.length} événement(s) passé(s) marqué(s) comme terminé(s)`,
        details: 'Événements antérieurs à hier → status = completed'
      });
    }
  }
};
