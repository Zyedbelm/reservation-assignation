
import { supabase } from '@/integrations/supabase/client';

export const checkAndHandleAvailabilityChanges = async (
  gmId: string,
  date: string,
  removedSlots: string[],
  queryClient?: any
) => {
  console.log(`🔍 [AVAILABILITY CHANGE] Starting check for GM ${gmId} on ${date}`);
  console.log(`🗑️ [AVAILABILITY CHANGE] Removed slots: [${removedSlots.join(', ')}]`);
  
  try {
    // Récupérer les événements assignés à ce GM pour cette date
    const { data: assignedEvents, error: eventsError } = await supabase
      .from('activities')
      .select('*')
      .eq('assigned_gm_id', gmId)
      .eq('date', date)
      .not('assigned_gm_id', 'is', null);

    if (eventsError) {
      console.error('❌ [AVAILABILITY CHANGE] Error fetching assigned events:', eventsError);
      return;
    }

    if (!assignedEvents || assignedEvents.length === 0) {
      console.log('✅ [AVAILABILITY CHANGE] No assigned events found for this GM on this date');
      return;
    }

    console.log(`📋 [AVAILABILITY CHANGE] Found ${assignedEvents.length} assigned events to check`);

    let unassignedCount = 0;
    let keptCount = 0;

    // Vérifier chaque événement assigné
    for (const event of assignedEvents) {
      const eventTimeSlot = `${event.start_time.substring(0, 5)}-${event.end_time.substring(0, 5)}`;
      console.log(`🎯 [AVAILABILITY CHANGE] Checking event: ${event.title} (${eventTimeSlot})`);

      // Vérifier si l'événement est maintenant en conflit
      const isConflicted = isEventConflicted(eventTimeSlot, removedSlots);
      
      if (isConflicted) {
        console.log(`⚠️ [AVAILABILITY CHANGE] Event ${event.title} is now conflicted, unassigning...`);
        
        // Désassigner l'événement
        await unassignEvent(event.id, event);
        unassignedCount++;
        
        console.log(`✅ [AVAILABILITY CHANGE] Event ${event.title} has been unassigned and moved to pending`);
      } else {
        console.log(`✅ [AVAILABILITY CHANGE] Event ${event.title} is still compatible`);
        keptCount++;
      }
    }

    console.log(`📊 [AVAILABILITY CHANGE] Summary: ${unassignedCount} events unassigned, ${keptCount} events kept`);

    // Invalider les queries React Query pour synchroniser les données
    if (queryClient && unassignedCount > 0) {
      console.log('🔄 [AVAILABILITY CHANGE] Invalidating React Query caches...');
      await queryClient.invalidateQueries({ queryKey: ['activities'] });
      await queryClient.invalidateQueries({ queryKey: ['all-events'] });
      await queryClient.invalidateQueries({ queryKey: ['unassigned-events'] });
    }

    // Déclencher l'auto-assignation pour les événements désassignés
    if (unassignedCount > 0) {
      console.log(`🔄 [AVAILABILITY CHANGE] Triggering auto-assignment for ${unassignedCount} unassigned events...`);
      
      try {
        const { data: autoAssignResult, error: autoAssignError } = await supabase.functions.invoke(
          'auto-assign-gms',
          { body: { trigger: 'availability-change', date, removedSlots } }
        );

        if (autoAssignError) {
          console.error('❌ [AVAILABILITY CHANGE] Auto-assignment failed:', autoAssignError);
        } else {
          console.log('✅ [AVAILABILITY CHANGE] Auto-assignment triggered successfully:', autoAssignResult);
          
          // Invalider à nouveau les queries après l'auto-assignation
          if (queryClient) {
            setTimeout(async () => {
              await queryClient.invalidateQueries({ queryKey: ['activities'] });
              await queryClient.invalidateQueries({ queryKey: ['all-events'] });
              await queryClient.invalidateQueries({ queryKey: ['unassigned-events'] });
            }, 1000);
          }
        }
      } catch (error) {
        console.error('💥 [AVAILABILITY CHANGE] Error triggering auto-assignment:', error);
      }
    }

  } catch (error) {
    console.error('💥 [AVAILABILITY CHANGE] Error in checkAndHandleAvailabilityChanges:', error);
  }
};

