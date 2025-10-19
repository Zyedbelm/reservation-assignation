
import { supabase } from '@/integrations/supabase/client';

export interface UnifiedNotificationService {
  createNotification: (data: NotificationData) => Promise<NotificationResult>;
  sendEmail: (data: EmailData) => Promise<EmailResult>;
  createNotificationWithEmail: (data: NotificationWithEmailData) => Promise<UnifiedResult>;
}

export interface NotificationData {
  gmId: string;
  notificationType: 'assignment' | 'modified' | 'cancelled' | 'unassigned';
  eventId?: string;
  title: string;
  message: string;
  eventData: any;
}

export interface EmailData {
  gmEmail: string;
  gmName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventDescription?: string;
  assignmentType: 'new' | 'modified' | 'cancelled' | 'unassigned';
}

export interface NotificationWithEmailData extends NotificationData {
  gmEmail?: string;
  gmName?: string;
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  error?: any;
}

export interface EmailResult {
  success: boolean;
  error?: any;
}

export interface UnifiedResult {
  success: boolean;
  notificationId?: string;
  emailSent: boolean;
  errors: any[];
}

/**
 * Service unifié V2 pour les notifications avec diagnostic intégré
 */
export const createGMNotificationWithEmail = async (data: NotificationWithEmailData): Promise<UnifiedResult> => {
  console.log(`📧 [UNIFIED-V2] Création notification + email pour GM ${data.gmId}`, data.notificationType);
  
  const result: UnifiedResult = {
    success: false,
    emailSent: false,
    errors: []
  };

  try {
    // 1. Créer la notification via edge function avec fallback
    console.log(`📝 [UNIFIED-V2] Création notification...`);
    
    let notificationCreated = false;
    let notificationId: string | undefined;

    // Tentative avec edge function
    try {
      const { data: edgeResult, error: edgeError } = await supabase.functions.invoke('create-gm-notification', {
        body: {
          gmId: data.gmId,
          notificationType: data.notificationType,
          eventId: data.eventId,
          title: data.title,
          message: data.message,
          eventData: data.eventData
        }
      });

      if (edgeError) {
        console.warn(`⚠️ [UNIFIED-V2] Edge function échouée:`, edgeError);
        result.errors.push({ type: 'edge_function', error: edgeError });
      } else {
        notificationCreated = true;
        notificationId = edgeResult?.notification?.id;
        console.log(`✅ [UNIFIED-V2] Notification créée via edge function: ${notificationId}`);
      }
    } catch (edgeException) {
      console.warn(`⚠️ [UNIFIED-V2] Exception edge function:`, edgeException);
      result.errors.push({ type: 'edge_exception', error: edgeException });
    }

    // Fallback: insertion directe si edge function échoue
    if (!notificationCreated) {
      console.log(`🔄 [UNIFIED-V2] Fallback - insertion directe...`);
      
      try {
        const { data: insertResult, error: insertError } = await supabase
          .from('gm_notifications')
          .insert({
            gm_id: data.gmId,
            event_id: data.eventId,
            notification_type: data.notificationType,
            title: data.title,
            message: data.message,
            event_data: data.eventData,
            is_read: false,
            email_sent: false
          })
          .select()
          .single();

        if (insertError) {
          console.error(`❌ [UNIFIED-V2] Erreur insertion directe:`, insertError);
          result.errors.push({ type: 'direct_insert', error: insertError });
        } else {
          notificationCreated = true;
          notificationId = insertResult.id;
          console.log(`✅ [UNIFIED-V2] Notification créée via insertion directe: ${notificationId}`);
        }
      } catch (insertException) {
        console.error(`❌ [UNIFIED-V2] Exception insertion directe:`, insertException);
        result.errors.push({ type: 'insert_exception', error: insertException });
      }
    }

    // 2. Envoyer l'email si les données sont disponibles
    if (data.gmEmail && data.gmName && notificationCreated) {
      console.log(`📤 [UNIFIED-V2] Envoi email à ${data.gmEmail}...`);
      
      try {
        const emailData: EmailData = {
          gmEmail: data.gmEmail,
          gmName: data.gmName,
          eventTitle: data.eventData?.title || 'Événement',
          eventDate: data.eventData?.date || new Date().toISOString().split('T')[0],
          eventTime: data.eventData?.start_time ? `${data.eventData.start_time} - ${data.eventData.end_time || ''}` : '00:00',
          eventDescription: data.eventData?.description || data.message,
          assignmentType: data.notificationType === 'assignment' ? 'new' : 
                          data.notificationType === 'modified' ? 'modified' : 
                          data.notificationType === 'cancelled' ? 'cancelled' : 'unassigned'
        };

        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-assignment-notification', {
          body: emailData
        });

        if (emailError) {
          console.error(`❌ [UNIFIED-V2] Erreur envoi email:`, emailError);
          result.errors.push({ type: 'email_send', error: emailError });
        } else {
          result.emailSent = true;
          console.log(`✅ [UNIFIED-V2] Email envoyé avec succès`);
          
          // Mettre à jour le statut email de la notification
          if (notificationId) {
            await supabase.rpc('update_notification_email_status', {
              notification_id_param: notificationId
            });
          }
        }
      } catch (emailException) {
        console.error(`❌ [UNIFIED-V2] Exception envoi email:`, emailException);
        result.errors.push({ type: 'email_exception', error: emailException });
      }
    } else if (!data.gmEmail || !data.gmName) {
      console.warn(`⚠️ [UNIFIED-V2] Données email manquantes - skip envoi`);
    }

    // 3. Déterminer le succès global
    result.success = notificationCreated;
    result.notificationId = notificationId;

    console.log(`🎯 [UNIFIED-V2] Résultat final:`, {
      success: result.success,
      notificationId: result.notificationId,
      emailSent: result.emailSent,
      errorsCount: result.errors.length
    });

    return result;

  } catch (error) {
    console.error('💥 [UNIFIED-V2] Erreur inattendue:', error);
    result.errors.push({ type: 'unexpected', error });
    return result;
  }
};

/**
 * Fonction de création de contenu de notification standardisée
 */
export const createNotificationContent = (type: string, eventData: any) => {
  const eventTitle = eventData?.title || 'Événement';
  const eventDate = eventData?.date || new Date().toISOString().split('T')[0];
  const eventTime = eventData?.start_time || '00:00';

  switch (type) {
    case 'assignment':
      return {
        title: `Nouvel événement assigné : ${eventTitle}`,
        message: `Vous avez été assigné(e) à l'événement "${eventTitle}" le ${eventDate} à ${eventTime}.${eventData?.autoAssigned ? ' Cette assignation a été effectuée automatiquement par le système.' : ''}`
      };
    
    case 'unassigned':
      return {
        title: `Désassignation ${eventData?.autoFixed ? 'automatique' : ''} : ${eventTitle}`,
        message: `Vous avez été désassigné(e) de l'événement "${eventTitle}" le ${eventDate} à ${eventTime}.${eventData?.reason ? ` Raison: ${eventData.reason}` : ''}${eventData?.autoFixed ? ' Cette désassignation a été effectuée automatiquement par le système d\'audit.' : ''}`
      };
    
    default:
      return {
        title: `Notification : ${eventTitle}`,
        message: `Mise à jour concernant l'événement "${eventTitle}" le ${eventDate} à ${eventTime}.`
      };
  }
};
