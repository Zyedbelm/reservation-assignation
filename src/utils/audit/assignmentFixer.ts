
import { supabase } from '@/integrations/supabase/client';
import { detectMissingCompetencies } from './competencyChecker';

export interface FixAssignmentResult {
  fixedCount: number;
  unassignedEvents: string[];
  errors: string[];
  message: string;
}

/**
 * Corrige automatiquement les assignations problématiques en désassignant les GMs
 * qui n'ont pas les compétences requises
 */
export const fixMissingCompetencyAssignments = async (): Promise<FixAssignmentResult> => {
  console.log('🔧 [ASSIGNMENT-FIXER] Démarrage de la correction des assignations sans compétence...');
  
  try {
    const today = new Date().toISOString().split('T')[0];

    // Récupérer tous les événements assignés futurs
    const { data: events, error: eventsError } = await supabase
      .from('activities')
      .select(`
        *,
        game_masters:assigned_gm_id(name, email)
      `)
      .eq('status', 'assigned')
      .not('assigned_gm_id', 'is', null)
      .gte('date', today);

    if (eventsError) {
      throw new Error(`Erreur lors de la récupération des événements: ${eventsError.message}`);
    }

    // Récupérer les données nécessaires pour l'analyse
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

    if (compError || mappingError) {
      throw new Error(`Erreur lors de la récupération des données: ${compError?.message || mappingError?.message}`);
    }

    // Détecter les compétences manquantes
    const missingCompetencies = detectMissingCompetencies(events || [], competencies || [], mappings || []);
    
    console.log(`🎯 [ASSIGNMENT-FIXER] ${missingCompetencies.length} assignation(s) sans compétence détectée(s)`);

    if (missingCompetencies.length === 0) {
      return {
        fixedCount: 0,
        unassignedEvents: [],
        errors: [],
        message: 'Aucune assignation problématique détectée'
      };
    }

    let fixedCount = 0;
    const unassignedEvents: string[] = [];
    const errors: string[] = [];

    // Corriger chaque assignation problématique
    for (const missing of missingCompetencies) {
      try {
        console.log(`🔧 [ASSIGNMENT-FIXER] Désassignation de ${missing.gmName} pour "${missing.eventTitle}" (jeu: ${missing.gameName})`);
        
        // Récupérer les infos complètes du GM avant désassignation
        const { data: gmInfo, error: gmError } = await supabase
          .from('game_masters')
          .select('id, name, email')
          .eq('id', missing.gmId)
          .single();

        if (gmError || !gmInfo) {
          console.error(`❌ [ASSIGNMENT-FIXER] Impossible de récupérer les infos GM ${missing.gmId}:`, gmError);
          errors.push(`${missing.eventTitle}: Impossible de récupérer les infos GM`);
          continue;
        }

        // Récupérer les infos complètes de l'événement avant désassignation
        const { data: eventInfo, error: eventError } = await supabase
          .from('activities')
          .select('*')
          .eq('id', missing.eventId)
          .single();

        if (eventError || !eventInfo) {
          console.error(`❌ [ASSIGNMENT-FIXER] Impossible de récupérer les infos événement ${missing.eventId}:`, eventError);
          errors.push(`${missing.eventTitle}: Impossible de récupérer les infos événement`);
          continue;
        }

        console.log(`📋 [ASSIGNMENT-FIXER] Infos GM: ${gmInfo.name} (${gmInfo.email})`);
        console.log(`📋 [ASSIGNMENT-FIXER] Infos événement: ${eventInfo.title} le ${eventInfo.date}`);
        
        // Désassigner l'événement
        const { error: updateError } = await supabase
          .from('activities')
          .update({
            assigned_gm_id: null,
            is_assigned: false,
            status: 'pending',
            assignment_date: null,
            assignment_score: null
          })
          .eq('id', missing.eventId);

        if (updateError) {
          console.error(`❌ [ASSIGNMENT-FIXER] Erreur lors de la désassignation de l'événement ${missing.eventId}:`, updateError);
          errors.push(`${missing.eventTitle}: ${updateError.message}`);
          continue;
        }

        // Supprimer l'enregistrement d'assignation si il existe
        const { error: deleteError } = await supabase
          .from('event_assignments')
          .delete()
          .eq('activity_id', missing.eventId)
          .eq('gm_id', missing.gmId);

        if (deleteError) {
          console.warn(`⚠️ [ASSIGNMENT-FIXER] Impossible de supprimer l'enregistrement d'assignation pour ${missing.eventId}:`, deleteError);
        }

        // Créer une notification de désassignation automatique
        console.log(`📧 [ASSIGNMENT-FIXER] Création notification désassignation automatique pour GM ${gmInfo.name} (${gmInfo.id})`);
        
        const notificationTitle = `🤖 Désassignation automatique - ${eventInfo.title}`;
        const notificationMessage = `Vous avez été automatiquement désassigné(e) de l'événement "${eventInfo.title}" le ${eventInfo.date} car vous n'avez pas les compétences requises pour le jeu "${missing.gameName}". Cette désassignation a été effectuée par le système d'audit automatique.`;
        
        // Utiliser le service de notification amélioré
        try {
          const { data: notificationResult, error: notifError } = await supabase.functions.invoke('create-gm-notification', {
            body: {
              gmId: gmInfo.id,
              notificationType: 'unassigned',
              title: notificationTitle,
              message: notificationMessage,
              eventData: {
                ...eventInfo,
                reason: 'missing_competency',
                gameName: missing.gameName,
                autoFixed: true
              },
              eventId: eventInfo.id
            }
          });

          if (notifError) {
            console.error(`❌ [ASSIGNMENT-FIXER] Erreur lors de la création de notification via fonction edge:`, notifError);
            
            // Fallback: créer directement la notification dans la base
            console.log(`🔄 [ASSIGNMENT-FIXER] Fallback - création directe de la notification...`);
            const { error: directNotifError } = await supabase
              .from('gm_notifications')
              .insert({
                gm_id: gmInfo.id,
                event_id: eventInfo.id,
                notification_type: 'unassigned',
                title: notificationTitle,
                message: notificationMessage,
                event_data: {
                  ...eventInfo,
                  reason: 'missing_competency',
                  gameName: missing.gameName,
                  autoFixed: true
                },
                is_read: false,
                email_sent: false
              });

            if (directNotifError) {
              console.error(`❌ [ASSIGNMENT-FIXER] Erreur fallback notification pour GM ${gmInfo.id}:`, directNotifError);
            } else {
              console.log(`✅ [ASSIGNMENT-FIXER] Notification fallback créée pour ${gmInfo.name}`);
            }
          } else {
            console.log(`✅ [ASSIGNMENT-FIXER] Notification de désassignation automatique créée pour ${gmInfo.name}`);
          }
        } catch (notificationError) {
          console.error(`❌ [ASSIGNMENT-FIXER] Exception lors de la création de notification:`, notificationError);
        }

        fixedCount++;
        unassignedEvents.push(`${missing.eventTitle} (${missing.eventDate}) - GM ${missing.gmName} désassigné car aucune compétence pour "${missing.gameName}"`);
        
        console.log(`✅ [ASSIGNMENT-FIXER] Événement "${missing.eventTitle}" désassigné avec succès`);

      } catch (error) {
        console.error(`❌ [ASSIGNMENT-FIXER] Erreur lors de la correction de l'événement ${missing.eventId}:`, error);
        errors.push(`${missing.eventTitle}: ${error.message}`);
      }
    }

    const message = `${fixedCount} assignation(s) corrigée(s) sur ${missingCompetencies.length} détectée(s)`;
    console.log(`🎉 [ASSIGNMENT-FIXER] Correction terminée: ${message}`);

    return {
      fixedCount,
      unassignedEvents,
      errors,
      message
    };

  } catch (error) {
    console.error('💥 [ASSIGNMENT-FIXER] Erreur durant la correction:', error);
    return {
      fixedCount: 0,
      unassignedEvents: [],
      errors: [error.message],
      message: 'Erreur durant la correction des assignations'
    };
  }
};

