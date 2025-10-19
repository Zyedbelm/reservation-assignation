
import { supabase } from '@/integrations/supabase/client';

export interface NotificationData {
  gmId: string;
  gmEmail?: string;
  gmName?: string;
  notificationType: 'assignment' | 'modified' | 'cancelled' | 'unassigned';
  eventId?: string;
  title: string;
  message: string;
  eventData: any;
  updatedEventData?: any;
  changes?: string[];
}

/**
 * Service unifié pour l'envoi de notifications avec historique et emails
 * Remplace sendNotificationWithHistory pour éviter les dépendances circulaires
 */
export const sendNotificationWithHistory = async (data: NotificationData) => {
  try {
    console.log(`📧 [ENHANCED-NOTIFICATION] Envoi notification: ${data.notificationType} au GM: ${data.gmId}`);
    
    // 1. Enregistrer la notification dans l'historique
    const { data: notificationResult, error: notificationError } = await supabase.functions.invoke(
      'create-gm-notification',
      {
        body: {
          gmId: data.gmId,
          notificationType: data.notificationType,
          eventId: data.eventId,
          title: data.title,
          message: data.message,
          eventData: data.eventData
        }
      }
    );

    if (notificationError) {
      console.error('❌ [ENHANCED-NOTIFICATION] Erreur création notification:', notificationError);
    } else {
      console.log('✅ [ENHANCED-NOTIFICATION] Notification sauvée:', notificationResult?.notification?.id);
    }

    // 2. Envoyer l'email directement via la fonction Supabase appropriée
    let emailResult = { success: false, error: null };
    
    if (data.gmEmail && data.gmName) {
      try {
        console.log(`📧 [ENHANCED-NOTIFICATION] Envoi email à ${data.gmEmail}`);
        
        // Préparer les données pour l'email selon le type de notification
        const emailData = {
          gmEmail: data.gmEmail,
          gmName: data.gmName,
          eventTitle: data.eventData?.title || 'Événement',
          eventDate: data.eventData?.date || new Date().toISOString().split('T')[0],
          eventTime: data.eventData?.start_time ? `${data.eventData.start_time} - ${data.eventData.end_time || ''}` : '00:00',
          eventDescription: data.eventData?.description || data.message || '',
          assignmentType: data.notificationType === 'assignment' ? 'new' : 
                          data.notificationType === 'modified' ? 'modified' : 
                          data.notificationType === 'cancelled' ? 'cancelled' : 'unassigned'
        };

        const { data: emailResponse, error: emailError } = await supabase.functions.invoke(
          'send-assignment-notification',
          { body: emailData }
        );

        if (emailError) {
          console.error('❌ [ENHANCED-NOTIFICATION] Erreur envoi email:', emailError);
          emailResult = { success: false, error: emailError };
        } else {
          console.log('✅ [ENHANCED-NOTIFICATION] Email envoyé avec succès');
          emailResult = { success: true, error: null };
        }
      } catch (emailException) {
        console.error('❌ [ENHANCED-NOTIFICATION] Exception envoi email:', emailException);
        emailResult = { success: false, error: emailException };
      }
    } else {
      console.warn('⚠️ [ENHANCED-NOTIFICATION] Email ou nom GM manquant, skip email');
    }

    // 3. Mettre à jour le statut d'envoi d'email si succès
    if (notificationResult?.notification?.id && emailResult.success) {
      await supabase.rpc('update_notification_email_status', {
        notification_id_param: notificationResult.notification.id
      });
      console.log('✅ [ENHANCED-NOTIFICATION] Statut email mis à jour');
    }

    return { 
      success: notificationResult?.notification?.id ? true : false,
      notificationId: notificationResult?.notification?.id,
      emailSent: emailResult.success,
      error: notificationError || emailResult.error 
    };

  } catch (error) {
    console.error('💥 [ENHANCED-NOTIFICATION] Erreur dans sendNotificationWithHistory:', error);
    return { success: false, error };
  }
};

export const createGMNotification = async (
  gmId: string,
  notificationType: 'assignment' | 'modified' | 'cancelled' | 'unassigned',
  title: string,
  message: string,
  eventData: any,
  eventId?: string
) => {
  try {
    const { data, error } = await supabase.functions.invoke(
      'create-gm-notification',
      {
        body: {
          gmId,
          notificationType,
          eventId,
          title,
          message,
          eventData
        }
      }
    );

    if (error) throw error;
    
    console.log(`✅ Notification created: ${notificationType} for GM ${gmId}`);
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Error creating GM notification:', error);
    return { success: false, error };
  }
};
