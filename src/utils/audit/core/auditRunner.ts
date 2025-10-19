import { supabase } from '@/integrations/supabase/client';
import { AssignmentAuditResult } from '../auditTypes';
import { fixInconsistentStatuses } from '../eventAnalyzer';
import { buildAuditResult } from './auditResultBuilder';

/**
 * Exécute un audit complet des assignations
 */
export const performAssignmentAudit = async (dateRange?: { start: string; end: string }): Promise<AssignmentAuditResult> => {
  console.log('🔍 [ASSIGNMENT-AUDIT] Starting comprehensive assignment audit...', dateRange);
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Construire la requête pour les événements (exclure cancelled/deleted comme sur le calendrier)
    let eventsQuery = supabase
      .from('activities')
      .select(`
        *,
        game_masters:assigned_gm_id(name)
      `)
      .not('status', 'in', '("cancelled","deleted")');

    if (dateRange) {
      eventsQuery = eventsQuery
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);
    } else {
      eventsQuery = eventsQuery.gte('date', today);
    }

    const { data: initialEvents, error: eventsError } = await eventsQuery;

    if (eventsError) {
      console.error('❌ [ASSIGNMENT-AUDIT] Error fetching events:', eventsError);
      throw eventsError;
    }

    console.log('📋 [ASSIGNMENT-AUDIT] Événements récupérés:', initialEvents?.length || 0);
    
    // Analyser les événements sans correction automatique pour garder les statuts incohérents
    const events = initialEvents;

    // Récupérer les GMs, leurs disponibilités, compétences et mappings de jeux
    const { data: gameMasters, error: gmError } = await supabase
      .from('game_masters')
      .select('*');

    const { data: availabilities, error: availError } = await supabase
      .from('gm_availabilities')
      .select('*');

    const { data: competencies, error: compError } = await supabase
      .from('gm_game_competencies')
      .select('*');

    const { data: mappings, error: mappingError } = await supabase
      .from('event_game_mappings')
      .select(`
        event_name_pattern,
        game_id,
        games (id, name)
      `)
      .eq('is_active', true);

    if (gmError || availError || compError || mappingError) {
      console.error('❌ [ASSIGNMENT-AUDIT] Error fetching data:', { gmError, availError, compError, mappingError });
      throw gmError || availError || compError || mappingError;
    }

    return await buildAuditResult(events, gameMasters, availabilities, competencies, mappings);

  } catch (error) {
    console.error('💥 [ASSIGNMENT-AUDIT] Error in assignment audit:', error);
    throw error;
  }
};