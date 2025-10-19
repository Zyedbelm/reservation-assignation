import { supabase } from '@/integrations/supabase/client';
import { AuditResult } from './auditTypes';

/**
 * Corrige les événements qui ont des statuts incohérents avec leurs assignations
 * Met à jour les événements où assigned_gm_id et is_assigned ne correspondent pas
 */
export const fixInconsistentStatuses = async (): Promise<AuditResult[]> => {
  const results: AuditResult[] = [];
  
  try {
    console.log('🔍 [INCONSISTENCY-FIX] Début de la correction des statuts incohérents...');
    
    // Corriger les événements qui ont assigned_gm_id = null mais is_assigned = true
    const { data: unassignedButMarked, error: error1 } = await supabase
      .from('activities')
      .update({ 
        is_assigned: false,
        status: 'pending'
      })
      .is('assigned_gm_id', null)
      .eq('is_assigned', true)
      .select('id, title, date');

    if (error1) {
      console.error('❌ [INCONSISTENCY-FIX] Erreur lors de la correction (null->false):', error1);
      results.push({
        section: 'Status Consistency',
        status: 'error',
        message: `Erreur lors de la correction des événements marqués assignés sans GM: ${error1.message}`
      });
    } else {
      const count1 = unassignedButMarked?.length || 0;
      console.log(`✅ [INCONSISTENCY-FIX] Corrigé ${count1} événements marqués assignés sans GM`);
      results.push({
        section: 'Status Consistency',
        status: count1 > 0 ? 'warning' : 'success',
        message: `${count1} événements corrigés: marqués non-assignés car sans GM`,
        details: count1 > 0 ? `Événements corrigés: ${unassignedButMarked?.map(e => `${e.title} (${e.date})`).join(', ')}` : undefined
      });
    }

    // Corriger les événements qui ont assigned_gm_id non null mais is_assigned = false
    const { data: assignedButNotMarked, error: error2 } = await supabase
      .from('activities')
      .update({ 
        is_assigned: true,
        status: 'assigned'
      })
      .not('assigned_gm_id', 'is', null)
      .eq('is_assigned', false)
      .select('id, title, date, assigned_gm_id');

    if (error2) {
      console.error('❌ [INCONSISTENCY-FIX] Erreur lors de la correction (not null->true):', error2);
      results.push({
        section: 'Status Consistency',
        status: 'error',
        message: `Erreur lors de la correction des événements assignés mais non marqués: ${error2.message}`
      });
    } else {
      const count2 = assignedButNotMarked?.length || 0;
      console.log(`✅ [INCONSISTENCY-FIX] Corrigé ${count2} événements assignés mais non marqués`);
      results.push({
        section: 'Status Consistency',
        status: count2 > 0 ? 'warning' : 'success',
        message: `${count2} événements corrigés: marqués assignés car avec GM`,
        details: count2 > 0 ? `Événements corrigés: ${assignedButNotMarked?.map(e => `${e.title} (${e.date})`).join(', ')}` : undefined
      });
    }

    console.log('✅ [INCONSISTENCY-FIX] Correction des statuts incohérents terminée');

  } catch (error) {
    console.error('💥 [INCONSISTENCY-FIX] Erreur inattendue:', error);
    results.push({
      section: 'Status Consistency',
      status: 'error',
      message: `Erreur inattendue lors de la correction: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    });
  }

  return results;
};

/**
 * Diagnostique les incohérences de statut sans les corriger
 */
export const diagnoseInconsistentStatuses = async (): Promise<AuditResult[]> => {
  const results: AuditResult[] = [];
  
  try {
    console.log('🔍 [INCONSISTENCY-DIAG] Diagnostic des statuts incohérents...');
    
    // Identifier les événements avec assigned_gm_id = null mais is_assigned = true
    const { data: unassignedButMarked, error: error1 } = await supabase
      .from('activities')
      .select('id, title, date, assigned_gm_id, is_assigned, status')
      .is('assigned_gm_id', null)
      .eq('is_assigned', true);

    if (error1) {
      results.push({
        section: 'Status Consistency Diagnostic',
        status: 'error',
        message: `Erreur lors du diagnostic: ${error1.message}`
      });
    } else {
      const count1 = unassignedButMarked?.length || 0;
      results.push({
        section: 'Status Consistency Diagnostic',
        status: count1 > 0 ? 'warning' : 'success',
        message: `${count1} événements marqués assignés sans GM`,
        details: count1 > 0 ? `Événements: ${unassignedButMarked?.map(e => `${e.title} (${e.date})`).join(', ')}` : undefined
      });
    }

    // Identifier les événements avec assigned_gm_id non null mais is_assigned = false
    const { data: assignedButNotMarked, error: error2 } = await supabase
      .from('activities')
      .select('id, title, date, assigned_gm_id, is_assigned, status')
      .not('assigned_gm_id', 'is', null)
      .eq('is_assigned', false);

    if (error2) {
      results.push({
        section: 'Status Consistency Diagnostic',
        status: 'error',
        message: `Erreur lors du diagnostic: ${error2.message}`
      });
    } else {
      const count2 = assignedButNotMarked?.length || 0;
      results.push({
        section: 'Status Consistency Diagnostic',
        status: count2 > 0 ? 'warning' : 'success',
        message: `${count2} événements assignés mais non marqués`,
        details: count2 > 0 ? `Événements: ${assignedButNotMarked?.map(e => `${e.title} (${e.date})`).join(', ')}` : undefined
      });
    }

  } catch (error) {
    console.error('💥 [INCONSISTENCY-DIAG] Erreur inattendue:', error);
    results.push({
      section: 'Status Consistency Diagnostic',
      status: 'error',
      message: `Erreur inattendue lors du diagnostic: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    });
  }

  return results;
};