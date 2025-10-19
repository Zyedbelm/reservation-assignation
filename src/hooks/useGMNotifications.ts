
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GMNotification {
  id: string;
  gm_id: string;
  notification_type: 'assignment' | 'modified' | 'cancelled' | 'unassigned';
  event_id?: string;
  title: string;
  message: string;
  event_data?: any;
  is_read: boolean;
  email_sent: boolean;
  email_sent_at?: string;
  created_at: string;
  updated_at: string;
}

export const useGMNotifications = (gmId?: string) => {
  return useQuery({
    queryKey: ['gm-notifications', gmId],
    queryFn: async () => {
      if (!gmId) return [];
      
      const { data, error } = await supabase
        .rpc('get_gm_notifications', { gm_id_param: gmId });
      
      if (error) {
        console.error('Error fetching GM notifications:', error);
        return [];
      }
      
      return (data || []) as GMNotification[];
    },
    enabled: !!gmId
  });
};

export const useGMUnreadNotifications = (gmId?: string) => {
  return useQuery({
    queryKey: ['gm-notifications-unread', gmId],
    queryFn: async () => {
      if (!gmId) return [];
      
      const { data, error } = await supabase
        .rpc('get_gm_unread_notifications', { gm_id_param: gmId });
      
      if (error) {
        console.error('Error fetching unread GM notifications:', error);
        return [];
      }
      
      return (data || []) as GMNotification[];
    },
    enabled: !!gmId,
    refetchInterval: 30000 // Refresh every 30 seconds
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase
        .rpc('mark_notification_as_read', { notification_id_param: notificationId });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gm-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['gm-notifications-unread'] });
    }
  });
};

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (gmId: string) => {
      const { data, error } = await supabase
        .rpc('mark_all_notifications_as_read', { gm_id_param: gmId });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gm-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['gm-notifications-unread'] });
    }
  });
};
