
import { supabase } from '@/integrations/supabase/client';
import { sendNotificationWithHistory } from './enhancedNotificationService';

export interface UnifiedNotificationData {
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

export const createGMNotificationWithEmail = async (data: UnifiedNotificationData) => {
  try {
    console.log(`📧📝 Creating unified notification: ${data.notificationType} for GM: ${data.gmId}`);
    
    // Si on n'a pas les infos du GM, les récupérer
    let gmEmail = data.gmEmail;
    let gmName = data.gmName;
    
    if (!gmEmail || !gmName) {
      const { data: gmData, error: gmError } = await supabase
        .from('game_masters')
        .select('name, email')
        .eq('id', data.gmId)
        .single();
        
      if (gmError) {
        console.error('❌ Error fetching GM data:', gmError);
        throw gmError;
      }
      
      gmEmail = gmData.email || '';
      gmName = gmData.name || '';
    }

    // Utiliser le service existant qui gère à la fois l'historique et l'email
    const result = await sendNotificationWithHistory({
      gmId: data.gmId,
      gmEmail,
      gmName,
      notificationType: data.notificationType,
      eventId: data.eventId,
      title: data.title,
      message: data.message,
      eventData: data.eventData,
      updatedEventData: data.updatedEventData,
      changes: data.changes
    });

    console.log(`✅ Unified notification created successfully:`, result);
    return result;

  } catch (error) {
    console.error('💥 Error in createGMNotificationWithEmail:', error);
    return { success: false, error };
  }
};

// Fonction utilitaire pour créer le titre et message selon le type
export const createNotificationContent = (
  type: 'assignment' | 'modified' | 'cancelled' | 'unassigned',
  eventData: any
) => {
  const eventTitle = eventData.title || 'Événement';
  const eventDate = new Date(eventData.date).toLocaleDateString('fr-FR');
  const eventTime = eventData.start_time ? eventData.start_time.substring(0, 5) : '';

  switch (type) {
    case 'assignment':
      return {
        title: `Nouvel événement assigné : ${eventTitle}`,
        message: `Vous avez été assigné(e) à l'événement "${eventTitle}" le ${eventDate} à ${eventTime}.`
      };
    
    case 'modified':
      return {
        title: `Événement modifié : ${eventTitle}`,
        message: `L'événement "${eventTitle}" auquel vous êtes assigné(e) a été modifié. Date: ${eventDate} à ${eventTime}.`
      };
    
    case 'cancelled':
      return {
        title: `Événement annulé : ${eventTitle}`,
        message: `L'événement "${eventTitle}" prévu le ${eventDate} à ${eventTime} a été annulé.`
      };
    
    case 'unassigned':
      return {
        title: `Désassignation : ${eventTitle}`,
        message: `Vous avez été désassigné(e) de l'événement "${eventTitle}" prévu le ${eventDate} à ${eventTime}.`
      };
    
    default:
      return {
        title: `Notification : ${eventTitle}`,
        message: `Mise à jour concernant l'événement "${eventTitle}".`
      };
  }
};
