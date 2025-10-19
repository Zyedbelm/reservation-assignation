
import { supabase } from '@/integrations/supabase/client';

export interface NotificationData {
  gmEmail: string;
  gmName: string;
  changeType: 'assignment' | 'cancelled' | 'modified' | 'unassigned';
  eventData: any;
  updatedEventData?: any;
  changes?: string[];
}

export const sendNotification = async (data: NotificationData) => {
  try {
    console.log(`📧 Sending ${data.changeType} notification to GM: ${data.gmEmail}`);
    
    let functionName = '';
    let body = {};

    switch (data.changeType) {
      case 'assignment':
        functionName = 'send-assignment-notification';
        body = {
          gmEmail: data.gmEmail,
          gmName: data.gmName,
          eventTitle: data.eventData.title || 'Événement',
          eventDate: data.eventData.date,
          eventTime: data.eventData.start_time ? `${data.eventData.start_time} - ${data.eventData.end_time}` : '',
          eventDescription: data.eventData.description || '',
          assignmentType: 'new'
        };
        break;
      
      case 'unassigned':
        functionName = 'send-assignment-notification';
        body = {
          gmEmail: data.gmEmail,
          gmName: data.gmName,
          eventTitle: data.eventData.title || 'Événement',
          eventDate: data.eventData.date,
          eventTime: data.eventData.start_time ? `${data.eventData.start_time} - ${data.eventData.end_time}` : '',
          eventDescription: data.eventData.description || data.eventData.reason || 'Désassignation automatique',
          assignmentType: 'unassigned'
        };
        break;
      
      case 'cancelled':
      case 'modified':
        functionName = 'send-event-change-notification';
        body = {
          gmEmail: data.gmEmail,
          gmName: data.gmName,
          changeType: data.changeType,
          originalEvent: data.eventData,
          updatedEvent: data.updatedEventData,
          changes: data.changes || []
        };
        break;
      
      default:
        throw new Error(`Type de notification non supporté: ${data.changeType}`);
    }

    const { data: result, error } = await supabase.functions.invoke(functionName, { body });

    if (error) {
      console.error(`❌ Error sending ${data.changeType} notification:`, error);
      return { success: false, error };
    }

    console.log(`✅ ${data.changeType} notification sent successfully:`, result);
    return { success: true, data: result };

  } catch (error) {
    console.error(`💥 Error in sendNotification for ${data.changeType}:`, error);
    return { success: false, error };
  }
};

export const sendNotificationWithHistory = async (
  gmId: string,
  gmEmail: string,
  gmName: string,
  notificationType: 'assignment' | 'modified' | 'cancelled' | 'unassigned',
  title: string,
  message: string,
  eventData: any,
  eventId?: string,
  updatedEventData?: any,
  changes?: string[]
) => {
  try {
    console.log(`📧📝 Sending notification with history: ${notificationType} to GM: ${gmId}`);
    
    // 1. Créer l'enregistrement de notification
    const { data: notificationResult, error: notificationError } = await supabase.functions.invoke(
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

    if (notificationError) {
      console.error('❌ Error creating notification record:', notificationError);
    }

    // 2. Envoyer l'email
    const emailData: NotificationData = {
      gmEmail,
      gmName,
      changeType: notificationType as 'assignment' | 'cancelled' | 'modified' | 'unassigned',
      eventData,
      updatedEventData,
      changes
    };

    const emailResult = await sendNotification(emailData);

    // 3. Mettre à jour le statut d'envoi si notification créée avec succès
    if (notificationResult?.notification?.id && emailResult.success) {
      await supabase.rpc('update_notification_email_status', {
        notification_id_param: notificationResult.notification.id
      });
      
      console.log('✅ Email status updated in notification record');
    }

    return { 
      success: emailResult.success, 
      notificationId: notificationResult?.notification?.id,
      error: emailResult.error 
    };

  } catch (error) {
    console.error('💥 Error in sendNotificationWithHistory:', error);
    return { success: false, error };
  }
};

export const getEventChanges = (existingEvent: any, newEventData: any): string[] => {
  const changes: string[] = [];
  
  if (existingEvent.title !== newEventData.title) {
    changes.push(`Titre modifié : "${existingEvent.title}" → "${newEventData.title}"`);
  }
  
  if (existingEvent.description !== newEventData.description) {
    changes.push(`Description mise à jour`);
  }
  
  if (existingEvent.date !== newEventData.date) {
    const oldDate = new Date(existingEvent.date).toLocaleDateString('fr-FR');
    const newDate = new Date(newEventData.date).toLocaleDateString('fr-FR');
    changes.push(`Date modifiée : ${oldDate} → ${newDate}`);
  }
  
  if (existingEvent.start_time !== newEventData.start_time || existingEvent.end_time !== newEventData.end_time) {
    const oldTime = `${existingEvent.start_time.substring(0, 5)} - ${existingEvent.end_time.substring(0, 5)}`;
    const newTime = `${newEventData.start_time.substring(0, 5)} - ${newEventData.end_time.substring(0, 5)}`;
    changes.push(`Horaire modifié : ${oldTime} → ${newTime}`);
  }
  
  if (existingEvent.duration !== newEventData.duration) {
    changes.push(`Durée modifiée : ${existingEvent.duration} min → ${newEventData.duration} min`);
  }
  
  return changes;
};
