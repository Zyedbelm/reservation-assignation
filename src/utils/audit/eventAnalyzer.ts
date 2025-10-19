
import { AssignmentAuditResult } from './auditTypes';

export const analyzeEvents = (events: any[]): Pick<AssignmentAuditResult, 'totalEvents' | 'assignedEvents' | 'assignedAssignedCount' | 'assignedConfirmedCount' | 'pendingEvents' | 'pendingPastEvents' | 'pendingUpcomingEvents' | 'unassignedEvents' | 'upcomingNoGmPendingCount' | 'upcomingNoGmAssignedStatusCount' | 'pastNoGmCount'> => {
  const totalEvents = events?.length || 0;
  const today = new Date().toISOString().split('T')[0];
  
  // Compter les événements avec GM assigné par type de statut
  const withGmAssignedCount = events?.filter(e => e.assigned_gm_id && String(e.status ?? '').toLowerCase() === 'assigned').length || 0;
  const withGmConfirmedCount = events?.filter(e => e.assigned_gm_id && String(e.status ?? '').toLowerCase() === 'confirmed').length || 0;
  
  // Un événement est vraiment assigné s'il a un GM ET le statut assigned ou confirmed
  const assignedEvents = withGmAssignedCount + withGmConfirmedCount;
  
  // Événements non assignés (status = 'pending' ET pas de GM assigné ET futurs)
  const unassignedEvents = events?.filter(e => 
    !e.assigned_gm_id && String(e.status ?? '').toLowerCase() === 'pending' && e.date >= today
  ).length || 0;

  // Détail des événements sans GM assigné
  const upcomingNoGmPendingCount = events?.filter(e => 
    !e.assigned_gm_id && String(e.status ?? '').toLowerCase() === 'pending' && e.date >= today
  ).length || 0;
  
  // Statuts incorrects : assigned/confirmed/is_assigned mais sans GM (futurs)
  const upcomingNoGmAssignedStatusCount = events?.filter(e => {
    if (e.assigned_gm_id || e.date < today) return false;
    const status = String(e.status ?? '').toLowerCase();
    const isAssignedLike = status === 'assigned' || status === 'confirmed' || e.is_assigned === true;
    return isAssignedLike;
  }).length || 0;
  
  const pastNoGmCount = events?.filter(e => 
    !e.assigned_gm_id && e.date < today
  ).length || 0;
  
  // Séparer les événements en attente entre passés et à venir
  const allPendingEvents = events?.filter(e => !e.assigned_gm_id) || [];
  const pendingPastEvents = allPendingEvents.filter(e => e.date < today).length;
  const pendingUpcomingEvents = allPendingEvents.filter(e => e.date >= today).length;
  const pendingEvents = allPendingEvents.length;
  
  // Logging pour vérification
  const eventsWithoutGmButAssignedLike = events?.filter(e => {
    if (e.assigned_gm_id || e.date < today) return false;
    const status = String(e.status ?? '').toLowerCase();
    return status === 'assigned' || status === 'confirmed' || e.is_assigned === true;
  }).length || 0;

  console.log('📊 [EVENT-ANALYZER] Comptage des événements (événements visibles sur calendrier):', {
    totalEvents,
    assignedEvents,
    withGmAssignedCount,
    withGmConfirmedCount,
    pendingEvents,
    pendingPastEvents,
    pendingUpcomingEvents,
    unassignedEvents,
    upcomingNoGmPendingCount,
    upcomingNoGmAssignedStatusCount,
    eventsWithGmButPending: events?.filter(e => e.assigned_gm_id && String(e.status ?? '').toLowerCase() === 'pending').length || 0,
    eventsWithoutGmButAssignedLike,
    'Vérification total': `${assignedEvents} + ${upcomingNoGmPendingCount} + ${upcomingNoGmAssignedStatusCount} = ${assignedEvents + upcomingNoGmPendingCount + upcomingNoGmAssignedStatusCount}`,
    'Note': 'Événements cancelled/deleted exclus (alignement avec calendrier)'
  });
  
  return {
    totalEvents,
    assignedEvents,
    assignedAssignedCount: withGmAssignedCount,
    assignedConfirmedCount: withGmConfirmedCount,
    pendingEvents,
    pendingPastEvents,
    pendingUpcomingEvents,
    unassignedEvents,
    upcomingNoGmPendingCount,
    upcomingNoGmAssignedStatusCount,
    pastNoGmCount
  };
};

export const detectInconsistencies = (events: any[]): AssignmentAuditResult['inconsistentEventDetails'] => {
  const inconsistentEventDetails: AssignmentAuditResult['inconsistentEventDetails'] = [];
  
  // 1. Événements avec GM assigné mais status pending (insensible à la casse)
  const eventsWithGmButPending = events?.filter(e => e.assigned_gm_id && String(e.status ?? '').toLowerCase() === 'pending') || [];
  eventsWithGmButPending.forEach(e => {
    console.log('🔍 [INCONSISTENCY] GM assigné mais statut pending:', e.title);
    inconsistentEventDetails.push({
      id: e.id,
      title: e.title,
      date: e.date,
      issue: 'GM assigné mais statut en attente',
      assigned_gm_id: e.assigned_gm_id,
      status: e.status
    });
  });

  // Note: On ne considère plus les événements sans GM avec statut "assigned" comme une incohérence
  // car ils seront automatiquement corrigés pour avoir le statut "pending"

  return inconsistentEventDetails;
};

// Nouvelle fonction pour corriger automatiquement les statuts incohérents
export const fixInconsistentStatuses = async (events: any[], supabase: any) => {
  // Trouver les événements sans GM mais avec statut assigned/confirmed ou is_assigned
  const eventsToFix = events?.filter(e => {
    if (e.assigned_gm_id) return false;
    const status = String(e.status ?? '').toLowerCase();
    return status === 'assigned' || status === 'confirmed' || e.is_assigned === true;
  }) || [];
  
  if (eventsToFix.length > 0) {
    console.log('🔧 [STATUS-FIX] Correction automatique des statuts incohérents:', eventsToFix.length, 'événement(s)');
    
    // Mettre à jour le statut en "pending" pour ces événements
    for (const event of eventsToFix) {
      const { error } = await supabase
        .from('activities')
        .update({ 
          status: 'pending',
          is_assigned: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id);
      
      if (error) {
        console.error('❌ [STATUS-FIX] Erreur lors de la correction du statut pour:', event.title, error);
      } else {
        console.log('✅ [STATUS-FIX] Statut corrigé pour:', event.title, '- maintenant en "pending"');
      }
    }
    
    return eventsToFix.length;
  }
  
  return 0;
};
