
import { supabase } from '@/integrations/supabase/client';

export interface NotificationDiagnosticResult {
  success: boolean;
  issues: string[];
  recommendations: string[];
  details: {
    profilesCount: number;
    gameMastersCount: number;
    notificationsCount: number;
    gmIdMappingIssues: string[];
    recentNotifications: any[];
  };
}

/**
 * Diagnostic complet du système de notifications
 */
export const runNotificationDiagnostic = async (): Promise<NotificationDiagnosticResult> => {
  console.log('🔍 [NOTIFICATION-DIAGNOSTIC] Démarrage du diagnostic...');
  
  const result: NotificationDiagnosticResult = {
    success: true,
    issues: [],
    recommendations: [],
    details: {
      profilesCount: 0,
      gameMastersCount: 0,
      notificationsCount: 0,
      gmIdMappingIssues: [],
      recentNotifications: []
    }
  };

  try {
    // 1. Vérifier les profils
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError) {
      result.issues.push(`Erreur récupération profiles: ${profilesError.message}`);
    } else {
      result.details.profilesCount = profiles?.length || 0;
      console.log(`📊 [DIAGNOSTIC] ${result.details.profilesCount} profils trouvés`);
    }

    // 2. Vérifier les game masters
    const { data: gameMasters, error: gmError } = await supabase
      .from('game_masters')
      .select('*');

    if (gmError) {
      result.issues.push(`Erreur récupération game_masters: ${gmError.message}`);
    } else {
      result.details.gameMastersCount = gameMasters?.length || 0;
      console.log(`📊 [DIAGNOSTIC] ${result.details.gameMastersCount} game masters trouvés`);
    }

    // 3. Vérifier les notifications récentes
    const { data: notifications, error: notifError } = await supabase
      .from('gm_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (notifError) {
      result.issues.push(`Erreur récupération notifications: ${notifError.message}`);
    } else {
      result.details.notificationsCount = notifications?.length || 0;
      result.details.recentNotifications = notifications || [];
      console.log(`📊 [DIAGNOSTIC] ${result.details.notificationsCount} notifications récentes trouvées`);
      
      // Analyser les types de notifications
      const autoNotifications = notifications?.filter(n => {
        const eventData = n.event_data as Record<string, any>;
        return (
          (eventData && typeof eventData === 'object' && eventData.autoAssigned) ||
          (eventData && typeof eventData === 'object' && eventData.reason === 'auto_assignment') ||
          n.title?.includes('automatiquement')
        );
      }) || [];
      
      console.log(`🤖 [DIAGNOSTIC] ${autoNotifications.length} notifications automatiques trouvées`);
      
      if (autoNotifications.length === 0) {
        result.issues.push('Aucune notification automatique trouvée dans les 20 dernières');
      }
    }

    // 4. Vérifier la cohérence des gm_id
    if (profiles && gameMasters) {
      for (const profile of profiles) {
        if (profile.gm_id) {
          const gmExists = gameMasters.find(gm => gm.id === profile.gm_id);
          if (!gmExists) {
            result.details.gmIdMappingIssues.push(
              `Profile ${profile.email} référence gm_id ${profile.gm_id} inexistant`
            );
          }
        }
      }
      
      if (result.details.gmIdMappingIssues.length > 0) {
        result.issues.push(`${result.details.gmIdMappingIssues.length} problèmes de mapping gm_id détectés`);
      }
    }

    // 5. Test de la fonction get_gm_notifications
    if (profiles && profiles.length > 0) {
      const testProfile = profiles.find(p => p.gm_id);
      if (testProfile) {
        console.log(`🧪 [DIAGNOSTIC] Test de get_gm_notifications pour GM ${testProfile.gm_id}`);
        
        const { data: testNotifications, error: testError } = await supabase
          .rpc('get_gm_notifications', { gm_id_param: testProfile.gm_id });

        if (testError) {
          result.issues.push(`Erreur fonction get_gm_notifications: ${testError.message}`);
        } else {
          console.log(`✅ [DIAGNOSTIC] Fonction get_gm_notifications OK - ${testNotifications?.length || 0} notifications pour GM ${testProfile.gm_id}`);
        }
      }
    }

    // Générer des recommandations
    if (result.issues.length === 0) {
      result.recommendations.push('✅ Système de notifications semble fonctionnel');
    } else {
      result.recommendations.push('🔧 Corrections nécessaires détectées');
      
      if (result.details.gmIdMappingIssues.length > 0) {
        result.recommendations.push('Corriger les problèmes de mapping gm_id');
      }
      
      if (result.details.recentNotifications.length === 0) {
        result.recommendations.push('Tester la création de notifications');
      }
    }

    console.log('✅ [NOTIFICATION-DIAGNOSTIC] Diagnostic terminé:', result);
    return result;

  } catch (error) {
    console.error('❌ [NOTIFICATION-DIAGNOSTIC] Erreur:', error);
    result.success = false;
    result.issues.push(`Erreur inattendue: ${error}`);
    return result;
  }
};

/**
 * Test spécifique pour les notifications automatiques
 */
export const testAutomaticNotificationCreation = async (gmId: string): Promise<boolean> => {
  try {
    console.log(`🧪 [TEST-AUTO-NOTIF] Test création notification pour GM ${gmId}`);
    
    const testEventData = {
      id: crypto.randomUUID(),
      title: 'TEST - Notification Automatique',
      date: new Date().toISOString().split('T')[0],
      start_time: '14:00',
      end_time: '16:00',
      reason: 'test_auto_assignment',
      autoAssigned: true
    };

    // Test avec l'edge function
    const { data: edgeResult, error: edgeError } = await supabase.functions.invoke('create-gm-notification', {
      body: {
        gmId,
        notificationType: 'assignment',
        title: `🤖 TEST - ${testEventData.title}`,
        message: 'Test de création automatique de notification',
        eventData: testEventData,
        eventId: testEventData.id
      }
    });

    if (edgeError) {
      console.error(`❌ [TEST-AUTO-NOTIF] Erreur edge function:`, edgeError);
      
      // Fallback test direct
      const { error: directError } = await supabase
        .from('gm_notifications')
        .insert({
          gm_id: gmId,
          event_id: testEventData.id,
          notification_type: 'assignment',
          title: `🤖 TEST DIRECT - ${testEventData.title}`,
          message: 'Test de création directe de notification',
          event_data: testEventData,
          is_read: false,
          email_sent: false
        });

      if (directError) {
        console.error(`❌ [TEST-AUTO-NOTIF] Erreur insertion directe:`, directError);
        return false;
      } else {
        console.log(`✅ [TEST-AUTO-NOTIF] Notification créée via insertion directe`);
        return true;
      }
    } else {
      console.log(`✅ [TEST-AUTO-NOTIF] Notification créée via edge function`);
      return true;
    }

  } catch (error) {
    console.error('❌ [TEST-AUTO-NOTIF] Exception:', error);
    return false;
  }
};