const isEventConflicted = (eventTimeSlot: string, removedSlots: string[]): boolean => {
  console.log(`🔍 [CONFLICT CHECK] Checking if event ${eventTimeSlot} conflicts with removed slots: [${removedSlots.join(', ')}]`);
  
  const [eventStart, eventEnd] = eventTimeSlot.split('-');
  
  // Si "toute-la-journee" était disponible et a été supprimée, tous les événements sont conflictés
  if (removedSlots.includes('toute-la-journee')) {
    console.log(`❌ [CONFLICT CHECK] "toute-la-journee" was removed - event is conflicted`);
    return true;
  }
  
  // Vérifier si le créneau exact de l'événement a été supprimé
  if (removedSlots.includes(eventTimeSlot)) {
    console.log(`❌ [CONFLICT CHECK] Exact slot ${eventTimeSlot} was removed - event is conflicted`);
    return true;
  }
  
  // Vérifier si un créneau plus large qui contenait cet événement a été supprimé
  for (const removedSlot of removedSlots) {
    if (removedSlot.includes('-')) {
      const [slotStart, slotEnd] = removedSlot.split('-');
      
      // Convertir en minutes pour comparaison
      const eventStartMin = timeToMinutes(eventStart);
      const eventEndMin = timeToMinutes(eventEnd);
      const slotStartMin = timeToMinutes(slotStart);
      const slotEndMin = timeToMinutes(slotEnd);
      
      // Si l'événement était contenu dans ce créneau supprimé
      if (slotStartMin <= eventStartMin && slotEndMin >= eventEndMin) {
        console.log(`❌ [CONFLICT CHECK] Event was contained in removed slot ${removedSlot} - event is conflicted`);
        return true;
      }
    }
  }
  
  console.log(`✅ [CONFLICT CHECK] Event ${eventTimeSlot} is not conflicted`);
  return false;
};

const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const unassignEvent = async (eventId: string, eventData?: any) => {
  try {
    console.log(`🔄 [UNASSIGN] Starting unassignment of event ${eventId}...`);
    
    // Récupérer les informations de l'événement avant désassignation pour la notification
    const { data: eventInfo, error: fetchError } = await supabase
      .from('activities')
      .select('*, assigned_gm_id')
      .eq('id', eventId)
      .single();

    if (fetchError) {
      console.error('❌ [UNASSIGN] Error fetching event info:', fetchError);
    }

    // Supprimer les assignations existantes (éviter les doublons)
    const { error: deleteError } = await supabase
      .from('event_assignments')
      .delete()
      .eq('activity_id', eventId);

    if (deleteError) {
      console.error('❌ [UNASSIGN] Error deleting assignments:', deleteError);
    } else {
      console.log('✅ [UNASSIGN] Event assignments deleted successfully');
    }

    // Mettre à jour l'activité
    const { error: updateError } = await supabase
      .from('activities')
      .update({
        assigned_gm_id: null,
        is_assigned: false,
        assignment_date: null,
        assignment_score: null,
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId);

    if (updateError) {
      console.error('❌ [UNASSIGN] Error updating activity:', updateError);
    } else {
      console.log('✅ [UNASSIGN] Event unassigned successfully and status set to pending');
    }

    // Envoyer notification de désassignation si on a les infos nécessaires
    if (eventInfo?.assigned_gm_id) {
      console.log('📧 [UNASSIGN] Sending unassignment notification...');
      
      try {
        const { error: notificationError } = await supabase.functions.invoke(
          'send-event-change-notification',
          {
            body: {
              gmId: eventInfo.assigned_gm_id,
              changeType: 'unassigned',
              oldEvent: eventInfo,
              newEvent: { ...eventInfo, assigned_gm_id: null, status: 'pending' },
              reason: 'availability_change'
            }
          }
        );

        if (notificationError) {
          console.error('❌ [UNASSIGN] Error sending notification:', notificationError);
        } else {
          console.log('✅ [UNASSIGN] Notification sent successfully');
        }
      } catch (error) {
        console.error('💥 [UNASSIGN] Error calling notification function:', error);
      }
    }

  } catch (error) {
    console.error('💥 [UNASSIGN] Error in unassignEvent:', error);
  }
};
