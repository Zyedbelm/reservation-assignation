
import { supabase } from '@/integrations/supabase/client';

export interface GMNotificationData {
  gmId: string;
  gmEmail?: string;
  gmName?: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventDescription?: string;
}

export const sendGMAssignmentNotification = async (data: GMNotificationData) => {
  try {
    console.log('📧 Sending GM assignment notification to:', data.gmEmail);
    
    // Récupérer les infos du GM si pas fournies
    let gmEmail = data.gmEmail;
    let gmName = data.gmName;
    
    if (!gmEmail || !gmName) {
      const { data: gmData, error: gmError } = await supabase
        .from('game_masters')
        .select('name, email')
        .eq('id', data.gmId)
        .single();
      
      if (gmError || !gmData) {
        console.error('❌ Error fetching GM data:', gmError);
        return { success: false, error: gmError };
      }
      
      gmEmail = gmData.email;
      gmName = gmData.name;
    }

    const { data: result, error } = await supabase.functions.invoke(
      'send-assignment-notification',
      {
        body: {
          gmEmail,
          gmName,
          eventTitle: data.eventTitle,
          eventDate: data.eventDate,
          eventTime: data.eventTime,
          eventDescription: data.eventDescription,
          assignmentType: 'new'
        }
      }
    );

    if (error) {
      console.error('❌ Error sending assignment notification:', error);
      return { success: false, error };
    }

    console.log('✅ Assignment notification sent successfully');
    return { success: true, data: result };

  } catch (error) {
    console.error('💥 Error in sendGMAssignmentNotification:', error);
    return { success: false, error };
  }
};

export const sendEventChangeNotification = async (
  gmId: string,
  changeType: 'modified' | 'cancelled',
  originalEvent: any,
  updatedEvent?: any
) => {
  try {
    console.log(`📧 Sending ${changeType} notification to GM:`, gmId);
    
    // Récupérer les infos du GM
    const { data: gmData, error: gmError } = await supabase
      .from('game_masters')
      .select('name, email')
      .eq('id', gmId)
      .single();

    if (gmError || !gmData) {
      console.error('❌ Error fetching GM data:', gmError);
      return { success: false, error: gmError };
    }

    const { data: result, error } = await supabase.functions.invoke(
      'send-event-change-notification',
      {
        body: {
          gmEmail: gmData.email,
          gmName: gmData.name,
          changeType,
          originalEvent,
          updatedEvent
        }
      }
    );

    if (error) {
      console.error('❌ Error sending change notification:', error);
      return { success: false, error };
    }

    console.log('✅ Change notification sent successfully');
    return { success: true, data: result };

  } catch (error) {
    console.error('💥 Error in sendEventChangeNotification:', error);
    return { success: false, error };
  }
};

export const sendAdminUnassignedAlert = async (unassignedEvents: any[]) => {
  try {
    console.log('📧 Sending admin unassigned alert for', unassignedEvents.length, 'events');
    
    const { data: result, error } = await supabase.functions.invoke(
      'send-admin-unassigned-notification',
      {
        body: {
          adminEmail: 'info@genieculturel.ch',
          unassignedEvents
        }
      }
    );

    if (error) {
      console.error('❌ Error sending admin alert:', error);
      return { success: false, error };
    }

    console.log('✅ Admin alert sent successfully');
    return { success: true, data: result };

  } catch (error) {
    console.error('💥 Error in sendAdminUnassignedAlert:', error);
    return { success: false, error };
  }
};
