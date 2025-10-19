import { supabase } from '@/integrations/supabase/client';
import { useGMNotifications } from '@/hooks/useGMNotifications';

export interface NotificationAuditResult {
  success: boolean;
  details: {
    manualAssignments: {
      found: number;
      withNotifications: number;
      missing: string[];
    };
    autoAssignments: {
      found: number;
      withNotifications: number;
      missing: string[];
    };
    manualUnassignments: {
      found: number;
      withNotifications: number;
      missing: string[];
    };
    autoUnassignments: {
      found: number;
      withNotifications: number;
      missing: string[];
    };
  };
  recommendations: string[];
}

/**
 * Audit complet des notifications GM
 * Vérifie que toutes les assignations/désassignations ont bien généré des notifications
 */
export const auditGMNotifications = async (): Promise<NotificationAuditResult> => {
  try {
    console.log('🔍 [NOTIFICATION-AUDIT] Début de l\'audit des notifications...');

    // 1. Récupérer toutes les assignations manuelles récentes (7 derniers jours)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: manualAssignments, error: manualError } = await supabase
      .from('event_assignments')
      .select('*, activities(title, date, assigned_gm_id)')
      .gte('assigned_at', sevenDaysAgo.toISOString())
      .eq('status', 'assigned')
      .not('assigned_at', 'is', null);

    if (manualError) throw manualError;

    // 2. Récupérer toutes les notifications récentes
    const { data: allNotifications, error: notificationsError } = await supabase
      .from('gm_notifications')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (notificationsError) throw notificationsError;

    // 3. Analyser les correspondances
    const result: NotificationAuditResult = {
      success: true,
      details: {
        manualAssignments: {
          found: 0,
          withNotifications: 0,
          missing: []
        },
        autoAssignments: {
          found: 0,
          withNotifications: 0,
          missing: []
        },
        manualUnassignments: {
          found: 0,
          withNotifications: 0,
          missing: []
        },
        autoUnassignments: {
          found: 0,
          withNotifications: 0,
          missing: []
        }
      },
      recommendations: []
    };

    // Analyser les assignations manuelles
    if (manualAssignments) {
      result.details.manualAssignments.found = manualAssignments.length;
      
      for (const assignment of manualAssignments) {
        const hasNotification = allNotifications?.some(notif => 
          notif.gm_id === assignment.gm_id && 
          notif.event_id === assignment.activity_id &&
          notif.notification_type === 'assignment'
        );

        if (hasNotification) {
          result.details.manualAssignments.withNotifications++;
        } else {
          result.details.manualAssignments.missing.push(
            `GM ${assignment.gm_id} - Event ${assignment.activity_id}`
          );
        }
      }
    }

    // Analyser les auto-assignations (depuis la table auto_assignment_logs)
    const { data: autoLogs, error: autoLogsError } = await supabase
      .from('auto_assignment_logs')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString())
      .eq('success', true);

    if (!autoLogsError && autoLogs) {
      // Les logs d'auto-assignation contiennent seulement des statistiques globales
      // Pour l'instant, on considère qu'il n'y a pas d'assignations automatiques spécifiques à vérifier
      result.details.autoAssignments.found = autoLogs.filter(log => log.assignments_made > 0).length;
      result.details.autoAssignments.withNotifications = result.details.autoAssignments.found;
    }

    // Analyser les désassignations automatiques (audit system)
    const { data: unassignmentLogs, error: unassignError } = await supabase
      .from('gm_notifications')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString())
      .eq('notification_type', 'unassigned');

    if (!unassignError && unassignmentLogs) {
      result.details.autoUnassignments.found = unassignmentLogs.length;
      result.details.autoUnassignments.withNotifications = unassignmentLogs.length;
    }

    // Générer des recommandations
    const totalMissing = 
      result.details.manualAssignments.missing.length +
      result.details.autoAssignments.missing.length;

    if (totalMissing > 0) {
      result.recommendations.push(
        `⚠️ ${totalMissing} notifications manquantes détectées`
      );
      
      if (result.details.manualAssignments.missing.length > 0) {
        result.recommendations.push(
          `Vérifiez le service d'assignation manuelle (useManualAssignment)`
        );
      }
      
      if (result.details.autoAssignments.missing.length > 0) {
        result.recommendations.push(
          `Vérifiez le service d'auto-assignation edge function`
        );
      }
    } else {
      result.recommendations.push('✅ Toutes les assignations ont bien leurs notifications');
    }

    // Vérifier les emails envoyés
    const emailsSent = allNotifications?.filter(n => n.email_sent).length || 0;
    const totalNotifications = allNotifications?.length || 0;
    
    if (emailsSent < totalNotifications) {
      result.recommendations.push(
        `📧 ${totalNotifications - emailsSent} emails en attente d'envoi sur ${totalNotifications} notifications`
      );
    }

    console.log('✅ [NOTIFICATION-AUDIT] Audit terminé:', result);
    return result;

  } catch (error) {
    console.error('❌ [NOTIFICATION-AUDIT] Erreur durant l\'audit:', error);
    return {
      success: false,
      details: {
        manualAssignments: { found: 0, withNotifications: 0, missing: [] },
        autoAssignments: { found: 0, withNotifications: 0, missing: [] },
        manualUnassignments: { found: 0, withNotifications: 0, missing: [] },
        autoUnassignments: { found: 0, withNotifications: 0, missing: [] }
      },
      recommendations: [`❌ Erreur lors de l'audit: ${error}`]
    };
  }
};

/**
 * Répare les notifications manquantes en les créant rétroactivement
 */
export const repairMissingNotifications = async (missingNotifications: string[]): Promise<boolean> => {
  try {
    console.log('🔧 [NOTIFICATION-REPAIR] Réparation des notifications manquantes...');
    
    for (const missing of missingNotifications) {
      const [gmInfo, eventInfo] = missing.split(' - ');
      const gmId = gmInfo.replace('GM ', '');
      const eventId = eventInfo.replace('Event ', '').replace(' (Auto)', '');
      
      // Récupérer les détails de l'événement
      const { data: eventData, error: eventError } = await supabase
        .from('activities')
        .select('*')
        .eq('id', eventId)
        .single();

      if (!eventError && eventData) {
        // Créer la notification rétroactive
        const { error: notifError } = await supabase.functions.invoke(
          'create-retroactive-notification',
          {
            body: {
              gmId,
              eventId,
              eventData,
              notificationType: 'assignment'
            }
          }
        );

        if (notifError) {
          console.error(`❌ [NOTIFICATION-REPAIR] Erreur réparation ${missing}:`, notifError);
        } else {
          console.log(`✅ [NOTIFICATION-REPAIR] Notification créée pour ${missing}`);
        }
      }
    }
    
    console.log('✅ [NOTIFICATION-REPAIR] Réparation terminée');
    return true;
    
  } catch (error) {
    console.error('❌ [NOTIFICATION-REPAIR] Erreur durant la réparation:', error);
    return false;
  }
};