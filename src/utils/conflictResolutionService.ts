
import { supabase } from '@/integrations/supabase/client';

export interface ConflictResolutionResult {
  resolvedCount: number;
  errors: string[];
  unassignedEvents: Array<{
    id: string;
    title: string;
    date: string;
    gmName: string;
    reason: string;
  }>;
}

export const resolveAssignmentConflicts = async (): Promise<ConflictResolutionResult> => {
  console.log('🔧 [CONFLICT RESOLUTION] Starting comprehensive conflict resolution...');
  
  try {
    let resolvedCount = 0;
    const errors: string[] = [];
    const unassignedEvents: Array<{
      id: string;
      title: string;
      date: string;
      gmName: string;
      reason: string;
    }> = [];

    // Récupérer tous les événements assignés avec les infos GM
    const { data: assignedEvents, error: eventsError } = await supabase
      .from('activities')
      .select(`
        *,
        game_masters:assigned_gm_id(name)
      `)
      .not('assigned_gm_id', 'is', null)
      .eq('status', 'assigned');

    if (eventsError) {
      errors.push(`Erreur lors de la récupération des événements: ${eventsError.message}`);
      return { resolvedCount, errors, unassignedEvents };
    }

    // Récupérer toutes les disponibilités
    const { data: availabilities, error: availError } = await supabase
      .from('gm_availabilities')
      .select('*');

    if (availError) {
      errors.push(`Erreur lors de la récupération des disponibilités: ${availError.message}`);
      return { resolvedCount, errors, unassignedEvents };
    }

    console.log(`📋 [CONFLICT RESOLUTION] Found ${assignedEvents?.length || 0} assigned events to check`);

    // Vérifier chaque événement assigné
    for (const event of assignedEvents || []) {
      const gmAvailability = availabilities?.find(
        av => av.gm_id === event.assigned_gm_id && av.date === event.date
      );

      let shouldUnassign = false;
      let reason = '';

      // Cas 1: Aucune disponibilité déclarée pour cette date  
      if (!gmAvailability) {
        shouldUnassign = true;
        reason = 'Aucune disponibilité déclarée';
        console.log(`⚠️ [CONFLICT RESOLUTION] Event ${event.title} - no availability declared`);
      } 
      // Cas 2: GM déclaré indisponible toute la journée (PRIORITÉ)
      else if (gmAvailability.time_slots && gmAvailability.time_slots.includes('indisponible-toute-la-journee')) {
        shouldUnassign = true;
        reason = 'GM indisponible toute la journée';
        console.log(`🚨 [CONFLICT RESOLUTION] Event ${event.title} - GM declared UNAVAILABLE all day`);
      }
      // Cas 3: Créneau non compatible avec les disponibilités 
      else {
        const isCompatible = isTimeSlotCompatible(gmAvailability.time_slots, event.start_time, event.end_time);
        if (!isCompatible) {
          shouldUnassign = true;
          reason = 'Créneau incompatible avec disponibilités';
          console.log(`⚠️ [CONFLICT RESOLUTION] Event ${event.title} - incompatible time slot`);
        }
      }

      if (shouldUnassign) {
        // Désassigner l'événement
        const { error: unassignError } = await supabase
          .from('activities')
          .update({
            assigned_gm_id: null,
            is_assigned: false,
            assignment_date: null,
            assignment_score: null,
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', event.id);

        if (unassignError) {
          errors.push(`Erreur lors de la désassignation de l'événement ${event.title}: ${unassignError.message}`);
        } else {
          // Supprimer les enregistrements d'assignation
          await supabase
            .from('event_assignments')
            .delete()
            .eq('activity_id', event.id);

          resolvedCount++;
          unassignedEvents.push({
            id: event.id,
            title: event.title,
            date: event.date,
            gmName: event.game_masters?.name || 'GM inconnu',
            reason: reason
          });

          console.log(`✅ [CONFLICT RESOLUTION] Successfully unassigned event ${event.title} - ${reason}`);
        }
      }
    }

    console.log(`🎉 [CONFLICT RESOLUTION] Resolved ${resolvedCount} conflicts with ${errors.length} errors`);
    return { resolvedCount, errors, unassignedEvents };

  } catch (error) {
    console.error('💥 [CONFLICT RESOLUTION] Error in conflict resolution:', error);
    return { 
      resolvedCount: 0, 
      errors: [error instanceof Error ? error.message : 'Erreur inconnue'], 
      unassignedEvents: [] 
    };
  }
};

// Fonction helper pour vérifier la compatibilité des créneaux
function isTimeSlotCompatible(availableSlots: string[], eventStart: string, eventEnd: string): boolean {
  // Si indisponible toute la journée, rien n'est compatible
  if (availableSlots.includes('indisponible-toute-la-journee')) {
    return false;
  }
  
  // Si disponible toute la journée, tout est compatible
  if (availableSlots.includes('toute-la-journee')) {
    return true;
  }
  
  const exactMatch = `${eventStart.substring(0, 5)}-${eventEnd.substring(0, 5)}`;
  if (availableSlots.includes(exactMatch)) {
    return true;
  }
  
  // Vérifier si l'événement peut s'intégrer dans un créneau plus large
  for (const slot of availableSlots) {
    if (slot.includes('-')) {
      const [slotStart, slotEnd] = slot.split('-');
      const slotStartMin = timeToMinutes(slotStart);
      const slotEndMin = timeToMinutes(slotEnd);
      const eventStartMin = timeToMinutes(eventStart.substring(0, 5));
      const eventEndMin = timeToMinutes(eventEnd.substring(0, 5));
      
      if (slotStartMin <= eventStartMin && slotEndMin >= eventEndMin) {
        return true;
      }
    }
  }
  
  return false;
}

function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}