/**
 * Crée des notifications pour informer les administrateurs des corrections effectuées
 */
export const notifyAdminsOfAssignmentFixes = async (fixResult: FixAssignmentResult) => {
  if (fixResult.fixedCount === 0) return;

  try {
    // Récupérer tous les profils admin pour créer des notifications
    const { data: adminProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('gm_id')
      .eq('role', 'admin')
      .not('gm_id', 'is', null);

    if (profileError || !adminProfiles || adminProfiles.length === 0) {
      console.warn('⚠️ [ASSIGNMENT-FIXER] Aucun admin trouvé pour les notifications');
      return;
    }

    // Créer une notification pour chaque admin
    for (const admin of adminProfiles) {
      const notificationMessage = `${fixResult.fixedCount} assignation(s) automatiquement corrigée(s) car les GMs n'avaient pas les compétences requises.\n\nÉvénements désassignés:\n${fixResult.unassignedEvents.join('\n')}`;

      await supabase
        .from('gm_notifications')
        .insert({
          gm_id: admin.gm_id,
          notification_type: 'assignment_fix',
          title: 'Corrections automatiques d\'assignations',
          message: notificationMessage,
          is_read: false,
          email_sent: false
        });
    }

    console.log(`📧 [ASSIGNMENT-FIXER] Notifications envoyées à ${adminProfiles.length} admin(s)`);

  } catch (error) {
    console.error('❌ [ASSIGNMENT-FIXER] Erreur lors de l\'envoi des notifications:', error);
  }
};
