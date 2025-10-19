
import { supabase } from '@/integrations/supabase/client';

export const triggerAutoAssignmentWithNotifications = async () => {
  try {
    console.log('🤖 Triggering auto-assignment with notifications...');
    
    const { data, error } = await supabase.functions.invoke('auto-assign-gms', {
      body: { 
        trigger: 'manual-with-notifications',
        includeNotifications: true
      }
    });

    if (error) {
      console.error('❌ Error triggering auto-assignment with notifications:', error);
      return { success: false, error };
    }

    console.log('✅ Auto-assignment with notifications completed:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('💥 Error in triggerAutoAssignmentWithNotifications:', error);
    return { success: false, error };
  }
};

export const createRetroactiveNotification = async () => {
  try {
    console.log('🕰️ Creating retroactive notification...');
    
    const { data, error } = await supabase.functions.invoke('create-retroactive-notification');

    if (error) {
      console.error('❌ Error creating retroactive notification:', error);
      return { success: false, error };
    }

    console.log('✅ Retroactive notification created:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('💥 Error in createRetroactiveNotification:', error);
    return { success: false, error };
  }
};
